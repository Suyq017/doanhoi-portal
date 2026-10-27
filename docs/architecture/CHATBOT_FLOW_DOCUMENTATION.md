# Tài liệu Luồng Hoạt Động Chatbot CTXH

> **Phạm vi:** Hệ thống chatbot RAG hỗ trợ tra cứu và quản lý hoạt động Công tác Xã hội (CTXH) tại Đại học Bách Khoa TP.HCM.
> **Stack:** NestJS · LangChain.js · pgVector · Ollama / Google Gemini · BullMQ · Redis

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Phân luồng theo vai trò người dùng](#2-phân-luồng-theo-vai-trò-người-dùng)
3. [Danh sách Use Case](#3-danh-sách-use-case)
4. [Luồng sinh viên (Student Flow)](#4-luồng-sinh-viên-student-flow)
   - 4.1 [Sequence Diagram — Student Chat](#41-sequence-diagram--student-chat)
   - 4.2 [Activity Diagram — Student RAG Pipeline](#42-activity-diagram--student-rag-pipeline)
   - 4.3 [Sequence Diagram — Student Đăng ký hoạt động qua chat](#43-sequence-diagram--student-đăng-ký-hoạt-động-qua-chat)
5. [Luồng cán bộ (Staff Flow)](#5-luồng-cán-bộ-staff-flow)
   - 5.1 [Sequence Diagram — Staff Agent Chat](#51-sequence-diagram--staff-agent-chat)
   - 5.2 [Activity Diagram — Staff Tool Execution](#52-activity-diagram--staff-tool-execution)
   - 5.3 [Sequence Diagram — Duyệt đăng ký qua chat](#53-sequence-diagram--duyệt-đăng-ký-qua-chat)
   - 5.4 [Sequence Diagram — Tạo hoạt động qua chat](#54-sequence-diagram--tạo-hoạt-động-qua-chat)
6. [Luồng dữ liệu Ingestion (Vector Sync)](#6-luồng-dữ-liệu-ingestion-vector-sync)
   - 6.1 [Sequence Diagram — Ingestion Pipeline](#61-sequence-diagram--ingestion-pipeline)
7. [Luồng xử lý Agent Decision](#7-luồng-xử-lý-agent-decision)
   - 7.1 [Activity Diagram — Agent Decision](#71-activity-diagram--agent-decision)
8. [Cơ chế Session Memory](#8-cơ-chế-session-memory)
9. [Rate Limiting & Bảo mật](#9-rate-limiting--bảo-mật)
10. [Tóm tắt các thành phần chính](#10-tóm-tắt-các-thành-phần-chính)

---

## 1. Tổng quan kiến trúc

```
┌────────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                            │
│   POST /ctxh-chat/message  |  SSE /ctxh-chat/stream               │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ JWT Bearer Token
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│               CtxhChatController  (NestJS)                         │
│   ─ JwtAuthGuard → xác thực người dùng                             │
│   ─ RateLimitInterceptor → 30 req/60s (Redis)                      │
│   ─ Phân luồng: userType === 'staff' → StaffAgentService           │
│                 userType === 'student' → LangChainRagChainService   │
└────┬──────────────────────────────────────────────┬────────────────┘
     │                                              │
     ▼ (student)                                    ▼ (staff)
┌──────────────────────┐               ┌────────────────────────────┐
│ LangChainRagChain    │               │  StaffAgentService         │
│  ─ CtxhAgentService  │               │  ─ Tool-calling loop       │
│  ─ VectorStore       │               │  ─ 12 custom tools         │
│  ─ McpSqlFallback    │               │  ─ PostgresMcpClient tools │
│  ─ MemoryService     │               │  ─ MemoryService           │
│  ─ LLM Generation    │               │  ─ LLM (Gemini/Ollama)     │
└──────────────────────┘               └────────────────────────────┘
           │                                        │
           ▼                                        ▼
┌────────────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                                │
│   PostgreSQL + pgVector  |  Redis (BullMQ + RateLimit)             │
│   Ollama (local)  |  Google Gemini (cloud)                         │
│   NodemailerService  |  ParticipationService                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phân luồng theo vai trò người dùng

| Thuộc tính | **Student** | **Staff** |
|---|---|---|
| Service xử lý | `LangChainRagChainService` | `StaffAgentService` |
| Mô hình agent | RAG + single Agent decision | ReAct tool-calling loop (≤10 vòng) |
| Số lần gọi LLM / tin nhắn | 2 (Agent decide + Generation) | 1–N tuỳ tool calls cần thiết |
| Truy cập Vector Store | Có (pgVector) | Không (dùng DB trực tiếp) |
| Tools có sẵn | `search_ctxh_activities`, `register_for_activity`, `respond_general` | 12 tools: tìm kiếm, duyệt, tạo, cập nhật, email, ... |
| Có thể đăng ký hoạt động | Có (tự động) | Không |
| Có thể quản lý hoạt động | Không | Có (tạo, duyệt, từ chối, cập nhật, xóa) |
| Session memory | In-memory (TTL 30 phút) | In-memory (TTL 30 phút) |
| Follow-up suggestions | Có (3 gợi ý) | Không |
| Confidence score | Có | Không (fixed 0.9) |

---

## 3. Danh sách Use Case

### 3.1 Use Case dành cho Sinh viên (Student)

| ID | Use Case | Mô tả | Intent |
|---|---|---|---|
| UC-S01 | Tìm kiếm hoạt động CTXH | Tra cứu hoạt động theo trạng thái, thời gian, địa điểm, tổ chức | `search` / mode=`filtered` |
| UC-S02 | Tìm kiếm ngữ nghĩa | Hỏi mơ hồ, không có filter cụ thể | `search` / mode=`semantic` |
| UC-S03 | Xem đa dạng hoạt động | Muốn xem nhiều loại hoạt động khác nhau | `search` / mode=`diverse` |
| UC-S04 | Liệt kê tất cả hoạt động | Yêu cầu danh sách toàn bộ | `search` / mode=`list_all` |
| UC-S05 | Đăng ký hoạt động qua chat | Nói "tôi muốn đăng ký" hoặc xác nhận gợi ý của bot | `register` |
| UC-S06 | Hỏi thông tin chatbot | "Em có thể hỏi gì?", "Bạn là ai?" | `greeting` |
| UC-S07 | Câu hỏi ngoài phạm vi | Câu hỏi không liên quan đến CTXH | `out_of_scope` |
| UC-S08 | Tìm hoạt động theo khoa | Ưu tiên hiển thị hoạt động của khoa sinh viên đang học | `search` + org injection |
| UC-S09 | Xem chi tiết hoạt động | Hỏi thêm về hoạt động đã đề cập trong hội thoại | `search` với context memory |

### 3.2 Use Case dành cho Cán bộ (Staff)

| ID | Use Case | Mô tả | Tool sử dụng |
|---|---|---|---|
| UC-T01 | Xem hoạt động chờ duyệt | "Có sinh viên nào đang chờ duyệt không?" | `get_pending_overview` |
| UC-T02 | Xem danh sách sinh viên PENDING | Lấy DS sinh viên chờ duyệt của 1 hoạt động | `get_pending_participants` |
| UC-T03 | Xem danh sách đã duyệt | Lấy DS sinh viên APPROVED của 1 hoạt động | `get_approved_participants` |
| UC-T04 | Duyệt đăng ký và gửi email | Duyệt một hoặc nhiều sinh viên, tự động gửi email | `approve_and_notify` |
| UC-T05 | Từ chối đăng ký | Từ chối với lý do, gửi email thông báo | `reject_registration` |
| UC-T06 | Tạo 1 hoạt động mới | Điền đầy đủ thông tin, xác nhận trước khi tạo | `create_activity` |
| UC-T07 | Tạo nhiều hoạt động | Tạo 2–3 hoạt động cùng lúc | `batch_create_activities` |
| UC-T08 | Cập nhật hoạt động | Chỉnh sửa thông tin, đổi trạng thái, xóa mềm | `manage_activity` |
| UC-T09 | Gửi email thông báo chung | Thông báo đến tất cả sinh viên đã đăng ký | `send_notification_email` |
| UC-T10 | Tìm kiếm hoạt động | Tìm theo từ khóa, trạng thái, ngày | `search_activities` |
| UC-T11 | Tra cứu danh mục | Tìm đúng tên danh mục trong hệ thống | `lookup_category` |
| UC-T12 | Tra cứu tổ chức | Tìm đúng tên tổ chức/khoa trong hệ thống | `lookup_organization` |
| UC-T13 | Truy vấn SQL trực tiếp | Câu hỏi phức tạp, cán bộ muốn số liệu thống kê | PostgresMCP tools |

---

## 4. Luồng sinh viên (Student Flow)

### 4.1 Sequence Diagram — Student Chat

```plantuml
@startuml Student_Chat_Sequence
title UC-S01..S09: Luồng xử lý tin nhắn của Sinh viên

actor "Sinh viên" as S
participant "Chatbot CTXH" as Bot
participant "Kho dữ liệu CTXH" as Data
participant "Hệ thống đăng ký" as Reg

S -> Bot: Gửi tin nhắn

Bot -> Bot: Xác thực người dùng và kiểm tra giới hạn tần suất

alt Vượt giới hạn tần suất
  Bot --> S: Thông báo quá tải, yêu cầu thử lại sau
else Trong giới hạn
  Bot -> Bot: Tải lịch sử hội thoại\nvà xác định khoa đào tạo của sinh viên
  Bot -> Bot: Phân tích ý định tin nhắn

  alt Chào hỏi / hỏi về tính năng chatbot
    Bot --> S: Giới thiệu phạm vi hỗ trợ của chatbot
  else Câu hỏi ngoài phạm vi CTXH
    Bot --> S: Từ chối lịch sự, gợi ý các chủ đề có thể hỗ trợ
  else Tra cứu hoạt động CTXH
    Bot -> Data: Tìm kiếm hoạt động phù hợp yêu cầu
    Data --> Bot: Kết quả tìm kiếm
    Bot -> Bot: Tổng hợp kết quả\nƯu tiên hoạt động theo khoa của sinh viên (nếu có)
    Bot --> S: Câu trả lời kèm nguồn thông tin\nvà 3 câu hỏi gợi ý tiếp theo
  else Đăng ký hoạt động
    Bot -> Data: Xác định hoạt động cần đăng ký
    Data --> Bot: Thông tin xác nhận hoạt động
    Bot -> Reg: Thực hiện đăng ký cho sinh viên
    Reg --> Bot: Kết quả (thành công / lý do thất bại)
    Bot --> S: Thông báo kết quả đăng ký\nvà 3 câu hỏi gợi ý tiếp theo
  end

  Bot -> Bot: Lưu lịch sử hội thoại
end

@enduml
```

---

### 4.2 Activity Diagram — Student RAG Pipeline

```plantuml
@startuml Student_RAG_Activity
title Luồng xử lý truy vấn của Sinh viên

start

:Nhận tin nhắn từ sinh viên;
:Xác thực người dùng và kiểm tra giới hạn tần suất;

if (Vượt giới hạn?) then (yes)
  :Trả thông báo từ chối;
  stop
endif

:Tải lịch sử hội thoại và thông tin khoa của sinh viên;
:Phân tích ý định và tham số tìm kiếm;

switch (Ý định)
case (Chào hỏi / hỏi tính năng)
  :Trả lời trực tiếp, không tra cứu dữ liệu;
case (Ngoài phạm vi CTXH)
  :Từ chối lịch sự, không tra cứu dữ liệu;
case (Đăng ký hoạt động)
  :Tìm kiếm để xác định hoạt động mục tiêu;
  :Tổng hợp câu trả lời xác nhận;
  :Thực hiện đăng ký (ghi nhận trạng thái chờ duyệt);
case (Tra cứu hoạt động)
  if (Có bộ lọc cụ thể?) then (yes)
    :Tìm kiếm kết hợp bộ lọc và ngữ nghĩa;
  else (no)
    if (Muốn xem toàn bộ danh sách?) then (yes)
      :Truy xuất toàn bộ danh sách hoạt động;
    else (no)
      if (Muốn kết quả đa dạng?) then (yes)
        :Tìm kiếm đa dạng hóa kết quả;
      else
        :Tìm kiếm theo ngữ nghĩa;
      endif
    endif
  endif

  if (Không có kết quả?) then (yes)
    :Thử phương án tìm kiếm dự phòng;
    if (Vẫn không có kết quả?) then (yes)
      :Thông báo không tìm thấy;
    endif
  endif

  if (Sinh viên có khoa và chưa lọc theo tổ chức?) then (yes)
    :Tìm thêm hoạt động của khoa và ưu tiên hiển thị;
  endif

  :Tổng hợp câu trả lời kèm nguồn thông tin;
endswitch

:Lưu hội thoại vào bộ nhớ phiên;
:Sinh 3 câu hỏi gợi ý tiếp theo;
:Trả kết quả cho người dùng;

stop

@enduml
```

---

### 4.3 Sequence Diagram — Student Đăng ký hoạt động qua chat

```plantuml
@startuml Student_Register_Sequence
title UC-S05: Sinh viên đăng ký hoạt động qua chatbot

actor "Sinh viên" as S
participant "Chatbot CTXH" as Bot
participant "Kho dữ liệu CTXH" as Data
participant "Hệ thống đăng ký" as Reg

== Lượt 1: Tìm hiểu hoạt động ==
S -> Bot: "Hoạt động tình nguyện mùa hè có gì không?"
Bot -> Data: Tìm kiếm hoạt động tình nguyện mùa hè
Data --> Bot: Kết quả: "Tình nguyện mùa hè xanh — đang tuyển thành viên"
Bot --> S: Giới thiệu hoạt động và hỏi sinh viên có muốn đăng ký không

== Lượt 2: Sinh viên xác nhận đăng ký ==
S -> Bot: "Có, đăng ký giúp tôi với"
Bot -> Data: Xác nhận thông tin hoạt động cần đăng ký
Data --> Bot: Thông tin hoạt động đã xác nhận
Bot -> Reg: Thực hiện đăng ký cho sinh viên

alt Đăng ký thành công
  Reg --> Bot: Thành công — trạng thái: chờ duyệt
  Bot --> S: Xác nhận đăng ký thành công\nHướng dẫn theo dõi tiến độ xét duyệt
else Không thể đăng ký
  Reg --> Bot: Lý do từ chối (đã đăng ký / hết chỗ / đã kết thúc tuyển)
  Bot --> S: Thông báo không thể đăng ký kèm lý do cụ thể
end

@enduml
```

---

## 5. Luồng cán bộ (Staff Flow)

### 5.1 Sequence Diagram — Staff Agent Chat

```plantuml
@startuml Staff_Chat_Sequence
title Luồng tổng quát: Cán bộ gửi tin nhắn

actor "Cán bộ" as Staff
participant "Chatbot CTXH\n(Agent)" as Bot
participant "Cơ sở dữ liệu CTXH" as DB
participant "Dịch vụ email" as Mail

Staff -> Bot: Gửi yêu cầu

Bot -> Bot: Xác thực người dùng\nvà tải lịch sử hội thoại

loop Vòng lặp suy luận (tối đa 10 lần)
  Bot -> Bot: Phân tích yêu cầu và lựa chọn hành động tiếp theo

  alt Đã có câu trả lời đầy đủ
    Bot -> Bot: Kết thúc vòng lặp
  else Cần tra cứu dữ liệu
    Bot -> DB: Tìm kiếm hoặc truy vấn thông tin
    DB --> Bot: Kết quả tra cứu
  else Cần thao tác dữ liệu (duyệt / từ chối / tạo mới / cập nhật)
    Bot -> Bot: Kiểm tra quyền thao tác
    Bot -> DB: Thực hiện thay đổi dữ liệu
    DB --> Bot: Xác nhận kết quả
    alt Có gửi email thông báo
      Bot -> Mail: Gửi email đến sinh viên liên quan
      Mail --> Bot: Xác nhận đã gửi
    end
  end
end

Bot -> Bot: Lưu lịch sử hội thoại
Bot --> Staff: Phản hồi kết quả

@enduml
```

---

### 5.2 Activity Diagram — Staff Tool Execution

```plantuml
@startuml Staff_Tool_Activity
title Luồng thực thi yêu cầu của Cán bộ

start

:Nhận tin nhắn từ cán bộ;
:Xác thực người dùng và kiểm tra giới hạn tần suất;
:Tải lịch sử hội thoại;

repeat
  :Phân tích yêu cầu và quyết định hành động tiếp theo;

  if (Đã có câu trả lời hoàn chỉnh?) then (yes)
    break
  endif

  switch (Loại hành động)
  case (Tìm kiếm / xem thông tin)
    :Tra cứu dữ liệu hoạt động hoặc danh sách đăng ký;
    :Lưu kết quả vào bộ nhớ phiên để dùng cho lượt sau;
  case (Duyệt hoặc từ chối đăng ký)
    :Kiểm tra quyền thao tác;
    if (Có quyền?) then (yes)
      :Cập nhật trạng thái đăng ký;
      :Gửi email thông báo kết quả đến sinh viên;
    else
      :Thông báo không có quyền thực hiện;
    endif
  case (Tạo hoặc cập nhật hoạt động)
    :Kiểm tra tên danh mục và tổ chức hợp lệ;
    if (Đủ thông tin?) then (yes)
      :Tạo mới hoặc cập nhật hoạt động;
      :Kích hoạt đồng bộ kho tìm kiếm;
    else
      :Yêu cầu bổ sung thông tin còn thiếu;
    endif
  case (Gửi email thông báo chung)
    :Lấy danh sách sinh viên đã đăng ký;
    :Gửi email hàng loạt;
  endswitch

repeat while (Chưa hoàn thành và chưa đạt giới hạn vòng lặp?) is (yes)

:Lưu lịch sử hội thoại;
:Trả kết quả cho cán bộ;

stop

@enduml
```

---

### 5.3 Sequence Diagram — Duyệt đăng ký qua chat

```plantuml
@startuml Staff_Approve_Sequence
title UC-T04: Cán bộ duyệt đăng ký qua chatbot

actor "Cán bộ" as Staff
participant "Chatbot CTXH\n(Agent)" as Bot
participant "Dữ liệu đăng ký" as Data
participant "Dịch vụ email" as Mail

== Lượt 1: Hỏi tổng quan ==
Staff -> Bot: "Có sinh viên nào đang chờ duyệt không?"
Bot -> Data: Lấy danh sách hoạt động có đăng ký chờ duyệt
Data --> Bot: Danh sách hoạt động kèm số lượng chờ duyệt
Bot --> Staff: "Có 2 hoạt động đang chờ duyệt:\n1. Tình nguyện mùa hè (3 SV)\n2. Hiến máu tháng 5 (1 SV)"

== Lượt 2: Xem danh sách chi tiết ==
Staff -> Bot: "Cho tôi xem danh sách sinh viên của hoạt động 1"
note right of Bot
  Chatbot dùng ngữ cảnh từ lượt trước
  để xác định hoạt động mà không cần tìm lại
end note
Bot -> Data: Lấy danh sách sinh viên chờ duyệt của hoạt động 1
Data --> Bot: Danh sách sinh viên kèm thông tin cơ bản
Bot --> Staff: Hiển thị danh sách 3 sinh viên chờ duyệt

== Lượt 3: Duyệt tất cả ==
Staff -> Bot: "Duyệt tất cả đi"
Bot -> Data: Cập nhật trạng thái 3 đăng ký thành đã duyệt
Data --> Bot: Xác nhận 3 đăng ký đã được duyệt
Bot -> Mail: Gửi email xác nhận đến 3 sinh viên
Mail --> Bot: Đã gửi 3 email thành công
Bot --> Staff: "Đã duyệt thành công 3 sinh viên và gửi email xác nhận."

@enduml
```

---

### 5.4 Sequence Diagram — Tạo hoạt động qua chat

```plantuml
@startuml Staff_Create_Activity_Sequence
title UC-T06: Cán bộ tạo hoạt động CTXH qua chatbot

actor "Cán bộ" as Staff
participant "Chatbot CTXH\n(Agent)" as Bot
participant "Hệ thống CTXH" as Sys

== Bước 1: Cung cấp thông tin ==
Staff -> Bot: Yêu cầu tạo hoạt động kèm thông tin\n(tên, thời gian, địa điểm, danh mục, tổ chức)

Bot -> Sys: Tra cứu tên tổ chức hợp lệ trong hệ thống
Sys --> Bot: Tên chính xác của tổ chức
Bot -> Sys: Tra cứu tên danh mục hợp lệ trong hệ thống
Sys --> Bot: Tên chính xác của danh mục

== Bước 2: Xác nhận thông tin ==
Bot --> Staff: Trình bày lại toàn bộ thông tin đã tổng hợp\nvà yêu cầu cán bộ xác nhận trước khi tạo

== Bước 3: Tạo hoạt động ==
Staff -> Bot: Xác nhận tạo
Bot -> Sys: Lưu hoạt động mới vào hệ thống
Sys --> Bot: Hoạt động đã được tạo thành công
Sys -> Sys: Tự động cập nhật kho dữ liệu tìm kiếm
Bot --> Staff: Xác nhận tạo thành công kèm thông tin tóm tắt

@enduml
```

---

## 6. Luồng dữ liệu Ingestion (Vector Sync)

### 6.1 Sequence Diagram — Ingestion Pipeline

```plantuml
@startuml Ingestion_Pipeline_Sequence
title Luồng đồng bộ kho tìm kiếm khi hoạt động thay đổi

participant "Hệ thống CTXH" as Sys
participant "Hàng đợi đồng bộ" as Q
participant "Bộ xử lý Vector" as Proc
participant "Mô hình Embedding" as EM
database "Kho tìm kiếm\n(Vector Store)" as VS

note over Sys, VS
  Kích hoạt khi: Hoạt động được tạo mới / cập nhật / xóa / khôi phục
end note

Sys -> Q: Đẩy yêu cầu đồng bộ vào hàng đợi
note right of Q
  Thử lại tự động tối đa 3 lần\nnếu xử lý thất bại
end note

Q -> Proc: Xử lý yêu cầu đồng bộ

alt Thêm mới hoặc cập nhật
  Proc -> Sys: Lấy thông tin đầy đủ của hoạt động
  Sys --> Proc: Dữ liệu hoạt động (tên, mô tả, tổ chức, danh mục, thời gian)
  Proc -> EM: Tạo vector biểu diễn nội dung hoạt động
  EM --> Proc: Vector embedding
  Proc -> VS: Lưu hoặc cập nhật bản ghi tìm kiếm
else Xóa
  Proc -> VS: Xóa bản ghi tìm kiếm của hoạt động
end

VS --> Proc: Xác nhận hoàn tất
Proc --> Q: Tác vụ hoàn thành

note over Sys, VS
  Cơ chế an toàn định kỳ:
  • Mỗi 30 phút: kiểm tra và bù đồng bộ các hoạt động còn thiếu
  • Khi khởi động hệ thống: đồng bộ toàn bộ dữ liệu
end note

@enduml
```

---

## 7. Luồng xử lý Agent Decision

### 7.1 Activity Diagram — Agent Decision

```plantuml
@startuml Agent_Decision_Activity
title Quy trình nhận diện ý định và phân luồng (Sinh viên)

start

:Nhận câu hỏi và lịch sử hội thoại;
:Phân tích ý định bằng AI\n(tham chiếu ngày hiện tại và ngữ cảnh hội thoại);

if (Nhận diện được ý định?) then (no)
  :Phân loại là ngoài phạm vi;
  stop
endif

switch (Ý định)
case (Tra cứu hoạt động)
  :Xác định phương thức tìm kiếm phù hợp;

  switch (Phương thức tìm kiếm)
  case (Có bộ lọc cụ thể)
    note right: Lọc theo thời gian, tổ chức,\ntrạng thái, địa điểm
  case (Câu hỏi ngữ nghĩa)
    note right: Không có bộ lọc cụ thể
  case (Muốn kết quả đa dạng)
    note right: Yêu cầu nhiều loại khác nhau
  case (Liệt kê tất cả)
    note right: Muốn xem toàn bộ danh sách
  endswitch

  :Trả hành động: Tra cứu với phương thức và tham số phù hợp;

case (Đăng ký hoạt động)
  :Xác định hoạt động cần đăng ký từ ngữ cảnh hội thoại;
  :Trả hành động: Đăng ký;

case (Chào hỏi / hỏi tính năng)
  :Trả hành động: Chào hỏi;

case (Ngoài phạm vi CTXH)
  :Trả hành động: Từ chối;
endswitch

stop

@enduml
```

---

## 8. Cơ chế Session Memory

```
┌─────────────────────────────────────────────────────────────────────┐
│                  LangChainMemoryService                             │
│                                                                     │
│  Map<sessionId, MemoryEntry>                                        │
│                                                                     │
│  MemoryEntry {                                                      │
│    memory: BufferMemory              — LangChain conversation buffer│
│    history: InMemoryChatMessageHistory                              │
│    lastAccessed: Date                — cập nhật mỗi lần truy cập   │
│    turnCount: number                 — số lượt hội thoại            │
│    recentMentionedActivities: [      — sliding window activities    │
│      {turnIndex, activities: [{activityId, activityName,           │
│                                isRecruiting}]}                      │
│    ]                                                                │
│    pendingRegistration?: {           — chờ xác nhận đăng ký        │
│      activityId, activityName                                       │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  Config:                                                            │
│  • maxMemories: 1000 sessions                                       │
│  • memoryTTL: 30 phút (1800000 ms)                                  │
│  • maxMessagesPerSession: 20 tin nhắn                               │
│  • Cleanup interval: mỗi 5 phút                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Sequence: Session Lifecycle**

```plantuml
@startuml Session_Lifecycle
title Vòng đời phiên hội thoại

actor "Người dùng" as U
participant "Chatbot CTXH" as Bot
participant "Bộ nhớ phiên" as Mem

U -> Bot: Gửi tin nhắn (lần đầu hoặc tiếp theo)

Bot -> Mem: Lấy lịch sử hội thoại theo mã phiên
alt Phiên chưa tồn tại
  Mem -> Mem: Khởi tạo phiên mới (lịch sử trống)
  Mem --> Bot: Phiên mới
else Phiên đã tồn tại
  Mem --> Bot: Lịch sử hội thoại trước đó
end

Bot -> Bot: Xử lý tin nhắn với ngữ cảnh từ lịch sử

Bot -> Mem: Lưu lượt hội thoại mới (câu hỏi + câu trả lời)
Mem -> Mem: Cập nhật thời điểm truy cập gần nhất

note right of Mem
  Giới hạn phiên:
  • Lưu tối đa 20 tin nhắn mỗi phiên
  • Phiên hết hạn sau 30 phút không hoạt động
  • Tự động dọn dẹp mỗi 5 phút
end note

Bot --> U: Trả lời

@enduml
```

---

## 9. Rate Limiting & Bảo mật

```
┌──────────────────────────────────────────────────────────────┐
│               RateLimitInterceptor (Redis)                   │
│                                                              │
│  Key: rate_limit:{userId | IP}                               │
│  Limit: 30 requests / 60 seconds                            │
│                                                              │
│  Khi request đến:                                            │
│  1. Lấy count từ Redis                                       │
│  2. count >= 30 → 429 Too Many Requests + retryAfter (TTL)  │
│  3. count < 30 → INCR + EXPIRE (60s) → tiếp tục            │
│                                                              │
│  Bảo mật:                                                    │
│  • JwtAuthGuard — xác thực mọi request                      │
│  • checkCtxhPermission — validate staff actions              │
│  • SQL inputs qua parameterized queries (TypeORM)            │
│  • Rate limit ngăn LLM abuse                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Tóm tắt các thành phần chính

| Thành phần | File | Vai trò |
|---|---|---|
| `CtxhChatController` | `controllers/ctxh-chat.controller.ts` | Entry point, phân luồng student/staff |
| `LangChainRagChainService` | `services/langchain-rag-chain.service.ts` | Orchestration RAG cho student |
| `CtxhAgentService` | `services/ctxh-agent.service.ts` | Single LLM call: quyết định action/tool |
| `StaffAgentService` | `services/staff-agent.service.ts` | ReAct loop với 12 tools cho cán bộ |
| `LangChainVectorStoreService` | `services/langchain-vector-store.service.ts` | Wrapper pgVector: similarity, MMR, filtered search |
| `McpSqlFallbackService` | `services/mcp-sql-fallback.service.ts` | Fallback SQL khi vector search trả 0 kết quả |
| `McpMetadataEnricherService` | `services/mcp-metadata-enricher.service.ts` | Enrich metadata từ DB (số đăng ký, trạng thái real-time) |
| `LangChainMemoryService` | `services/langchain-memory.service.ts` | Session memory in-memory (TTL 30 phút) |
| `CtxhVectorSyncService` | `services/ctxh-vector-sync.service.ts` | Event bridge → BullMQ jobs khi activity thay đổi |
| `LangChainIngestionService` | `services/langchain-ingestion.service.ts` | Tạo embedding và upsert vào ctxh_embeddings |
| `VectorIngestionProcessor` | `processors/vector-ingestion.processor.ts` | BullMQ consumer xử lý embedding jobs |
| `FollowUpSuggestionsService` | `services/follow-up-suggestions.service.ts` | Sinh 3 câu gợi ý tiếp theo cho student |
| `UserContextService` | `services/user-context.service.ts` | Lấy tên khoa đào tạo của sinh viên |
| `PostgresMcpClientService` | `services/postgres-mcp-client.service.ts` | MCP client giao tiếp với Postgres MCP server |
| `RateLimitInterceptor` | `interceptors/rate-limit.interceptor.ts` | 30 req/60s per user/IP via Redis |
| `UniversalEmbeddingsService` | `services/universal-embeddings.service.ts` | Tự động chọn Ollama hay Gemini embedding |
| `UniversalLLMService` | `services/universal-llm.service.ts` | Tự động chọn Ollama hay Gemini LLM |

### Tóm tắt số lần gọi LLM mỗi tin nhắn

| Vai trò | Tình huống | Số LLM calls |
|---|---|---|
| **Student** | Greeting / Out-of-scope | 1 (Agent only) |
| **Student** | RAG query thông thường | 2 (Agent + Generation) |
| **Student** | RAG query + Follow-up | 3 (Agent + Generation + FollowUp) |
| **Student** | Đăng ký + Follow-up | 3 (Agent + Generation + FollowUp) |
| **Staff** | Câu trả lời đơn giản | 2 (1 vòng loop) |
| **Staff** | Duyệt đăng ký (có tool calls) | 3–5 (N vòng loop) |
| **Staff** | Tạo hoạt động (lookup + confirm + create) | 4–7 (N vòng loop) |

---

*Tài liệu được tổng hợp từ source code `backend/src/ctxh-chat/` — cập nhật lần cuối: 30/04/2026*
