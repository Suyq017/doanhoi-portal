# ĐÁNH GIÁ LOGIC NGHIỆP VỤ CHATBOT AI — SINH VIÊN & NHÂN VIÊN

> **Mục đích**: So sánh logic nghiệp vụ mà hệ thống CTXH hỗ trợ vs logic mà chatbot thực sự expose ra, đánh giá đủ hay thiếu, và đề xuất bổ sung.

---

## MỤC LỤC

1. [Tổng quan: Chatbot đang làm được gì?](#1-tổng-quan-chatbot-đang-làm-được-gì)
2. [Phân tích phía SINH VIÊN](#2-phân-tích-phía-sinh-viên)
3. [Phân tích phía NHÂN VIÊN (Staff)](#3-phân-tích-phía-nhân-viên-staff)
4. [Ma trận so sánh: Domain vs Chatbot](#4-ma-trận-so-sánh-domain-vs-chatbot)
5. [Đánh giá mức độ "đủ dùng"](#5-đánh-giá-mức-độ-đủ-dùng)
6. [Những workflow bị "đứt gãy"](#6-những-workflow-bị-đứt-gãy)
7. [Đề xuất bổ sung theo mức ưu tiên](#7-đề-xuất-bổ-sung-theo-mức-ưu-tiên)
8. [Kết luận](#8-kết-luận)

---

## 1. TỔNG QUAN: CHATBOT ĐANG LÀM ĐƯỢC GÌ?

### Kiến trúc phân luồng

```
User gửi tin nhắn
    ↓
Controller kiểm tra userType
    ├── STAFF → StaffAgentService (LangChain Agent + 9 tools)
    └── STUDENT → LangChainRagChainService (RAG Pipeline + 4 intent)
```

### Thống kê nhanh

| Metric | Sinh viên | Nhân viên |
|--------|-----------|-----------|
| Số tools/actions chatbot expose | **3** (tìm, xem, đăng ký) | **9** (tìm, duyệt, tạo, quản lý,...) |
| Số actions domain backend hỗ trợ | **~8** | **~15+** |
| % logic được chatbot cover | **~35-40%** | **~55-60%** |
| Intents hỗ trợ | 4 (RAG_QUERY, REGISTER, GREETING, CHITCHAT) | Tool-based (agent tự chọn) |

---

## 2. PHÂN TÍCH PHÍA SINH VIÊN

### 2.1. Những gì chatbot LÀM ĐƯỢC

#### ✅ Action 1: Tìm kiếm hoạt động CTXH (RAG_QUERY)

| Khả năng | Chi tiết | Đánh giá |
|-----------|----------|----------|
| Tìm theo keyword | "hoạt động hiến máu" → vector search | ✅ Tốt |
| Tìm theo thời gian | "hoạt động tuần này", "sắp tới", "đang diễn ra" | ✅ Tốt |
| Tìm theo địa điểm | "hoạt động ở CS1", "KTX khu A" | ✅ Tốt (có location alias) |
| Tìm theo tổ chức | "hoạt động Đoàn khoa KHMT" | ✅ Tốt |
| Tìm theo danh mục | "hoạt động tình nguyện", "học thuật" | ✅ Tốt |
| Tìm kết hợp filter | "hoạt động tình nguyện ở CS2 tuần này" | ✅ Tốt (LLM extract filters) |
| Auto-scope theo khoa | SV khoa KHMT → ưu tiên HĐ Đoàn khoa KHMT | ✅ Có (org injection) |
| Fallback khi 0 kết quả | Vector → Verifier → MCP SQL | ✅ Tốt (3 tầng fallback) |
| Thông tin real-time | remainingSlots, maxParticipants, requiresApproval | ✅ Có (MCP enricher) |
| Gợi ý follow-up | "Cho tôi biết thêm chi tiết", "Đăng ký hoạt động này" | ✅ Có |

**Nhận xét**: Tìm kiếm là phần **MẠNH NHẤT** của chatbot. Multi-strategy retrieval (vector + SQL fallback + verifier) là điểm sáng kiến trúc.

#### ✅ Action 2: Đăng ký hoạt động (REGISTER_ACTIVITY)

| Khả năng | Chi tiết | Đánh giá |
|-----------|----------|----------|
| Đăng ký trực tiếp | "Đăng ký hoạt động hiến máu" | ✅ Có |
| Đăng ký theo ordinal | "Đăng ký hoạt động thứ 2" (trong kết quả trước) | ✅ Có (session memory) |
| Đăng ký theo tên | "Đăng ký hoạt động số 3" | ✅ Có (fuzzy name matching) |
| Kiểm tra trạng thái | Chỉ cho đăng ký khi status=ACTIVE + đang tuyển | ✅ Có |
| Gợi ý đăng ký | Khi tìm thấy 1 HĐ đang tuyển → auto suggest | ✅ Có |

**Nhận xét**: Flow đăng ký khá hoàn chỉnh. Hỗ trợ ordinal reference ("thứ nhất", "số 2") là UX tốt.

#### ✅ Action 3: Hội thoại cơ bản (GREETING + CHITCHAT)

| Khả năng | Chi tiết | Đánh giá |
|-----------|----------|----------|
| Chào hỏi | "Xin chào", "Hello" | ✅ Có |
| Off-topic filter | "Thời tiết hôm nay thế nào?" → từ chối lịch sự | ✅ Có |
| Chat context memory | Nhớ lịch sử hội thoại (3 turn gần nhất) | ✅ Có |

---

### 2.2. Những gì chatbot KHÔNG LÀM ĐƯỢC (nhưng backend HỖ TRỢ)

#### ❌ Hủy đăng ký hoạt động

```
Sinh viên: "Tôi muốn hủy đăng ký hoạt động hiến máu"
Chatbot: ??? (Không có intent/tool xử lý)
```

**Backend đã có**: `participationService.cancelSelfRegistration(activityId, userId)`
**API đã có**: `DELETE /ctxh/activities/:id/cancel-registration`
**Chatbot thiếu**: Không có intent CANCEL_REGISTRATION, không có tool cancel

**Tác động**: Sinh viên đăng ký nhầm qua chatbot → phải vào portal web để hủy → **workflow bị đứt gãy**

**Mức nghiêm trọng**: 🔴 **CAO** — đây là cặp đối xứng tự nhiên của đăng ký. Có đăng ký mà không có hủy = thiếu sót rõ ràng.

---

#### ❌ Xem hoạt động đã đăng ký của bản thân

```
Sinh viên: "Tôi đã đăng ký những hoạt động nào?"
Chatbot: ??? (Không có tool query participations theo userId)
```

**Backend đã có**: Query participations WHERE student_id = userId
**Chatbot thiếu**: Không có tool/intent xem "my registrations"

**Tác động**: Sinh viên không biết mình đã đăng ký gì → hỏi đi hỏi lại → trải nghiệm kém

**Mức nghiêm trọng**: 🔴 **CAO** — câu hỏi cực kỳ phổ biến mà chatbot không trả lời được.

---

#### ❌ Xem số ngày CTXH tích lũy

```
Sinh viên: "Tôi có bao nhiêu ngày CTXH rồi?"
Chatbot: ??? (Không query users.ctxh_days)
```

**Backend đã có**: `users.ctxh_days` (decimal) + `users.ctxh_days_old_system`
**Chatbot thiếu**: Không có tool xem CTXH days cá nhân

**Tác động**: Đây là thông tin **quan trọng nhất** với sinh viên (cần đủ ngày CTXH để tốt nghiệp)

**Mức nghiêm trọng**: 🔴 **RẤT CAO** — lý do chính sinh viên quan tâm đến CTXH là để biết mình đã đủ ngày chưa.

---

#### ❌ Xem trạng thái đăng ký (đang chờ duyệt / đã duyệt / đã hoàn thành)

```
Sinh viên: "Hoạt động hiến máu tôi đăng ký đã được duyệt chưa?"
Chatbot: ??? (Không track participation status)
```

**Backend đã có**: `ctxh_participation.status` (PENDING / APPROVED / COMPLETED / CANCELLED)
**Chatbot thiếu**: Không có tool kiểm tra trạng thái participation cá nhân

**Tác động**: Sinh viên lo lắng không biết đăng ký đã được duyệt chưa

**Mức nghiêm trọng**: 🟡 **TRUNG BÌNH** — hữu ích nhưng không blocking

---

#### ❌ Xem chi tiết hoạt động đã tham gia (actual_days, grading)

```
Sinh viên: "Hoạt động hiến máu được tính bao nhiêu ngày CTXH?"
Chatbot: ??? (Không query actual_days từ participation)
```

**Backend đã có**: `ctxh_participation.actual_days` + grading workflow
**Chatbot thiếu**: Không có tool xem kết quả chấm điểm

**Mức nghiêm trọng**: 🟡 **TRUNG BÌNH**

---

#### ❌ So sánh hoạt động

```
Sinh viên: "So sánh hoạt động hiến máu và hoạt động dọn vệ sinh, cái nào nhiều ngày hơn?"
Chatbot: LLM có thể trả lời dựa trên context, nhưng KHÔNG có tool chuyên biệt
```

**Nhận xét**: LLM có thể tự so sánh từ retrieved documents → **chấp nhận được** nhưng không đảm bảo chính xác.

---

#### ❌ Nhắc nhở / Thông báo

```
Sinh viên: "Nhắc tôi khi hoạt động hiến máu sắp diễn ra"
Chatbot: ??? (Không có notification system)
```

**Mức nghiêm trọng**: ⚪ **THẤP** — nice-to-have, không phải core feature

---

### 2.3. Đánh giá tổng thể phía Sinh viên

```
ĐIỂM: 5.5/10

Mạnh:
  ✅ Tìm kiếm hoạt động: 9/10 (multi-strategy, fallback, filter, org injection)
  ✅ Đăng ký hoạt động: 8/10 (ordinal, fuzzy match, session memory)
  ✅ Hội thoại tự nhiên: 7/10 (intent routing, context-aware)

Yếu:
  ❌ Quản lý bản thân: 0/10 (xem HĐ đã ĐK, CTXH days, trạng thái duyệt)
  ❌ Hủy đăng ký: 0/10 (có ĐK mà không có hủy)
  ❌ Thông tin cá nhân: 0/10 (chatbot không biết gì về user ngoài orgName)
```

**Kết luận**: Chatbot làm tốt vai trò **"trợ lý tìm kiếm + đăng ký"** nhưng hoàn toàn **KHÔNG** đóng vai **"trợ lý quản lý CTXH cá nhân"**. Sinh viên hỏi bất cứ gì liên quan đến BẢN THÂN → chatbot bất lực.

---

## 3. PHÂN TÍCH PHÍA NHÂN VIÊN (STAFF)

### 3.1. Những gì chatbot LÀM ĐƯỢC

#### ✅ 9 Tools của Staff Agent

| # | Tool | Chức năng | Đánh giá |
|---|------|-----------|----------|
| 1 | `search_activities` | Tìm hoạt động + pending count | ✅ Tốt |
| 2 | `get_pending_participants` | Xem DS sinh viên chờ duyệt 1 HĐ | ✅ Tốt |
| 3 | `approve_and_notify` | Duyệt hàng loạt + gửi email BCC | ✅ Tốt |
| 4 | `create_activity` | Tạo hoạt động mới (có confirmation) | ✅ Tốt |
| 5 | `batch_create_activities` | Tạo 2-3 HĐ cùng lúc | ✅ OK |
| 6 | `manage_activity` | Cập nhật/xóa HĐ qua MCP SQL | ⚠️ Có nhưng hạn chế |
| 7 | `get_pending_overview` | Top 10 HĐ có SV chờ duyệt | ✅ Tốt |
| 8 | `lookup_category` | Tra cứu danh mục CTXH | ✅ OK |
| 9 | `lookup_organization` | Tra cứu tổ chức | ✅ OK |

**Nhận xét**: Staff agent đa dạng hơn nhiều so với student. Hỗ trợ được core workflow: **Tìm → Xem pending → Duyệt → Thông báo**.

### 3.2. Phân tích từng workflow nghiệp vụ

#### ✅ Workflow 1: Duyệt đăng ký sinh viên

```
Staff: "Hoạt động nào có sinh viên chờ duyệt?"
→ [get_pending_overview] → Danh sách top 10 HĐ

Staff: "Cho xem chi tiết hoạt động hiến máu"
→ [get_pending_participants] → DS sinh viên PENDING

Staff: "Duyệt hết đi"
→ [approve_and_notify] → Batch approve + email
```

| Bước | Có tool? | Hoạt động? |
|------|----------|------------|
| Xem overview pending | ✅ `get_pending_overview` | ✅ |
| Xem DS pending 1 HĐ | ✅ `get_pending_participants` | ✅ |
| Duyệt hàng loạt | ✅ `approve_and_notify` | ✅ |
| Gửi email thông báo | ✅ Tích hợp trong approve | ✅ |
| Từ chối đăng ký | ❌ **KHÔNG CÓ** | ❌ |
| Duyệt từng người | ❌ **KHÔNG CÓ** (chỉ batch all) | ⚠️ |

**Vấn đề #1: Không có tool TỪ CHỐI đăng ký**

```
Staff: "Từ chối sinh viên Nguyễn Văn A vì không đủ điều kiện"
Chatbot: ??? (Chỉ có approve, không có reject)
```

Workflow duyệt trong thực tế LUÔN có 2 chiều: **Approve ↔ Reject**. Chỉ có approve mà không có reject = workflow không hoàn chỉnh.

**Vấn đề #2: Chỉ batch approve ALL — không duyệt chọn lọc**

```
Staff: "Duyệt 3 sinh viên đầu tiên, từ chối 2 sinh viên cuối"
Chatbot: ??? (Chỉ approve ALL pending, không chọn lọc)
```

Trong thực tế, staff thường muốn **review từng người** hoặc **chọn lọc** → tool hiện tại quá thô.

---

#### ✅ Workflow 2: Tạo hoạt động mới

```
Staff: "Tạo hoạt động hiến máu nhân đạo ngày 15/06"
→ [lookup_category] → Chọn danh mục
→ [lookup_organization] → Chọn tổ chức
→ [create_activity] → Tạo (sau confirmation)
```

| Bước | Có tool? | Hoạt động? |
|------|----------|------------|
| Lookup category | ✅ `lookup_category` | ✅ |
| Lookup organization | ✅ `lookup_organization` | ✅ |
| Tạo đơn lẻ | ✅ `create_activity` | ✅ |
| Tạo hàng loạt | ✅ `batch_create_activities` | ✅ |
| Cần confirmation | ✅ Agent confirm trước khi tạo | ✅ |
| Permission check | ✅ Kiểm tra `ctxh.activities.create` | ✅ |

**Nhận xét**: Flow tạo hoạt động **khá hoàn chỉnh**. Có interactive resolution (lookup trước khi tạo) + confirmation + permission check.

---

#### ⚠️ Workflow 3: Quản lý hoạt động

```
Staff: "Cập nhật hoạt động hiến máu — đổi địa điểm sang CS2"
→ [manage_activity] → SQL UPDATE qua MCP
```

| Bước | Có tool? | Hoạt động? |
|------|----------|------------|
| Cập nhật thông tin | ✅ `manage_activity` | ⚠️ Hạn chế |
| Xóa hoạt động | ✅ `manage_activity` | ⚠️ Soft delete |
| Thay đổi status | ⚠️ Có thể qua manage | ⚠️ Không rõ ràng |
| Xem chi tiết 1 HĐ | ❌ **KHÔNG CÓ tool riêng** | ❌ |

**Vấn đề**: `manage_activity` dùng **raw SQL qua MCP** → nguy hiểm + không có validation business logic.

```
// manage_activity gọi trực tiếp SQL:
UPDATE ctxh_activity SET location = 'CS2' WHERE id = '...'
```

- Không trigger event (ActivityUpdatedEvent) → **vector embeddings KHÔNG được sync**
- Không validate business rules (ví dụ: không cho đổi status từ COMPLETED → ACTIVE)
- Không audit trail (updated_by, updated_at không tự set)

**Mức nghiêm trọng**: 🔴 **CAO** — bypass toàn bộ business logic layer.

---

#### ❌ Workflow 4: Chấm điểm / Ghi nhận CTXH

```
Staff: "Ghi nhận sinh viên Nguyễn Văn A tham gia 2 ngày CTXH"
Chatbot: ??? (Không có tool chấm điểm)
```

**Backend đã có**: 
- `participationService.gradeParticipation(id, { actual_days, status })` 
- `participationService.bulkGradeFromExcel(activityId, file)`
- Auto-recalculate `users.ctxh_days`

**Chatbot thiếu**: Hoàn toàn không có tool grading

**Tác động**: Đây là bước CUỐI CÙNG của workflow CTXH (Tạo HĐ → SV đăng ký → Duyệt → **Chấm điểm**). Chatbot hỗ trợ 3 bước đầu nhưng thiếu bước cuối.

**Mức nghiêm trọng**: 🔴 **CAO** — workflow CTXH bị đứt ở bước quan trọng nhất.

---

#### ❌ Workflow 5: Quản lý sinh viên trong hoạt động

```
Staff: "Xóa sinh viên Nguyễn Văn A khỏi hoạt động hiến máu"
Chatbot: ??? (Không có tool remove participant)

Staff: "Thêm sinh viên 2012345 vào hoạt động hiến máu"
Chatbot: ??? (Không có tool add student)
```

**Backend đã có**:
- `participationService.addStudent(activityId, dto)` — thêm SV thủ công
- `participationService.addMultipleStudents(activityId, file)` — thêm hàng loạt từ Excel
- `participationService.removeParticipant(participationId)` — xóa SV

**Chatbot thiếu**: 3 tool trên đều không có

**Mức nghiêm trọng**: 🟡 **TRUNG BÌNH** — có thể làm trên portal web nhưng tiện hơn nếu có qua chat.

---

#### ❌ Workflow 6: Xem báo cáo / Thống kê

```
Staff: "Tổng cộng bao nhiêu sinh viên đã tham gia hoạt động tháng này?"
Chatbot: ??? (Không có reporting tool)

Staff: "Sinh viên nào chưa đủ ngày CTXH?"
Chatbot: ??? (Không query aggregate data)
```

**Backend đã có**:
- `GET /ctxh/reports/student/:studentCode` — báo cáo SV
- `GET /ctxh/reports/system` — báo cáo hệ thống
- Excel export functionality

**Chatbot thiếu**: Hoàn toàn không có reporting

**Mức nghiêm trọng**: 🟡 **TRUNG BÌNH** — analytics thường dùng dashboard, nhưng quick query qua chat rất tiện.

---

#### ❌ Workflow 7: Export dữ liệu

```
Staff: "Xuất danh sách sinh viên hoạt động hiến máu ra Excel"
Chatbot: ??? (Không có export tool)
```

**Backend đã có**: `excelService.exportParticipants()`, template generation
**Chatbot thiếu**: Export không khả thi qua chat interface (cần file download)

**Mức nghiêm trọng**: ⚪ **THẤP** — hạn chế của chat interface, phù hợp hơn với portal web.

---

### 3.3. Đánh giá tổng thể phía Nhân viên

```
ĐIỂM: 6.5/10

Mạnh:
  ✅ Tìm kiếm hoạt động: 8/10
  ✅ Tạo hoạt động: 8/10 (interactive, confirmation, permission)
  ✅ Duyệt đăng ký: 7/10 (batch approve + email, nhưng thiếu reject + selective)
  ✅ Overview pending: 8/10

Yếu:
  ❌ Chấm điểm CTXH: 0/10 (workflow bị đứt)
  ❌ Từ chối đăng ký: 0/10 (chỉ có approve)
  ❌ Quản lý SV (add/remove): 0/10
  ❌ Manage activity: 3/10 (raw SQL, bypass logic)
  ❌ Báo cáo/thống kê: 0/10
```

---

## 4. MA TRẬN SO SÁNH: DOMAIN VS CHATBOT

### 4.1. Sinh viên

| Chức năng | Backend API | Chatbot | Gap |
|-----------|------------|---------|-----|
| Tìm kiếm hoạt động | ✅ `GET /ctxh/activities` | ✅ RAG + vector + SQL | ✅ Chatbot MẠNH HƠN |
| Xem chi tiết hoạt động | ✅ `GET /ctxh/activities/:id` | ✅ Qua RAG context | ≈ Tương đương |
| Đăng ký hoạt động | ✅ `POST /ctxh/activities/:id/register` | ✅ REGISTER_ACTIVITY intent | ≈ Tương đương |
| Hủy đăng ký | ✅ `DELETE /ctxh/activities/:id/cancel` | ❌ **KHÔNG CÓ** | 🔴 Gap |
| Xem HĐ đã đăng ký | ✅ `GET /ctxh/my-participations` | ❌ **KHÔNG CÓ** | 🔴 Gap |
| Xem ngày CTXH tích lũy | ✅ `users.ctxh_days` | ❌ **KHÔNG CÓ** | 🔴 Gap |
| Xem trạng thái duyệt | ✅ `participation.status` | ❌ **KHÔNG CÓ** | 🟡 Gap |
| Xem kết quả chấm điểm | ✅ `participation.actual_days` | ❌ **KHÔNG CÓ** | 🟡 Gap |

### 4.2. Nhân viên

| Chức năng | Backend API | Chatbot | Gap |
|-----------|------------|---------|-----|
| Tìm kiếm HĐ | ✅ | ✅ `search_activities` | ✅ OK |
| Tạo HĐ | ✅ | ✅ `create_activity` | ✅ OK |
| Tạo hàng loạt | ✅ | ✅ `batch_create_activities` | ✅ OK |
| Cập nhật HĐ | ✅ Service layer | ⚠️ `manage_activity` (raw SQL) | 🟡 Bypass logic |
| Xóa HĐ (soft) | ✅ Service layer | ⚠️ `manage_activity` (raw SQL) | 🟡 Bypass logic |
| Xem pending overview | ✅ | ✅ `get_pending_overview` | ✅ OK |
| Xem DS pending 1 HĐ | ✅ | ✅ `get_pending_participants` | ✅ OK |
| Duyệt ALL pending | ✅ | ✅ `approve_and_notify` | ✅ OK |
| Duyệt chọn lọc | ✅ | ❌ **KHÔNG CÓ** | 🟡 Gap |
| Từ chối đăng ký | ✅ | ❌ **KHÔNG CÓ** | 🔴 Gap |
| Thêm SV thủ công | ✅ | ❌ **KHÔNG CÓ** | 🟡 Gap |
| Xóa SV khỏi HĐ | ✅ | ❌ **KHÔNG CÓ** | 🟡 Gap |
| Chấm điểm SV | ✅ | ❌ **KHÔNG CÓ** | 🔴 Gap |
| Import Excel grades | ✅ | ❌ **KHÔNG CÓ** | 🟡 Gap (chat limitation) |
| Export Excel | ✅ | ❌ **KHÔNG CÓ** | ⚪ Chat limitation |
| Xem báo cáo SV | ✅ | ❌ **KHÔNG CÓ** | 🟡 Gap |
| Xem báo cáo hệ thống | ✅ | ❌ **KHÔNG CÓ** | 🟡 Gap |
| Quản lý danh mục | ✅ | ❌ (chỉ lookup) | ⚪ Admin-only |
| Quản lý limit config | ✅ | ❌ | ⚪ Admin-only |

---

## 5. ĐÁNH GIÁ MỨC ĐỘ "ĐỦ DÙNG"

### 5.1. Sinh viên — CHƯA ĐỦ

**Chatbot hiện tại = "Kiosk tìm kiếm thông minh"**, KHÔNG phải "Trợ lý cá nhân CTXH".

Sinh viên dùng chatbot chỉ có thể:
1. Hỏi → Tìm → Đọc kết quả
2. Đăng ký

Sinh viên KHÔNG THỂ:
- Kiểm tra tình trạng đăng ký của mình
- Biết mình còn thiếu bao nhiêu ngày CTXH
- Hủy đăng ký nhầm
- Xem lịch sử tham gia

**Ví dụ thực tế**: Sinh viên năm 4 sắp tốt nghiệp → vào chatbot hỏi "Tôi còn thiếu bao nhiêu ngày CTXH?" → Chatbot: "Xin lỗi, tôi không có thông tin này" → **Thất bại ở câu hỏi quan trọng nhất**.

**Verdict**: Chỉ cover được **"khám phá + hành động"** → thiếu **"theo dõi + quản lý cá nhân"**.

### 5.2. Nhân viên — TƯƠNG ĐỐI ĐỦ cho workflow cơ bản

**Chatbot hiện tại = "Trợ lý quản lý cơ bản"** — cover được ~60% workflow phổ biến.

Staff dùng chatbot có thể:
1. Tìm hoạt động có SV chờ duyệt
2. Xem danh sách pending
3. Duyệt hàng loạt + gửi email
4. Tạo hoạt động mới
5. Tra cứu category/org

Staff KHÔNG THỂ:
- Từ chối đăng ký (chỉ approve, không reject)
- Duyệt chọn lọc (chỉ batch all)
- Chấm điểm CTXH (bước cuối workflow)
- Xem báo cáo tổng hợp
- Thêm/xóa SV thủ công

**Ví dụ thực tế**: Staff muốn xử lý 1 hoạt động hoàn chỉnh qua chatbot:
```
1. ✅ Tạo hoạt động "Hiến máu" → create_activity
2. ✅ SV đăng ký → (SV tự đăng ký)
3. ✅ Duyệt đăng ký → approve_and_notify
4. ❌ Sau sự kiện, chấm điểm SV → KHÔNG CÓ TOOL
5. ❌ Cập nhật status → COMPLETED → manage_activity (raw SQL, bypass logic)
```

**Workflow bị đứt ở bước 4** — bước quan trọng nhất (ghi nhận CTXH cho SV).

**Verdict**: Đủ cho workflow **"quản lý trước sự kiện"** → thiếu **"quản lý sau sự kiện"**.

---

## 6. NHỮNG WORKFLOW BỊ "ĐỨT GÃY"

### 6.1. 🔴 Workflow đăng ký — hủy (Sinh viên)

```
HOÀN CHỈNH:  Tìm → Đăng ký → [Theo dõi] → [Hủy nếu cần]
HIỆN TẠI:    Tìm → Đăng ký → ??? → ???
```

**Thiếu**: Theo dõi trạng thái + Hủy đăng ký

### 6.2. 🔴 Lifecycle hoạt động (Nhân viên)

```
HOÀN CHỈNH:  Tạo → [SV đăng ký] → Duyệt/Từ chối → [Diễn ra] → Chấm điểm → Hoàn thành
HIỆN TẠI:    Tạo → [SV đăng ký] → Duyệt        → [Diễn ra] → ???        → ???
```

**Thiếu**: Từ chối + Chấm điểm + Đánh dấu hoàn thành

### 6.3. 🔴 Quản lý CTXH cá nhân (Sinh viên)

```
HOÀN CHỈNH:  Xem tổng ngày → Xem HĐ đã tham gia → Xem chi tiết từng HĐ → Tính còn thiếu
HIỆN TẠI:    ??? → ??? → ??? → ???
```

**Thiếu**: TOÀN BỘ workflow này

### 6.4. 🟡 Review chọn lọc (Nhân viên)

```
HOÀN CHỈNH:  Xem DS → Chọn SV A,B duyệt → Chọn SV C từ chối → Gửi email riêng
HIỆN TẠI:    Xem DS → Duyệt TẤT CẢ → Gửi 1 email chung
```

**Thiếu**: Selective approve/reject

### 6.5. 🟡 manage_activity bypass logic

```
ĐÚNG:  Staff chat "đổi địa điểm" → Service.update() → Validate → Save → Emit Event → Vector sync
SAI:   Staff chat "đổi địa điểm" → Raw SQL UPDATE → Không validate → Không event → Vector stale
```

**Hậu quả**: Thông tin trong chatbot search sẽ CŨ (vì vector không được sync).

---

## 7. ĐỀ XUẤT BỔ SUNG THEO MỨC ƯU TIÊN

### 🔴 Ưu tiên CAO — Nên có trước bảo vệ

| # | Feature | Bên | Effort | Lý do |
|---|---------|-----|--------|-------|
| 1 | **Xem ngày CTXH tích lũy** | SV | 2-3h | Câu hỏi #1 SV sẽ hỏi. Chỉ cần query `users.ctxh_days` |
| 2 | **Xem HĐ đã đăng ký** | SV | 3-4h | Thiếu = chatbot bất lực với "của tôi" |
| 3 | **Hủy đăng ký** | SV | 2-3h | Cặp đối xứng tự nhiên với đăng ký. Backend đã có `cancelSelfRegistration()` |
| 4 | **Từ chối đăng ký** | Staff | 2-3h | Workflow duyệt PHẢI có 2 chiều. Backend đã có xóa participation |
| 5 | **Fix manage_activity** | Staff | 4-6h | Gọi service layer thay vì raw SQL để trigger events + validation |

### 🟡 Ưu tiên TRUNG BÌNH — Nice-to-have

| # | Feature | Bên | Effort | Lý do |
|---|---------|-----|--------|-------|
| 6 | Xem trạng thái duyệt | SV | 2h | SV muốn biết PENDING hay APPROVED |
| 7 | Duyệt chọn lọc | Staff | 3-4h | Thực tế staff muốn review từng người |
| 8 | Chấm điểm CTXH | Staff | 4-5h | Hoàn thiện lifecycle. Phức tạp vì cần validate actual_days |
| 9 | Quick report | Staff | 3-4h | "Bao nhiêu SV tham gia tháng này?" — aggregation query đơn giản |
| 10 | Thêm SV thủ công | Staff | 2-3h | Backend đã có `addStudent()` |

### ⚪ Ưu tiên THẤP — Future work

| # | Feature | Bên | Lý do |
|---|---------|-----|-------|
| 11 | Export Excel | Staff | Hạn chế chat interface, phù hợp web hơn |
| 12 | Quản lý danh mục | Admin | Hiếm khi thay đổi, web đủ |
| 13 | Quản lý limit config | Admin | Admin-only, cần UI phức tạp |
| 14 | Notification/Reminder | SV | Cần push notification infrastructure |

---

## 8. KẾT LUẬN

### Tổng điểm logic nghiệp vụ

| Tiêu chí | Sinh viên | Nhân viên |
|-----------|-----------|-----------|
| **Số chức năng expose** | 3/8 (37%) | 9/15+ (60%) |
| **Core workflow coverage** | Tìm + ĐK ✅ / Quản lý bản thân ❌ | Tạo + Duyệt ✅ / Chấm điểm ❌ |
| **Workflow completeness** | ⚠️ Đứt gãy (ĐK mà không hủy được) | ⚠️ Đứt gãy (Duyệt mà không chấm) |
| **Điểm tổng** | **5.5/10** | **6.5/10** |

### Nhận xét chung

**Chatbot hiện tại ở mức "MVP khá tốt"** — đủ để demo tìm kiếm + tương tác cơ bản. Tuy nhiên:

1. **Phía sinh viên CÓ ÍT QUÁ** — chỉ 3 actions (tìm, xem, đăng ký). Thiếu hoàn toàn phần "quản lý cá nhân" mà sinh viên cần nhất (xem CTXH days, HĐ đã ĐK, trạng thái duyệt).

2. **Phía nhân viên TƯƠNG ĐỐI** — 9 tools đa dạng, cover workflow trước sự kiện. Nhưng thiếu bước cuối (chấm điểm) và thiếu chiều ngược (từ chối).

3. **Workflow không khép kín** — cả 2 bên đều có workflow bị "đứt" ở giữa, buộc user quay lại portal web để hoàn thành.

### Khuyến nghị trước bảo vệ

Nếu chỉ có thời gian fix **3 thứ**, hãy chọn:

1. **✅ "Xem ngày CTXH tích lũy"** (SV) — 2h, impact cao nhất, đơn giản nhất (query 1 field)
2. **✅ "Xem HĐ đã đăng ký"** (SV) — 3h, trả lời câu hỏi phổ biến nhất
3. **✅ "Hủy đăng ký"** (SV) — 2h, hoàn thiện workflow đăng ký, backend đã có sẵn

Ba cái này biến chatbot từ **"kiosk tìm kiếm"** thành **"trợ lý CTXH cá nhân"** — đáng kể hơn nhiều khi demo trước hội đồng.

---

> **Ghi chú cho hội đồng**: Khi bị hỏi "Chatbot có ít chức năng quá không?", trả lời:
> - "Em thiết kế theo nguyên tắc **Pareto 80/20** — 3 actions cơ bản cover 80% use case phổ biến nhất của sinh viên (tìm kiếm + đăng ký)"
> - "Phần staff có 9 tools cover workflow chính: tạo → duyệt → thông báo"  
> - "Architecture cho phép mở rộng dễ dàng — thêm 1 tool mới chỉ cần implement 1 function + register vào MCP server"
> - Sau đó nêu 3-5 features đã plan nhưng chưa implement (future work)
