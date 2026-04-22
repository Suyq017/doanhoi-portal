# RELATIONAL MODEL - Ánh xạ từ ER Model

**Quy ước ký hiệu:**
- **PK**: Primary Key (Khóa chính)
- **FK**: Foreign Key (Khóa ngoại)
- **UNIQUE**: Ràng buộc duy nhất
- **NOT NULL**: Không được null
- Kiểu dữ liệu: VARCHAR(n), INT, DATE, DECIMAL, ENUM, TEXT, BOOLEAN

---

## 1. XỬ LÝ SPECIALIZATION (ISA HIERARCHY)

### Phương pháp: **Single Table Inheritance** (Toàn bộ hierarchy trong 1 bảng)

### **persons**
```sql
persons (
    person_id            INT           PK,
    person_code          VARCHAR(20)   UNIQUE NOT NULL,
    family_name          VARCHAR(100)  NOT NULL,
    given_name           VARCHAR(100)  NOT NULL,
    email                VARCHAR(255)  UNIQUE NOT NULL,
    phone                VARCHAR(20),
    identity_card_number VARCHAR(20)   UNIQUE,
    birth_date           DATE,
    gender               ENUM('Male', 'Female', 'Other'),
    membership_status    VARCHAR(50),
    person_type          ENUM('STUDENT', 'STAFF') NOT NULL,
    
    -- STUDENT attributes (NULL nếu person_type = 'STAFF')
    admission_year       INT,
    curriculum_year      INT,
    faculty_code         VARCHAR(20),
    training_system      VARCHAR(50),
    training_level       VARCHAR(50),
    ctxh_days_total      DECIMAL(5,2)  DEFAULT 0,
    ctxh_days_from_old_system DECIMAL(5,2) DEFAULT 0,
    
    CONSTRAINT check_student_fields 
        CHECK (person_type != 'STUDENT' OR 
               (admission_year IS NOT NULL AND curriculum_year IS NOT NULL))
)
```

**Lý do chọn phương pháp này:**
- Disjoint, total specialization phù hợp với single table
- Tránh phức tạp khi JOIN nhiều bảng
- Dễ query khi cần thông tin person chung

**Lưu ý:** Có thể tách thành 3 bảng riêng (persons, students, staff) nếu cần tối ưu storage

---

## 2. ACADEMIC STRUCTURE (Cấu trúc học thuật)

### **departments**
```sql
departments (
    department_id    INT          PK,
    department_code  VARCHAR(20)  UNIQUE NOT NULL,
    department_name  VARCHAR(255) NOT NULL,
    description      TEXT
)
```

### **classes**
```sql
classes (
    class_id       INT          PK,
    class_name     VARCHAR(100) UNIQUE NOT NULL,
    academic_year  VARCHAR(20)  NOT NULL,
    department_id  INT          FK → departments(department_id) NOT NULL
)
```
**Quan hệ:** DEPARTMENT 1–N CLASS

### **person_departments** (Quan hệ DepartmentAffiliation N:1)
```sql
person_departments (
    person_id         INT         FK → persons(person_id),
    department_id     INT         FK → departments(department_id),
    affiliation_type  ENUM('Training', 'Management') NOT NULL,
    
    PRIMARY KEY (person_id, department_id, affiliation_type)
)
```
**Lưu ý:** Cho phép một person có cả training dept và management dept

### **student_classes** (Quan hệ EnrolledIn N:1)
```sql
student_classes (
    person_id  INT  FK → persons(person_id),
    class_id   INT  FK → classes(class_id),
    
    PRIMARY KEY (person_id),
    CONSTRAINT check_student CHECK (
        EXISTS (SELECT 1 FROM persons WHERE person_id = student_classes.person_id 
                AND person_type = 'STUDENT')
    )
)
```
**Quan hệ:** CLASS 1–N STUDENT (mỗi sinh viên thuộc 1 lớp)

---

## 3. ORGANIZATION STRUCTURE (Cấu trúc tổ chức)

### **organizations**
```sql
organizations (
    organization_id    INT          PK,
    organization_code  VARCHAR(50)  UNIQUE NOT NULL,
    organization_name  VARCHAR(255) NOT NULL,
    organization_type  VARCHAR(50)  NOT NULL,
    parent_org_id      INT          FK → organizations(organization_id),
    description        TEXT,
    
    CONSTRAINT check_no_self_parent CHECK (organization_id != parent_org_id)
)
```
**Quan hệ:** ORGANIZATION 1–N ORGANIZATION (recursive, ParentOf)

### **user_organizations** (Quan hệ Membership N:N)
```sql
user_organizations (
    person_id       INT      FK → persons(person_id),
    organization_id INT      FK → organizations(organization_id),
    member_role     ENUM('Member', 'Admin', 'SuperAdmin') DEFAULT 'Member',
    joined_date     DATE,
    
    PRIMARY KEY (person_id, organization_id)
)
```
**Quan hệ:** PERSON N–N ORGANIZATION

---

## 4. AUTHORIZATION (Phân quyền)

### **roles**
```sql
roles (
    role_id      INT          PK,
    role_name    VARCHAR(100) UNIQUE NOT NULL,
    description  TEXT
)
```

### **permissions**
```sql
permissions (
    permission_id    INT          PK,
    permission_code  VARCHAR(100) UNIQUE NOT NULL,
    permission_name  VARCHAR(255) NOT NULL,
    description      TEXT,
    category         VARCHAR(50),
    context          ENUM('System', 'Organization') NOT NULL
)
```

### **role_permissions** (Quan hệ Grants N:N)
```sql
role_permissions (
    role_id       INT  FK → roles(role_id),
    permission_id INT  FK → permissions(permission_id),
    
    PRIMARY KEY (role_id, permission_id)
)
```
**Quan hệ:** ROLE N–N PERMISSION

### **user_roles** (Ternary relationship: PERSON-ROLE-ORGANIZATION)
```sql
user_roles (
    person_id       INT  FK → persons(person_id) NOT NULL,
    role_id         INT  FK → roles(role_id) NOT NULL,
    organization_id INT  FK → organizations(organization_id),
    
    PRIMARY KEY (person_id, role_id, organization_id),
    
    CONSTRAINT check_org_context CHECK (
        (organization_id IS NULL AND 
         role_id IN (SELECT role_id FROM roles WHERE context = 'System'))
        OR
        (organization_id IS NOT NULL AND
         role_id IN (SELECT role_id FROM roles WHERE context = 'Organization'))
    )
)
```
**Quan hệ:** Ternary (PERSON-ROLE-ORGANIZATION)
- System-wide role: organization_id = NULL
- Organization-scoped role: organization_id NOT NULL

---

## 5. CTXH (CÔNG TÁC XÃ HỘI)

### **ctxh_categories**
```sql
ctxh_categories (
    category_id    INT          PK,
    category_name  VARCHAR(100) UNIQUE NOT NULL,
    description    TEXT
)
```

### **ctxh_activities**
```sql
ctxh_activities (
    activity_id         INT          PK,
    activity_name       VARCHAR(255) NOT NULL,
    description         TEXT,
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    location            VARCHAR(255),
    planned_total_days  DECIMAL(5,2) NOT NULL,
    activity_status     ENUM('Draft', 'Active', 'Completed', 'Cancelled') 
                        DEFAULT 'Draft',
    category_id         INT          FK → ctxh_categories(category_id) NOT NULL,
    organization_id     INT          FK → organizations(organization_id) NOT NULL,
    
    CONSTRAINT check_dates CHECK (end_date >= start_date)
)
```
**Quan hệ:** 
- CTXH_CATEGORY 1–N CTXH_ACTIVITY (Classifies)
- ORGANIZATION 1–N CTXH_ACTIVITY (Organizes)

### **ctxh_participations** (WEAK ENTITY)
```sql
ctxh_participations (
    participation_id     INT          PK,
    student_id           INT          FK → persons(person_id) NOT NULL,
    activity_id          INT          FK → ctxh_activities(activity_id) NOT NULL,
    grader_staff_id      INT          FK → persons(person_id),
    participation_status ENUM('Registered', 'Attended', 'Approved', 'Rejected') 
                         DEFAULT 'Registered',
    actual_days          DECIMAL(5,2),
    note                 TEXT,
    
    UNIQUE (student_id, activity_id),
    
    CONSTRAINT check_student CHECK (
        EXISTS (SELECT 1 FROM persons WHERE person_id = student_id 
                AND person_type = 'STUDENT')
    ),
    CONSTRAINT check_grader CHECK (
        grader_staff_id IS NULL OR
        EXISTS (SELECT 1 FROM persons WHERE person_id = grader_staff_id 
                AND person_type = 'STAFF')
    )
)
```
**Quan hệ:**
- STUDENT 1–N PARTICIPATION (Registers) - identifying relationship
- CTXH_ACTIVITY 1–N PARTICIPATION (ForActivity) - identifying relationship
- STAFF 0–N PARTICIPATION (Grades) - optional relationship

### **ctxh_limit_policies**
```sql
ctxh_limit_policies (
    limit_policy_id  INT          PK,
    organization_id  INT          FK → organizations(organization_id) NOT NULL,
    max_days         DECIMAL(5,2) NOT NULL,
    policy_status    ENUM('Active', 'Inactive') DEFAULT 'Active',
    description      TEXT,
    
    UNIQUE (organization_id, policy_status),
    
    CONSTRAINT check_one_active_per_org CHECK (
        policy_status != 'Active' OR NOT EXISTS (
            SELECT 1 FROM ctxh_limit_policies clp
            WHERE clp.organization_id = ctxh_limit_policies.organization_id
              AND clp.policy_status = 'Active'
              AND clp.limit_policy_id != ctxh_limit_policies.limit_policy_id
        )
    )
)
```
**Quan hệ:** ORGANIZATION 1–N CTXH_LIMIT_POLICY (HasLimitPolicy)

---

## 6. TEMPLATES & SUBMISSIONS (Biểu mẫu & Nộp đơn)

### **templates**
```sql
templates (
    template_id      INT          PK,
    template_name    VARCHAR(255) UNIQUE NOT NULL,
    description      TEXT,
    template_status  ENUM('Active', 'Inactive') DEFAULT 'Active',
    organization_id  INT          FK → organizations(organization_id)
)
```
**Quan hệ:** ORGANIZATION 1–N TEMPLATE (Owns)
- organization_id = NULL → system-wide template

### **template_fields**
```sql
template_fields (
    field_id       INT          PK,
    template_id    INT          FK → templates(template_id) NOT NULL,
    field_name     VARCHAR(100) NOT NULL,
    display_name   VARCHAR(255) NOT NULL,
    field_type     ENUM('Text', 'Number', 'Date', 'Select', 'Checkbox', 'File') 
                   NOT NULL,
    placeholder    VARCHAR(255),
    help_text      TEXT,
    default_value  TEXT,
    display_order  INT          DEFAULT 0,
    is_visible     BOOLEAN      DEFAULT TRUE,
    
    UNIQUE (template_id, field_name)
)
```
**Quan hệ:** TEMPLATE 1–N TEMPLATE_FIELD (Defines)

### **template_submissions**
```sql
template_submissions (
    submission_id     INT          PK,
    template_id       INT          FK → templates(template_id) NOT NULL,
    submitter_id      INT          FK → persons(person_id) NOT NULL,
    submission_status ENUM('Draft', 'Submitted', 'Approved', 'Rejected') 
                      DEFAULT 'Draft',
    submitted_date    TIMESTAMP
)
```
**Quan hệ:**
- PERSON 1–N TEMPLATE_SUBMISSION (Submits)
- TEMPLATE 1–N TEMPLATE_SUBMISSION (ReceivesSubmissionFor)

### **submission_answers** (N:N relationship with attribute)
```sql
submission_answers (
    submission_id  INT   FK → template_submissions(submission_id),
    field_id       INT   FK → template_fields(field_id),
    answer_value   TEXT,
    
    PRIMARY KEY (submission_id, field_id)
)
```
**Quan hệ:** TEMPLATE_SUBMISSION N–N TEMPLATE_FIELD (ProvidesAnswer)
- Relationship attribute: answer_value

### **generated_documents**
```sql
generated_documents (
    gen_doc_id    INT          PK,
    submission_id INT          FK → template_submissions(submission_id) UNIQUE NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    file_size     BIGINT
)
```
**Quan hệ:** TEMPLATE_SUBMISSION 0–1 GENERATED_DOCUMENT (Generates)

---

## 7. PAYMENTS (Thanh toán)

### **payment_campaigns**
```sql
payment_campaigns (
    campaign_id      INT          PK,
    campaign_name    VARCHAR(255) NOT NULL,
    description      TEXT,
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    campaign_status  ENUM('Active', 'Inactive', 'Completed') DEFAULT 'Active',
    organization_id  INT          FK → organizations(organization_id) NOT NULL,
    
    CONSTRAINT check_campaign_dates CHECK (end_date >= start_date)
)
```
**Quan hệ:** ORGANIZATION 1–N PAYMENT_CAMPAIGN (Runs)

### **fee_levels**
```sql
fee_levels (
    fee_level_id  INT           PK,
    campaign_id   INT           FK → payment_campaigns(campaign_id) NOT NULL,
    level_name    VARCHAR(100)  NOT NULL,
    amount        DECIMAL(15,2) NOT NULL,
    description   TEXT,
    
    UNIQUE (campaign_id, level_name),
    CONSTRAINT check_positive_amount CHECK (amount > 0)
)
```
**Quan hệ:** PAYMENT_CAMPAIGN 1–N FEE_LEVEL (HasFeeLevels)

### **fee_assignments**
```sql
fee_assignments (
    assignment_id     INT          PK,
    person_id         INT          FK → persons(person_id) NOT NULL,
    campaign_id       INT          FK → payment_campaigns(campaign_id) NOT NULL,
    fee_level_id      INT          FK → fee_levels(fee_level_id) NOT NULL,
    assignment_status ENUM('Pending', 'Paid', 'Overdue', 'Waived') 
                      DEFAULT 'Pending',
    due_date          DATE,
    note              TEXT,
    
    UNIQUE (person_id, campaign_id),
    
    CONSTRAINT check_fee_level_belongs_to_campaign CHECK (
        EXISTS (SELECT 1 FROM fee_levels 
                WHERE fee_level_id = fee_assignments.fee_level_id 
                  AND campaign_id = fee_assignments.campaign_id)
    )
)
```
**Quan hệ:**
- PERSON 1–N FEE_ASSIGNMENT (HasAssignment)
- PAYMENT_CAMPAIGN 1–N FEE_ASSIGNMENT (Issues)
- FEE_LEVEL 1–N FEE_ASSIGNMENT (Categorizes)

### **payment_transactions**
```sql
payment_transactions (
    transaction_id     INT           PK,
    assignment_id      INT           FK → fee_assignments(assignment_id) NOT NULL,
    amount             DECIMAL(15,2) NOT NULL,
    transaction_status ENUM('Pending', 'Success', 'Failed', 'Refunded') 
                       DEFAULT 'Pending',
    payment_method     VARCHAR(50),
    order_code         VARCHAR(100)  UNIQUE,
    paid_date          TIMESTAMP,
    
    CONSTRAINT check_transaction_amount CHECK (amount > 0)
)
```
**Quan hệ:** FEE_ASSIGNMENT 1–N PAYMENT_TRANSACTION (HasTransactions)

---

## 8. INTEGRITY CONSTRAINTS (Ràng buộc toàn vẹn)

### Referential Integrity (Toàn vẹn tham chiếu)
```sql
-- Tất cả FK đều có ON DELETE và ON UPDATE rules:

-- Cascade deletes (xóa cascade)
- organizations.parent_org_id → ON DELETE SET NULL
- ctxh_activities.organization_id → ON DELETE RESTRICT (không cho xóa org có activity)
- ctxh_participations.activity_id → ON DELETE CASCADE
- template_fields.template_id → ON DELETE CASCADE
- submission_answers → ON DELETE CASCADE

-- Protect deletes (bảo vệ không cho xóa)
- classes.department_id → ON DELETE RESTRICT
- fee_assignments.person_id → ON DELETE RESTRICT
- payment_transactions.assignment_id → ON DELETE RESTRICT
```

### Business Rules (Quy tắc nghiệp vụ)

1. **CTXH Days Calculation:**
```sql
-- Trigger để cập nhật ctxh_days_total khi participation được approve
CREATE TRIGGER update_ctxh_days
AFTER UPDATE ON ctxh_participations
FOR EACH ROW
WHEN (NEW.participation_status = 'Approved' AND OLD.participation_status != 'Approved')
BEGIN
    UPDATE persons
    SET ctxh_days_total = ctxh_days_total + NEW.actual_days
    WHERE person_id = NEW.student_id AND person_type = 'STUDENT';
END;
```

2. **Payment Status Auto-update:**
```sql
-- Trigger để cập nhật assignment_status khi có transaction success
CREATE TRIGGER update_assignment_status
AFTER INSERT ON payment_transactions
FOR EACH ROW
WHEN (NEW.transaction_status = 'Success')
BEGIN
    UPDATE fee_assignments
    SET assignment_status = 'Paid'
    WHERE assignment_id = NEW.assignment_id;
END;
```

3. **Active Policy Constraint:**
```sql
-- Chỉ có 1 active limit policy per organization
-- (Đã được enforce bằng UNIQUE constraint và CHECK constraint)
```

---

## 9. INDEXES (Chỉ mục để tối ưu performance)

```sql
-- Primary indexes (tự động tạo với PK)

-- Foreign key indexes
CREATE INDEX idx_classes_department ON classes(department_id);
CREATE INDEX idx_activities_category ON ctxh_activities(category_id);
CREATE INDEX idx_activities_org ON ctxh_activities(organization_id);
CREATE INDEX idx_participations_student ON ctxh_participations(student_id);
CREATE INDEX idx_participations_activity ON ctxh_participations(activity_id);
CREATE INDEX idx_submissions_template ON template_submissions(template_id);
CREATE INDEX idx_submissions_submitter ON template_submissions(submitter_id);
CREATE INDEX idx_fee_assignments_person ON fee_assignments(person_id);
CREATE INDEX idx_fee_assignments_campaign ON fee_assignments(campaign_id);
CREATE INDEX idx_transactions_assignment ON payment_transactions(assignment_id);

-- Search/filter indexes
CREATE INDEX idx_persons_email ON persons(email);
CREATE INDEX idx_persons_code ON persons(person_code);
CREATE INDEX idx_persons_type ON persons(person_type);
CREATE INDEX idx_activities_status ON ctxh_activities(activity_status);
CREATE INDEX idx_activities_dates ON ctxh_activities(start_date, end_date);
CREATE INDEX idx_participations_status ON ctxh_participations(participation_status);
CREATE INDEX idx_campaigns_status ON payment_campaigns(campaign_status);
CREATE INDEX idx_transactions_status ON payment_transactions(transaction_status);
CREATE INDEX idx_organizations_parent ON organizations(parent_org_id);

-- Composite indexes for common queries
CREATE INDEX idx_user_orgs_lookup ON user_organizations(organization_id, person_id);
CREATE INDEX idx_user_roles_lookup ON user_roles(person_id, organization_id);
```

---

## 10. TÓM TẮT ÁNH XẠ

| ER Concept | Relational Mapping | Note |
|------------|-------------------|------|
| **Entity** | Table | Mỗi entity → 1 table |
| **Attribute** | Column | Attribute → column |
| **PK** | PRIMARY KEY | Giữ nguyên |
| **1:N Relationship** | FK ở "many" side | FK trong bảng con trỏ về bảng cha |
| **N:N Relationship** | Junction table | Bảng trung gian với 2 FK |
| **Ternary Relationship** | Table with 3 FKs | user_roles(person, role, org) |
| **Weak Entity** | PK includes owner's PK | participations cần student_id + activity_id |
| **ISA (d, total)** | Single table with type column | persons(person_type) |
| **Recursive Relationship** | Self-referencing FK | organizations.parent_org_id |
| **Optional Relationship** | Nullable FK | grader_staff_id, organization_id |
| **Relationship Attribute** | Column in relationship table | answer_value, member_role |

---

## 11. NORMALIZATION CHECK (Kiểm tra chuẩn hóa)

### Tất cả các bảng đều đạt **3NF (Third Normal Form)**:

1. **1NF:** Không có multi-valued attributes, tất cả giá trị atomic ✓
2. **2NF:** Không có partial dependency (non-key attributes phụ thuộc đầy đủ vào PK) ✓
3. **3NF:** Không có transitive dependency (non-key attributes không phụ thuộc vào non-key khác) ✓

**Ví dụ:** 
- `ctxh_activities` có cả `category_id` và `organization_id` - đúng vì đây là FK, không phải derived
- `persons` có `ctxh_days_total` - có thể tính từ participations nhưng được lưu để tối ưu (denormalization có kiểm soát)
- `fee_assignments` có cả `campaign_id` và `fee_level_id` - cần cả 2 để enforce constraint

---

## 12. DATABASE DIAGRAM (ASCII)

```
┌──────────────┐     1      ┌──────────────┐
│  departments │◄───────────│   classes    │
└──────────────┘     N      └──────────────┘
                                    │1
                                    │
                                    │N
┌──────────────┐             ┌──────────────┐
│   persons    │─────────────│student_classes│
│(person_type) │1          N └──────────────┘
└──────────────┘
      │1
      │
      │N
┌──────────────────┐
│user_organizations│──────┐
└──────────────────┘      │
                          │N
                    ┌─────▼──────┐
                    │organizations│
                    │(parent_org) │◄───┐
                    └────────────┘    │recursive
                          │1          │1:N
                          │           │
                          │N          │
                    ┌────────────┐    │
                    │payment_    │    │
                    │campaigns   │────┘
                    └────────────┘
                          │1
                          │
                          │N
                    ┌────────────┐
                    │ fee_levels │
                    └────────────┘
```

---

**Lưu ý cuối:**
- Mô hình này tương ứng 1-1 với ER model ban đầu
- Loại bỏ các trường technical/audit như yêu cầu
- Đã thêm các constraint để enforce business rules
- Index được thiết kế cho các query pattern phổ biến
- Có thể điều chỉnh chiến lược ISA hierarchy tùy use case
