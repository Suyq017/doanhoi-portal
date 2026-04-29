# MÔ TẢ TỔNG QUAN DATABASE - HỆ THỐNG ĐOÀN HỘI PORTAL

**Phiên bản:** 1.0  
**Ngày cập nhật:** 21/12/2025  
**Hệ thống:** Đoàn Hội Portal - HCMUT

---

## 1. GIỚI THIỆU HỆ THỐNG

### 1.1. Mục đích
Hệ thống Đoàn Hội Portal là nền tảng quản lý toàn diện cho các hoạt động của Đoàn Thanh niên và Hội Sinh viên tại Đại học Bách Khoa TP.HCM, bao gồm:
- **Quản lý sinh viên và cán bộ**: Thông tin cá nhân, phân loại, và liên kết với các đơn vị học thuật
- **Quản lý tổ chức**: Cấu trúc tổ chức đa cấp, thành viên, vai trò
- **Công tác xã hội (CTXH)**: Theo dõi hoạt động, đăng ký tham gia, chấm điểm
- **Biểu mẫu điện tử**: Tạo template động, nộp đơn, sinh văn bản tự động
- **Thanh toán**: Quản lý chiến dịch thu phí, giao dịch thanh toán trực tuyến
- **Phân quyền**: Hệ thống vai trò-quyền linh hoạt theo ngữ cảnh (system-wide/organization-scoped)
- **Chatbot RAG**: Hỗ trợ truy vấn thông tin hoạt động CTXH bằng AI

### 1.2. Công nghệ Database
- **RDBMS:** PostgreSQL 14+
- **Extensions:**
  - pgVector: Vector search cho RAG chatbot
  - UUID-OSSP: Generate unique IDs
- **Chuẩn hóa:** 3NF (Third Normal Form)
- **Indexing:** 20+ indexes cho các truy vấn thường xuyên
- **Triggers:** Tự động cập nhật CTXH days, payment status

---

## 2. KIẾN TRÚC DATABASE

### 2.1. Cấu trúc Module

```
┌─────────────────────────────────────────────────────────────┐
│                    ĐOÀN HỘI PORTAL DATABASE                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐         ┌────▼────┐        ┌────▼────┐
    │Academic│         │   Org   │        │  Auth   │
    │Structure│        │Structure│        │ System  │
    └───┬────┘         └────┬────┘        └────┬────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐         ┌────▼────┐        ┌────▼────┐
    │  CTXH  │         │Template │        │ Payment │
    │ System │         │ System  │        │ System  │
    └────────┘         └─────────┘        └─────────┘
```

### 2.2. Thống kê Database

| Thành phần | Số lượng | Ghi chú |
|-----------|----------|---------|
| **Entities** | 20 | Bao gồm 1 weak entity (PARTICIPATION) |
| **Tables** | 20 | Single Table Inheritance cho PERSON |
| **Relationships** | 25 | 1:N, N:N, Ternary, Recursive |
| **Junction Tables** | 6 | Xử lý N:N relationships |
| **Indexes** | 20+ | FK, search, composite indexes |
| **Triggers** | 2+ | Business logic automation |
| **Constraints** | 30+ | CHECK, UNIQUE, FK rules |

---

## 3. CÁC MODULE CHÍNH

### 3.1. **ACADEMIC STRUCTURE** (Cấu trúc học thuật)

**Mục đích:** Quản lý thông tin học thuật của sinh viên và cán bộ

**Entities:**
- **PERSON** (supertype): Thông tin chung (họ tên, email, số điện thoại, CCCD)
  - **STUDENT** (subtype): Năm nhập học, năm học, khoa, hệ đào tạo, tổng số ngày CTXH
  - **STAFF** (subtype): Cán bộ Đoàn/Hội
- **DEPARTMENT**: Khoa/bộ môn (mã khoa, tên, mô tả)
- **CLASS**: Lớp học (tên lớp, năm học)

**Relationships:**
- DEPARTMENT 1–N CLASS
- STUDENT N–1 CLASS (mỗi sinh viên thuộc 1 lớp)
- PERSON N–N DEPARTMENT (affiliation: Training/Management)

**Thiết kế đặc biệt:**
- **ISA Hierarchy:** Single Table Inheritance với `person_type` ENUM('STUDENT', 'STAFF')
- **Lý do:** Disjoint, total specialization; tránh JOIN phức tạp; dễ query thông tin chung

**Use cases:**
- Import danh sách sinh viên từ Excel
- Tìm kiếm sinh viên theo khoa, lớp, năm học
- Xem thông tin chi tiết cán bộ Đoàn

---

### 3.2. **ORGANIZATION STRUCTURE** (Cấu trúc tổ chức)

**Mục đích:** Quản lý cấu trúc tổ chức đa cấp của Đoàn/Hội

**Entities:**
- **ORGANIZATION**: Đơn vị tổ chức (mã, tên, loại, mô tả)

**Relationships:**
- ORGANIZATION 1–N ORGANIZATION (recursive `parent_org_id`)
- PERSON N–N ORGANIZATION (Membership với vai trò: Member/Admin/SuperAdmin)

**Thiết kế đặc biệt:**
- **Recursive relationship:** Hỗ trợ cây tổ chức nhiều cấp (Đoàn Trường → Đoàn Khoa → Chi Đoàn)
- **Self-referencing FK:** `parent_org_id` với CHECK constraint ngăn self-parent

**Use cases:**
- Hiển thị cây tổ chức
- Quản lý thành viên theo từng tổ chức
- Phân quyền theo tổ chức (organization-scoped roles)

---

### 3.3. **AUTHORIZATION SYSTEM** (Hệ thống phân quyền)

**Mục đích:** Quản lý vai trò và quyền hạn người dùng

**Entities:**
- **ROLE**: Vai trò (Admin, Student, Manager, etc.)
- **PERMISSION**: Quyền hạn cụ thể (CTXH_CREATE, TEMPLATE_APPROVE, etc.)

**Relationships:**
- ROLE N–N PERMISSION (role_permissions junction table)
- **Ternary:** PERSON-ROLE-ORGANIZATION (user_roles)
  - System-wide role: `organization_id = NULL`
  - Organization-scoped role: `organization_id NOT NULL`

**Thiết kế đặc biệt:**
- **Ternary relationship:** Cho phép phân quyền linh hoạt theo ngữ cảnh
- **Permission Context:** ENUM('System', 'Organization') để enforce scope

**Use cases:**
- Gán vai trò "Admin Đoàn Khoa CNTT" cho một cán bộ
- Kiểm tra quyền "CTXH_APPROVE" của user trong tổ chức cụ thể
- Quản lý quyền hệ thống (SuperAdmin)

---

### 3.4. **CTXH SYSTEM** (Hệ thống Công tác xã hội)

**Mục đích:** Quản lý hoạt động CTXH, đăng ký tham gia, chấm điểm

**Entities:**
- **CTXH_CATEGORY**: Danh mục hoạt động (Tình nguyện, Khởi nghiệp, etc.)
- **CTXH_ACTIVITY**: Hoạt động cụ thể (tên, mô tả, thời gian, địa điểm, số ngày)
- **PARTICIPATION** (weak entity): Đăng ký tham gia của sinh viên
- **CTXH_LIMIT_POLICY**: Chính sách giới hạn số ngày CTXH theo kỳ/năm

**Relationships:**
- CTXH_CATEGORY 1–N CTXH_ACTIVITY
- ORGANIZATION 1–N CTXH_ACTIVITY (tổ chức tổ chức sự kiện)
- **STUDENT ══ PARTICIPATION ══ CTXH_ACTIVITY** (identifying relationships)
- STAFF 0–N PARTICIPATION (Grades, optional)
- ORGANIZATION 1–N CTXH_LIMIT_POLICY

**Thiết kế đặc biệt:**
- **Weak Entity:** PARTICIPATION phụ thuộc vào STUDENT + CTXH_ACTIVITY
- **Auto-update Trigger:** Tự động cộng `ctxh_days_total` khi participation = 'Approved'
- **Business Rule:** Chỉ 1 ACTIVE limit policy per organization

**Use cases:**
- Tạo hoạt động CTXH mới
- Sinh viên đăng ký tham gia
- Cán bộ chấm điểm (actual_days)
- Chatbot RAG query hoạt động CTXH

---

### 3.5. **TEMPLATE SYSTEM** (Hệ thống biểu mẫu điện tử)

**Mục đích:** Tạo và quản lý biểu mẫu động, nhận đơn nộp, sinh văn bản Word tự động

**Entities:**
- **TEMPLATE**: Template biểu mẫu (tên, mô tả, trạng thái)
- **TEMPLATE_FIELD**: Trường dữ liệu trong template (tên, loại, thứ tự hiển thị)
- **TEMPLATE_SUBMISSION**: Đơn nộp của người dùng
- **GENERATED_DOCUMENT**: Văn bản Word được sinh tự động

**Relationships:**
- ORGANIZATION 1–N TEMPLATE (Owns, optional cho system-wide templates)
- TEMPLATE 1–N TEMPLATE_FIELD (Defines)
- PERSON 1–N TEMPLATE_SUBMISSION (Submits)
- TEMPLATE 1–N TEMPLATE_SUBMISSION (ReceivesSubmissionFor)
- **TEMPLATE_SUBMISSION N–N TEMPLATE_FIELD** (ProvidesAnswer, với attribute `answer_value`)
- TEMPLATE_SUBMISSION 0–1 GENERATED_DOCUMENT (Generates)

**Thiết kế đặc biệt:**
- **N:N with attribute:** `submission_answers` lưu câu trả lời cho từng field
- **Dynamic forms:** Field types: Text, Number, Date, Select, Checkbox, File
- **Word generation:** Parse docx template, thay thế {{field_name}} bằng answer_value

**Use cases:**
- Tạo template "Đơn xin nghỉ học"
- Sinh viên điền và nộp đơn
- Hệ thống tự động sinh file Word từ template
- Admin duyệt/từ chối đơn

---

### 3.6. **PAYMENT SYSTEM** (Hệ thống thanh toán)

**Mục đích:** Quản lý chiến dịch thu phí, giao dịch thanh toán trực tuyến (PayOS)

**Entities:**
- **PAYMENT_CAMPAIGN**: Chiến dịch thu phí (tên, thời gian, tổ chức)
- **FEE_LEVEL**: Mức phí (tên mức, số tiền)
- **FEE_ASSIGNMENT**: Phân công thu phí cho sinh viên
- **PAYMENT_TRANSACTION**: Giao dịch thanh toán

**Relationships:**
- ORGANIZATION 1–N PAYMENT_CAMPAIGN (Runs)
- PAYMENT_CAMPAIGN 1–N FEE_LEVEL (HasFeeLevels)
- PERSON 1–N FEE_ASSIGNMENT (HasAssignment)
- PAYMENT_CAMPAIGN 1–N FEE_ASSIGNMENT (Issues)
- FEE_LEVEL 1–N FEE_ASSIGNMENT (Categorizes)
- FEE_ASSIGNMENT 1–N PAYMENT_TRANSACTION (HasTransactions)

**Thiết kế đặc biệt:**
- **Auto-update Trigger:** Tự động chuyển `assignment_status = 'Paid'` khi transaction success
- **Payment Gateway:** Tích hợp PayOS (order_code, payment_method, paid_date)
- **Business Rule:** CHECK constraint đảm bảo fee_level thuộc đúng campaign

**Use cases:**
- Tạo chiến dịch "Thu Đoàn phí HK232"
- Phân công thu phí cho sinh viên (theo khoa, lớp, mức)
- Sinh viên thanh toán online qua PayOS
- Theo dõi trạng thái thanh toán (Pending/Paid/Overdue/Waived)

---

## 4. LUỒNG DỮ LIỆU CHÍNH

### 4.1. Onboarding Sinh viên
```
1. Import PERSON (person_type='STUDENT') từ Excel
   ↓
2. Gán DEPARTMENT (DepartmentAffiliation)
   ↓
3. Gán CLASS (EnrolledIn)
   ↓
4. Tạo USER_ORGANIZATIONS (Membership)
   ↓
5. Gán USER_ROLES (ví dụ: role "Student" trong org "Đoàn Trường")
```

### 4.2. Quy trình CTXH
```
1. Tổ chức tạo CTXH_ACTIVITY
   ↓
2. Sinh viên đăng ký (PARTICIPATION status='Registered')
   ↓
3. Sinh viên tham gia (status='Attended')
   ↓
4. Cán bộ chấm điểm (STAFF Grades PARTICIPATION, actual_days)
   ↓
5. Duyệt (status='Approved')
   ↓
6. [TRIGGER] Tự động cộng ctxh_days_total trong persons
```

### 4.3. Quy trình Template
```
1. Admin tạo TEMPLATE với TEMPLATE_FIELDs
   ↓
2. Sinh viên tạo TEMPLATE_SUBMISSION (status='Draft')
   ↓
3. Điền SUBMISSION_ANSWERS (câu trả lời cho từng field)
   ↓
4. Submit (status='Submitted')
   ↓
5. [Backend] Parse docx template, thay thế {{fields}}
   ↓
6. Tạo GENERATED_DOCUMENT (file Word)
   ↓
7. Admin duyệt (status='Approved')
```

### 4.4. Quy trình Thanh toán
```
1. Admin tạo PAYMENT_CAMPAIGN với FEE_LEVELs
   ↓
2. Tạo FEE_ASSIGNMENTS cho sinh viên (status='Pending')
   ↓
3. Sinh viên chọn assignment và thanh toán
   ↓
4. [PayOS Gateway] Tạo PAYMENT_TRANSACTION
   ↓
5. Callback từ PayOS (transaction_status='Success')
   ↓
6. [TRIGGER] Cập nhật assignment_status='Paid'
```

---

## 5. ĐẶC ĐIỂM KỸ THUẬT

### 5.1. Xử lý ISA Hierarchy
**Phương pháp:** Single Table Inheritance

**Ưu điểm:**
- Query đơn giản: `SELECT * FROM persons WHERE email = ?`
- Không cần JOIN khi truy vấn thông tin chung
- Dễ thêm subtypes mới (chỉ cần thêm cột và CHECK constraint)

**Nhược điểm:**
- Có nullable columns (student fields NULL khi person_type='STAFF')
- Storage không tối ưu nếu subtypes có nhiều attributes khác biệt

**Giải pháp thay thế:** Có thể tách thành 3 bảng (persons, students, staff) nếu cần tối ưu storage

### 5.2. Weak Entity
**Entity:** PARTICIPATION

**Đặc điểm:**
- Không có ý nghĩa độc lập (phải gắn với STUDENT + CTXH_ACTIVITY)
- PK: `participation_id` (surrogate key)
- Identifying owners: `student_id` + `activity_id` (UNIQUE constraint)
- FK rules: ON DELETE CASCADE (xóa student/activity → xóa participation)

### 5.3. Recursive Relationship
**Entity:** ORGANIZATION

**Đặc điểm:**
- `parent_org_id` FK → `organization_id`
- CHECK constraint: `parent_org_id != organization_id` (ngăn self-parent)
- Hỗ trợ cây tổ chức nhiều cấp

**Query ví dụ:**
```sql
-- Lấy toàn bộ cây con của một tổ chức
WITH RECURSIVE org_tree AS (
  SELECT * FROM organizations WHERE organization_id = ?
  UNION ALL
  SELECT o.* FROM organizations o
  JOIN org_tree t ON o.parent_org_id = t.organization_id
)
SELECT * FROM org_tree;
```

### 5.4. Ternary Relationship
**Relationship:** PERSON-ROLE-ORGANIZATION

**Đặc điểm:**
- 3 FKs: person_id, role_id, organization_id
- organization_id nullable (system-wide role)
- CHECK constraint enforce scope:
  ```sql
  CHECK (
    (organization_id IS NULL AND permission.context = 'System') OR
    (organization_id IS NOT NULL AND permission.context = 'Organization')
  )
  ```

**Use cases:**
- Gán "Admin Đoàn Khoa" cho user trong org cụ thể
- Gán "SuperAdmin" system-wide (organization_id = NULL)

### 5.5. Triggers
**1. update_ctxh_days:**
```sql
AFTER UPDATE ON ctxh_participation
WHEN (NEW.participation_status = 'Approved')
→ Cộng actual_days vào persons.ctxh_days_total
```

**2. update_assignment_status:**
```sql
AFTER INSERT ON payment_transactions
WHEN (NEW.transaction_status = 'Success')
→ Cập nhật fee_assignments.assignment_status = 'Paid'
```

### 5.6. Indexes
**Nhóm 1: FK Indexes** (tối ưu JOIN)
- `idx_classes_department`, `idx_activities_category`, etc.

**Nhóm 2: Search Indexes** (tối ưu WHERE, ORDER BY)
- `idx_persons_email`, `idx_persons_code`, `idx_activities_status`

**Nhóm 3: Composite Indexes** (tối ưu query patterns phổ biến)
- `idx_user_orgs_lookup(organization_id, person_id)`
- `idx_activities_dates(start_date, end_date)`

---

## 6. TÍCH HỢP HỆ THỐNG

### 6.1. Backend (NestJS + TypeORM)
- **Entities:** Ánh xạ 1-1 từ tables (decorators: @Entity, @Column, @ManyToOne, etc.)
- **Repositories:** Inject repository pattern cho CRUD operations
- **Services:** Business logic layer
- **Controllers:** RESTful API endpoints

### 6.2. Frontend (React + TypeScript)
- **API Client:** Axios/Fetch gọi backend API
- **State Management:** React Query/Redux cho data caching
- **Forms:** React Hook Form + Yup validation

### 6.3. External Services
**1. PayOS (Payment Gateway):**
- API: Tạo link thanh toán, webhook callback
- Flow: Frontend → Backend → PayOS → Callback → Update transaction

**2. AWS S3 (File Storage):**
- Upload generated documents
- Store submitted files (template submissions)

**3. Google Gemini (RAG Chatbot):**
- Embedding API: text-embedding-004 (768D vectors)
- Generation API: Gemini 1.5 Pro
- Vector Store: PostgreSQL pgVector extension

---

## 7. BẢO MẬT VÀ PERFORMANCE

### 7.1. Bảo mật
**1. Authentication:**
- JWT tokens (access + refresh)
- Password hashing: bcrypt
- OAuth: Google, Microsoft (excluded from ER model)

**2. Authorization:**
- Row-level security: Kiểm tra organization context
- Permission guards: Check user roles before API calls
- Audit logs: created_by, updated_by, deleted_by (excluded from ER model)

**3. Data Protection:**
- Encrypt sensitive fields (identity_card_number, phone)
- HTTPS only
- SQL injection prevention: TypeORM parameterized queries

### 7.2. Performance
**1. Indexing:**
- 20+ indexes cho hot queries
- Composite indexes cho JOIN patterns phổ biến

**2. Caching (Redis):**
- User session cache
- Permission cache per user+org
- CTXH activity embeddings (7 days TTL)

**3. Query Optimization:**
- Eager loading với TypeORM relations
- Pagination cho list endpoints
- Database connection pooling

**4. Monitoring:**
- Prometheus metrics
- Grafana dashboards
- Query slow log analysis

---

## 8. MIGRATION VÀ VERSIONING

### 8.1. Migration Strategy
- **Tool:** TypeORM migrations
- **Workflow:**
  1. Thay đổi Entity code
  2. Generate migration: `npm run migration:generate`
  3. Review SQL changes
  4. Apply: `npm run migration:run`
  5. Rollback nếu cần: `npm run migration:revert`

### 8.2. Versioning
- **Schema version:** Tracked trong `migrations` table
- **Backward compatibility:** Giữ old columns khi deprecate (soft delete)
- **Data migration:** Script riêng cho transform dữ liệu lớn

---

## 9. KẾ HOẠCH MỞ RỘNG

### 9.1. Tính năng tương lai
**1. Notification System:**
- Entities: NOTIFICATION, USER_NOTIFICATIONS
- Relationships: PERSON 1–N NOTIFICATION

**2. File Management:**
- Entities: FILE, FOLDER, FILE_PERMISSIONS
- S3 integration: CDN, pre-signed URLs

**3. Chat System:**
- Entities: CONVERSATION, MESSAGE, PARTICIPANT
- Relationships: PERSON N–N CONVERSATION

**4. Analytics & Reporting:**
- Entities: REPORT_TEMPLATE, GENERATED_REPORT
- Integration: Power BI, Excel export

### 9.2. Scalability
**1. Read Replicas:**
- Master-slave PostgreSQL replication
- Route read queries to replicas

**2. Sharding:**
- Shard by organization_id (nếu số tổ chức tăng lớn)
- Shard by person_id (nếu số user > 1M)

**3. Microservices:**
- Tách Payment Service riêng
- Tách Template Service riêng
- Event-driven với message queue (RabbitMQ/Kafka)

---

## 10. TÀI LIỆU THAM KHẢO

### 10.1. Tài liệu kỹ thuật
- [ER_MODEL.md](./ER_MODEL.md) - Mô hình ER chi tiết (Chen notation)
- [RELATIONAL_MODEL.md](./RELATIONAL_MODEL.md) - Ánh xạ sang mô hình quan hệ
- [BAO_CAO_CHATBOT_RAG.md](./BAO_CAO_CHATBOT_RAG.md) - Hệ thống RAG Chatbot

### 10.2. Standards & Conventions
- **Naming:** snake_case cho tables/columns, PascalCase cho entities
- **Normalization:** 3NF cho tất cả tables
- **FK Naming:** `{referenced_table}_id`
- **Junction Tables:** `{table1}_{table2}` (alphabetical order)

### 10.3. Tools
- **Database Client:** pgAdmin, DBeaver, TablePlus
- **ER Diagram:** draw.io, Lucidchart, ERDPlus
- **Migration:** TypeORM CLI
- **Monitoring:** pgHero, pgBadger

---

## PHỤ LỤC: THUẬT NGỮ VIẾT TẮT

| Thuật ngữ | Ý nghĩa | Giải thích |
|-----------|---------|------------|
| **CTXH** | Công tác xã hội | Community service activities |
| **ISA** | Is-A relationship | Quan hệ kế thừa (supertype/subtype) |
| **3NF** | Third Normal Form | Chuẩn hóa cơ sở dữ liệu mức 3 |
| **FK** | Foreign Key | Khóa ngoại |
| **PK** | Primary Key | Khóa chính |
| **RDBMS** | Relational Database Management System | Hệ quản trị cơ sở dữ liệu quan hệ |
| **RAG** | Retrieval-Augmented Generation | Kỹ thuật AI kết hợp tìm kiếm và sinh văn bản |
| **CRUD** | Create, Read, Update, Delete | Các thao tác cơ bản trên dữ liệu |
| **JWT** | JSON Web Token | Token xác thực dạng JSON |
| **API** | Application Programming Interface | Giao diện lập trình ứng dụng |

---

**Kết luận:** Database của hệ thống Đoàn Hội Portal được thiết kế theo chuẩn RDBMS 3NF, tối ưu cho các thao tác CRUD phổ biến, hỗ trợ phân quyền linh hoạt, và dễ dàng mở rộng trong tương lai. Mô hình dữ liệu phản ánh đầy đủ nghiệp vụ của hệ thống quản lý Đoàn/Hội tại môi trường đại học.
