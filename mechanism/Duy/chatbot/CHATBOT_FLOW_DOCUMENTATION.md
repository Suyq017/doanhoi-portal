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
title UC-S01..S09: Sinh viên gửi tin nhắn đến chatbot

actor "Sinh viên" as Student
participant "Frontend\n(React)" as FE
participant "CtxhChatController" as Ctrl
participant "JwtAuthGuard" as Auth
participant "RateLimitInterceptor" as RL
participant "UserContextService" as UC
participant "CtxhAgentService\n(LLM Call #1)" as Agent
participant "LangChainRagChainService" as RAG
participant "LangChainVectorStoreService\n(pgVector)" as VS
participant "McpSqlFallbackService" as Fallback
participant "LangChainMemoryService" as Mem
participant "LLM Generator\n(LLM Call #2)" as LLM
participant "FollowUpSuggestionsService\n(LLM Call #3)" as FUS
participant "ParticipationService" as PS
database "PostgreSQL\n+ pgVector" as DB

Student -> FE: Nhập tin nhắn
FE -> Ctrl: POST /ctxh-chat/message\n{message, sessionId}

Ctrl -> Auth: Xác thực JWT
Auth --> Ctrl: userId, userType='student'

Ctrl -> RL: Kiểm tra rate limit (Redis)
alt Vượt quá 30 req/60s
  RL --> FE: 429 Too Many Requests
else Trong hạn
  RL --> Ctrl: OK
end

Ctrl -> UC: getTrainingDepartmentName(userId)
UC -> DB: SELECT department from users
UC --> Ctrl: userOrgName (e.g. "Khoa Khoa học và Kỹ thuật Máy tính")

Ctrl -> RAG: invoke(message, sessionId, options)

RAG -> Mem: getMessages(sessionId)
Mem --> RAG: chatHistory

RAG -> Agent: decide(question, chatHistory, currentDate)
note right of Agent
  Gọi LLM với 3 tools:
  • search_ctxh_activities
  • register_for_activity
  • respond_general
end note
Agent --> RAG: AgentDecision {action, params}

alt action = 'greeting'
  RAG --> Ctrl: GREETING_RESPONSE (static)
else action = 'out_of_scope'
  RAG --> Ctrl: CHITCHAT_REJECTION (static)
else action = 'register'
  RAG -> VS: similaritySearch(activityContext)
  VS -> DB: SELECT ... ORDER BY embedding <=> query_vec LIMIT 5
  VS --> RAG: [Documents]
  RAG -> LLM: invoke(RAG_PROMPT + context + chatHistory)
  LLM --> RAG: response text
else action = 'search'
  RAG -> RAG: executeSearchDecision(params)

  alt mode = 'list_all'
    RAG -> Fallback: listActivities(statusHint)
    Fallback -> DB: SQL (no embedding)
    Fallback --> RAG: [Documents]
  else mode = 'diverse'
    RAG -> VS: maxMarginalRelevanceSearch(query, k=5)
    VS -> DB: MMR query
    VS --> RAG: [Documents]
  else mode = 'semantic'
    RAG -> VS: similaritySearchWithDateFilter(query, k=5)
    VS -> DB: cosine similarity query
    VS --> RAG: [Documents]
  else mode = 'filtered'
    RAG -> VS: similaritySearchWithFilters(query, filters, k=5)
    VS -> DB: SQL WHERE + ORDER BY embedding <=> vec
    VS --> RAG: [Documents]
  end

  alt results = 0 (Fallback)
    RAG -> Fallback: fallbackSearch(statusHint, filters)
    Fallback -> DB: SQL thuần (no embedding)
    Fallback --> RAG: [Documents]
  end

  alt userOrg != null AND organizationName not specified
    note right of RAG
      Org Injection:
      Run parallel search với org filter
      Merge + ưu tiên kết quả theo khoa
    end note
    RAG -> VS: search với orgFilter (parallel)
    VS --> RAG: [OrgDocuments]
    RAG -> RAG: mergeAndPrioritize([Documents], [OrgDocuments])
  end

  RAG -> RAG: enrichContext(documents, currentDate)
  note right of RAG
    • Chuyển múi giờ GMT+7
    • Tính trạng thái real-time
    • Cộng điểm ưu tiên hôm nay
  end note

  RAG -> Mem: getMessages(sessionId)
  RAG -> LLM: invoke(CTXH_RAG_PROMPT + context + chatHistory)
  LLM --> RAG: response text
end

RAG -> Mem: addMessages(sessionId, [HumanMsg, AIMsg])
RAG --> Ctrl: RAGResponse {response, sources, intent, registrationTarget}

par Post-processing
  Ctrl -> FUS: generate(message, response)
  FUS --> Ctrl: [suggestion1, suggestion2, suggestion3]
  
  alt intent = 'REGISTER_ACTIVITY' AND registrationTarget exists
    Ctrl -> PS: registerSelf(activityId, userId)
    PS -> DB: INSERT ctxh_participation
    PS --> Ctrl: success / error
  end
end

Ctrl --> FE: ChatResponseDto\n{sessionId, response, sources, followUpSuggestions,\n confidence, responseTime, timestamp}
FE --> Student: Hiển thị câu trả lời + gợi ý

@enduml
```

---

### 4.2 Activity Diagram — Student RAG Pipeline

```plantuml
@startuml Student_RAG_Activity
title Luồng xử lý RAG cho Sinh viên

start

:Nhận tin nhắn từ sinh viên;
:Xác thực JWT + Rate Limit check;

if (Vượt rate limit?) then (yes)
  :Trả lỗi 429;
  stop
endif

:Lấy tên khoa của sinh viên (UserContextService);
:Lấy chat history từ MemoryService;

:Gọi CtxhAgentService — LLM Call #1\n(Tool-calling: chọn 1 trong 3 tools);

fork
  :Phân tích ngữ nghĩa câu hỏi;
  :Quyết định tool & params;
fork again
  :Tính ngày giờ Việt Nam;
end fork

switch (Action được LLM chọn)
case (greeting)
  :Trả GREETING_RESPONSE (static)\nkhông gọi LLM thêm;
case (out_of_scope)
  :Trả CHITCHAT_REJECTION (static)\nkhông gọi LLM thêm;
case (register)
  :Tìm kiếm vector để xác định hoạt động;
  :Sinh câu trả lời bằng LLM (Call #2);
case (search)
  switch (Search mode)
  case (list_all)
    :SQL thuần — liệt kê tất cả\n(không dùng embedding);
  case (diverse)
    :MMR Search\n(Maximum Marginal Relevance);
  case (semantic)
    :Vector Similarity Search\n(cosine distance);
  case (filtered)
    :SQL WHERE + Vector Similarity\n(hybrid search);
  endswitch

  if (Kết quả = 0?) then (yes)
    :McpSqlFallback — SQL thuần;
    if (Vẫn = 0?) then (yes)
      :Thông báo không tìm thấy;
    endif
  endif

  if (Có userOrg AND không chỉ định tổ chức?) then (yes)
    :Org Injection — tìm song song theo khoa;
    :Merge + ưu tiên hoạt động khoa;
  endif

  :Enrich context (múi giờ, trạng thái, điểm ưu tiên);
  :LLM Generation — Call #2\n(CTXH_RAG_PROMPT + context + history);
endswitch

:Lưu messages vào MemoryService;

fork
  :FollowUpSuggestionsService — LLM Call #3\n(sinh 3 câu gợi ý);
fork again
  if (intent = REGISTER_ACTIVITY?) then (yes)
    :ParticipationService.registerSelf();
    :Cập nhật response text;
  endif
end fork

:Tính confidence score\n(0 nguồn→0.3, 1-2→0.5-0.7, ≥3→0.9);
:Trả ChatResponseDto;

stop

@enduml
```

---

### 4.3 Sequence Diagram — Student Đăng ký hoạt động qua chat

```plantuml
@startuml Student_Register_Sequence
title UC-S05: Sinh viên đăng ký hoạt động qua chatbot

actor "Sinh viên" as S
participant "Controller" as C
participant "CtxhAgentService" as Agent
participant "LangChainRagChainService" as RAG
participant "LangChainVectorStoreService" as VS
participant "LangChainMemoryService" as Mem
participant "LLM" as LLM
participant "ParticipationService" as PS
database "PostgreSQL" as DB

== Lượt 1: Sinh viên hỏi về hoạt động ==
S -> C: "Hoạt động tình nguyện mùa hè có gì không?"
C -> Agent: decide(question, history)
Agent --> C: {action:'search', params:{mode:'semantic'}}
C -> VS: similaritySearch("tình nguyện mùa hè")
VS --> C: [doc: "Tình nguyện mùa hè xanh — đang tuyển"]
C -> LLM: generate(RAG_PROMPT + docs)
LLM --> C: "Có hoạt động Tình nguyện mùa hè xanh đang tuyển thành viên...\nBạn có muốn đăng ký không?"
C -> Mem: save(turn1)
C --> S: response + followUpSuggestions

== Lượt 2: Sinh viên xác nhận đăng ký ==
S -> C: "Có, đăng ký giúp tôi với"
C -> Agent: decide("Có, đăng ký giúp tôi với", history_with_activity)
note right of Agent
  LLM chọn tool register_for_activity
  với activityContext từ history
end note
Agent --> C: {action:'register', params:{activityContext:'Tình nguyện mùa hè xanh', activityId: null}}

C -> VS: similaritySearch(activityContext, k=1)
VS --> C: [{metadata: {activityId: 'uuid-123', activityName: 'Tình nguyện mùa hè xanh'}}]
C -> LLM: generate(REGISTER_CONFIRM_PROMPT + activityInfo)
LLM --> C: "Đã ghi nhận yêu cầu đăng ký..."
C -> Mem: save(turn2)

== Post-processing: Thực hiện đăng ký ==
C -> PS: registerSelf('uuid-123', userId)
PS -> DB: INSERT ctxh_participation\n(student_id, activity_id, status='PENDING')
alt Thành công
  PS --> C: OK
  C --> S: "Đã đăng ký thành công vào **Tình nguyện mùa hè xanh**!\nBạn có thể xem tại trang báo cáo cá nhân."
else Thất bại (đã đăng ký / đã kết thúc / ...)
  PS --> C: Error {message}
  C --> S: "Không thể đăng ký: {message}"
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
participant "Controller" as C
participant "JwtAuthGuard" as Auth
participant "StaffAgentService" as SA
participant "LangChainMemoryService" as Mem
participant "LLM (ReAct)" as LLM
participant "ToolExecutor" as TE
participant "ActivitiesService" as AS
participant "ParticipationService" as PS
participant "NodemailerService" as Mail
participant "PostgresMcpClient" as MCP
database "PostgreSQL" as DB

Staff -> C: POST /ctxh-chat/message\n{message}
C -> Auth: Verify JWT
Auth --> C: userId, userType='staff'

C -> SA: invoke(message, sessionId, userId, {currentDate})

SA -> Mem: getMessages(sessionId)
Mem --> SA: historyMessages

SA -> SA: buildTools(userId, sessionId)\n(12 custom tools + MCP tools)
SA -> SA: buildSystemPrompt(currentDate, cachedActivities)

loop ReAct loop (tối đa 10 vòng)
  SA -> LLM: invoke([SystemMessage, ...history, HumanMessage])
  
  alt LLM không gọi tool (đã có câu trả lời)
    LLM --> SA: AIMessage {text: finalAnswer}
    SA -> SA: break loop
  else LLM gọi tool(s)
    LLM --> SA: AIMessage {tool_calls: [{name, args}]}
    
    loop Với mỗi tool_call
      SA -> TE: execute(toolName, args)
      
      switch (toolName)
      case (search_activities)
        TE -> AS: findAll({keyword, status, ongoing_only, limit})
        AS -> DB: SELECT + LEFT JOIN
        AS --> TE: {found, activities[]}
      case (get_pending_participants)
        TE -> PS: findPendingByActivity(activityId)
        PS -> DB: SELECT WHERE status='PENDING'
        PS --> TE: participants[]
      case (get_approved_participants)
        TE -> PS: findApprovedByActivity(activityId)
        PS --> TE: participants[]
      case (approve_and_notify)
        TE -> PS: approveParticipation(ids)
        PS -> DB: UPDATE status='APPROVED'
        TE -> Mail: sendApprovalEmail(student, activity)
        Mail --> TE: sent
      case (reject_registration)
        TE -> PS: rejectParticipation(ids, reason)
        PS -> DB: UPDATE status='REJECTED'
        TE -> Mail: sendRejectionEmail(student, activity, reason)
        Mail --> TE: sent
      case (create_activity)
        TE -> AS: create(activityData)
        AS -> DB: INSERT ctxh_activity
        AS --> TE: newActivity
      case (batch_create_activities)
        TE -> AS: bulkCreate(activities[])
        AS -> DB: INSERT (batch)
        AS --> TE: results[]
      case (manage_activity)
        TE -> AS: update(id, changes)
        AS -> DB: UPDATE ctxh_activity
        AS --> TE: updatedActivity
      case (send_notification_email)
        TE -> PS: findAllParticipants(activityId)
        PS --> TE: participants[]
        TE -> Mail: sendBulkEmail(participants, subject, content)
        Mail --> TE: sent count
      case (get_pending_overview)
        TE -> DB: SQL: SELECT activities with PENDING count
        TE -> SA: sessionActivityCache.set(sessionId, results)
        TE --> SA: overview[]
      case (lookup_category / lookup_organization)
        TE -> DB: SELECT WHERE name ILIKE '%keyword%'
        TE --> SA: matches[]
      case (MCP tools)
        TE -> MCP: callTool(name, args)
        MCP -> DB: SQL query
        MCP --> TE: result
      endswitch
      
      SA -> SA: messages.push(ToolMessage {result})
    end
  end
end

SA -> Mem: addMessages(sessionId, newMessages)
SA --> C: finalText

C --> Staff: {response: finalText, sources:[], confidence:0.9}

@enduml
```

---

### 5.2 Activity Diagram — Staff Tool Execution

```plantuml
@startuml Staff_Tool_Activity
title Luồng thực thi tool của Staff Agent

start

:Nhận tin nhắn từ cán bộ;
:Xác thực JWT + Rate Limit;
:Load chat history (MemoryService);
:Build System Prompt\n(currentDate + cachedActivities);
:Bind 12 tools + MCP tools vào LLM;

repeat
  :Gọi LLM;
  
  if (LLM trả lời thuần văn bản\n(không có tool call)?) then (yes)
    :Ghi nhận câu trả lời cuối;
    break
  endif
  
  :Trích xuất tool_calls[];
  
  while (còn tool call?) is (yes)
    switch (Loại tool)
    case (Tìm kiếm)
      :search_activities hoặc get_pending_overview;
      :Query PostgreSQL;
      if (là get_pending_overview?) then (yes)
        :Cache kết quả vào sessionActivityCache;
      endif
    case (Xem sinh viên)
      :get_pending_participants hoặc get_approved_participants;
      :Query ctxh_participation;
    case (Hành động duyệt/từ chối)
      :Validate permission (checkCtxhPermission);
      if (Có quyền?) then (yes)
        :approve_and_notify / reject_registration;
        :UPDATE ctxh_participation;
        :Gửi email xác nhận qua NodemailerService;
      else
        :Trả lỗi "Không có quyền";
      endif
    case (Tạo/Cập nhật hoạt động)
      :lookup_category + lookup_organization\n(validate tên chính xác);
      if (Đủ thông tin?) then (yes)
        :create_activity / batch_create_activities / manage_activity;
        :INSERT/UPDATE ctxh_activity;
        :Trigger VectorSync event → BullMQ;
      else
        :Hỏi bổ sung thông tin;
      endif
    case (Gửi email thông báo)
      :send_notification_email;
      :Lấy DS tất cả participants;
      :sendBulkEmail();
    case (MCP SQL tools)
      :Gọi PostgresMcpClientService;
      :Thực thi SQL qua MCP protocol;
    endswitch
    
    :Đẩy ToolMessage vào messages[];
  endwhile (không còn)

repeat while (Chưa có câu trả lời AND < 10 vòng?) is (yes)

:Lưu messages vào MemoryService;
:Trả kết quả cho Controller;

stop

@enduml
```

---

### 5.3 Sequence Diagram — Duyệt đăng ký qua chat

```plantuml
@startuml Staff_Approve_Sequence
title UC-T04: Cán bộ duyệt đăng ký qua chatbot

actor "Cán bộ" as Staff
participant "StaffAgentService" as SA
participant "LLM" as LLM
participant "Tool: get_pending_overview" as GPO
participant "Tool: get_pending_participants" as GPP
participant "Tool: approve_and_notify" as AAN
participant "ParticipationService" as PS
participant "NodemailerService" as Mail
database "PostgreSQL" as DB

== Lượt 1: Hỏi tổng quan ==
Staff -> SA: "Có sinh viên nào đang chờ duyệt không?"
SA -> LLM: invoke(messages)
LLM --> SA: tool_call: get_pending_overview({})
SA -> GPO: execute()
GPO -> DB: SELECT activities WITH pending_count > 0
DB --> GPO: [{activityId, name, org, pending_count}, ...]
GPO -> SA: cache results in sessionActivityCache
SA -> LLM: invoke([..., ToolMessage{overview}])
LLM --> SA: "Có 2 hoạt động đang chờ duyệt:\n1. Tình nguyện mùa hè (3 SV)\n2. Hiến máu tháng 5 (1 SV)"
SA --> Staff: response

== Lượt 2: Xem danh sách ==
Staff -> SA: "Cho tôi xem danh sách SV đăng ký hoạt động 1"
SA -> LLM: invoke(messages + "hoạt động 1")
note right of LLM
  LLM dùng activity ID từ
  sessionActivityCache (không cần search lại)
end note
LLM --> SA: tool_call: get_pending_participants({activityId: 'uuid-A'})
SA -> GPP: execute('uuid-A')
GPP -> DB: SELECT WHERE activity_id='uuid-A' AND status='PENDING'
DB --> GPP: [{participationId, studentName, studentCode, registeredAt}]
SA -> LLM: invoke([..., ToolMessage{participants}])
LLM --> SA: "Hoạt động **Tình nguyện mùa hè** có 3 SV chờ duyệt:\n1. Nguyễn Văn A (2112345)\n2. Trần Thị B (2154321)\n3. Lê Văn C (2198765)"
SA --> Staff: response

== Lượt 3: Duyệt tất cả ==
Staff -> SA: "Duyệt tất cả 3 bạn đi"
SA -> LLM: invoke(messages + "duyệt tất cả")
LLM --> SA: tool_call: approve_and_notify({activityId:'uuid-A', approveAll:true})
SA -> AAN: execute({activityId:'uuid-A', approveAll:true})
AAN -> PS: approveAll(activityId)
PS -> DB: UPDATE ctxh_participation SET status='APPROVED'\nWHERE activity_id='uuid-A' AND status='PENDING'
DB --> PS: 3 rows updated
AAN -> Mail: sendApprovalEmail(x3)
Mail --> AAN: 3 emails sent
SA -> LLM: invoke([..., ToolMessage{approved:3, emailsSent:3}])
LLM --> SA: "Đã duyệt thành công 3 sinh viên và gửi email xác nhận."
SA --> Staff: response

@enduml
```

---

### 5.4 Sequence Diagram — Tạo hoạt động qua chat

```plantuml
@startuml Staff_Create_Activity_Sequence
title UC-T06: Cán bộ tạo hoạt động CTXH qua chatbot (3 bước)

actor "Cán bộ" as Staff
participant "StaffAgentService" as SA
participant "LLM" as LLM
participant "Tool: lookup_organization" as LO
participant "Tool: lookup_category" as LC
participant "Tool: create_activity" as CA
participant "ActivitiesService" as AS
participant "CtxhVectorSyncService" as VS
participant "BullMQ Queue" as Queue
database "PostgreSQL" as DB

== Bước 1: Cán bộ cung cấp thông tin ==
Staff -> SA: "Tạo hoạt động Dọn dẹp vệ sinh sân KTMT\ntừ 10/05 đến 11/05, 1 ngày CTXH,\nkhoa KTMT, tại Cơ sở 2"

SA -> LLM: invoke(messages)
note right of LLM
  LLM phát hiện cần tra cứu
  tên chính xác của org và category
end note
LLM --> SA: tool_call: lookup_organization({keyword: 'KTMT'})
SA -> LO: execute({keyword: 'KTMT'})
LO -> DB: SELECT WHERE name ILIKE '%KTMT%'
DB --> LO: [{"Liên chi đoàn Khoa Khoa học và Kỹ thuật Máy tính"}]
SA -> LLM: invoke([..., ToolMessage{org results}])

LLM --> SA: tool_call: lookup_category({keyword: 'dọn dẹp'})
SA -> LC: execute({keyword: 'dọn dẹp'})
LC -> DB: SELECT WHERE name ILIKE '%dọn dẹp%'
DB --> LC: [{"Dọn dẹp vệ sinh"}]
SA -> LLM: invoke([..., ToolMessage{category results}])

== Bước 2: LLM trình bày xác nhận ==
LLM --> SA: "Xác nhận tạo hoạt động:\n\n**Dọn dẹp vệ sinh sân KTMT**\n- Danh mục: Dọn dẹp vệ sinh\n- Tổ chức: Liên chi đoàn Khoa KHKT Máy tính\n- Thời gian: 10/05/2026 → 11/05/2026\n- Địa điểm: Cơ sở 2\n- Số ngày CTXH: 1\n\nBạn có muốn tạo hoạt động này không?"
SA --> Staff: Hiển thị xác nhận

== Bước 3: Cán bộ xác nhận và tạo ==
Staff -> SA: "Tạo đi"
SA -> LLM: invoke([..., HumanMessage("Tạo đi")])
LLM --> SA: tool_call: create_activity({name, categoryId, organizationId, startDate, endDate, ...})

SA -> CA: execute(activityData)
CA -> AS: create(dto)
AS -> DB: INSERT INTO ctxh_activity
DB --> AS: {id: 'new-uuid', name: 'Dọn dẹp vệ sinh sân KTMT', ...}

AS -> VS: emit(ActivityCreatedEvent)
VS -> Queue: add({activityId, operation:'upsert'})
note right of Queue
  BullMQ xử lý bất đồng bộ:
  1. Tạo embedding text
  2. Gọi Embedding Model
  3. Upsert vào ctxh_embeddings
end note

SA -> LLM: invoke([..., ToolMessage{success, activityId}])
LLM --> SA: "Đã tạo thành công hoạt động **Dọn dẹp vệ sinh sân KTMT**!"
SA --> Staff: response

@enduml
```

---

## 6. Luồng dữ liệu Ingestion (Vector Sync)

### 6.1 Sequence Diagram — Ingestion Pipeline

```plantuml
@startuml Ingestion_Pipeline_Sequence
title Luồng đồng bộ Vector Store khi hoạt động thay đổi

participant "ActivitiesService" as AS
participant "EventEmitter" as EE
participant "CtxhVectorSyncService" as VS
participant "BullMQ Queue\n(vectorize_queue)" as Q
participant "VectorIngestionProcessor" as IP
participant "LangChainIngestionService" as LI
participant "Embedding Model\n(BGE-M3 / Gemini)" as EM
database "ctxh_embeddings\n(pgVector)" as DB

note over AS, DB
  Trigger: Hoạt động được tạo / cập nhật / xóa / khôi phục
end note

AS -> EE: emit(ActivityCreatedEvent | ActivityUpdatedEvent\n| ActivityDeletedEvent | ActivityRestoredEvent)

EE -> VS: @OnEvent(ACTIVITY_EVENTS.CREATED)

alt Event = CREATED
  VS -> Q: add({activityId, operation:'upsert'}, jobOptions)
else Event = UPDATED
  VS -> VS: checkContentFields(changedFields)\n(chỉ re-embed khi đổi tên/mô tả/ngày/...)
  alt Có content field thay đổi
    VS -> Q: add({activityId, operation:'upsert'}, jobOptions)
  end
else Event = DELETED
  VS -> Q: add({activityId, operation:'delete'}, jobOptions)
else Event = RESTORED
  VS -> Q: add({activityId, operation:'upsert'}, jobOptions)
end

note right of Q
  Job options:
  • attempts: 3
  • backoff: exponential (2s → 4s → 8s)
  • removeOnComplete: true
end note

Q -> IP: process(job)

IP -> LI: upsertActivity(activityId) | deleteActivity(activityId)

alt operation = 'upsert'
  LI -> DB: SELECT ctxh_activity WHERE id = activityId\n(JOIN organizations, categories)
  DB --> LI: activityData
  
  LI -> LI: formatActivityText(activityData)
  note right of LI
    "Hoạt động: {name}
    Mô tả: {description}
    Tổ chức: {org.name}
    Danh mục: {category.name}
    Thời gian: {startDate} - {endDate}
    Địa điểm: {location}
    Số ngày CTXH: {totalDays}
    Trạng thái: {status}"
  end note
  
  LI -> EM: embedQuery(activityText)
  EM --> LI: vector[1024]
  
  LI -> DB: INSERT ... ON CONFLICT (activity_id)\nDO UPDATE SET embedding = ?, content_text = ?, metadata = ?
else operation = 'delete'
  LI -> DB: DELETE FROM ctxh_embeddings WHERE activity_id = ?
end

DB --> LI: OK
LI --> IP: done
IP --> Q: job completed (removeOnComplete)

note over VS, DB
  Scheduled Safety-net:
  @Cron('*/30 * * * *') — Mỗi 30 phút kiểm tra activities thiếu embedding
  onApplicationBootstrap() — Sync khi khởi động server
end note

@enduml
```

---

## 7. Luồng xử lý Agent Decision

### 7.1 Activity Diagram — Agent Decision

```plantuml
@startuml Agent_Decision_Activity
title CtxhAgentService — Quy trình quyết định action

start

:Nhận {question, chatHistory, currentDate};

:LLM call với CTXH_AGENT_PROMPT\n(tool-binding: 3 tools);

note right
  Prompt chứa:
  • Ngày hôm nay
  • Lịch sử hội thoại
  • Câu hỏi hiện tại
  LLM tự do suy luận, không cần
  keyword table cứng nhắc
end note

:Parse tool_call từ LLM response;

if (Có tool_call?) then (no)
  :Trả về action='out_of_scope'\n(fallback mặc định);
  stop
endif

switch (Tool name)
case (search_ctxh_activities)
  :Trích params: query, status[], dateFrom, dateTo,\norganizationName, location, mode;
  
  switch (mode)
  case (filtered)
    note right: Có ≥1 filter rõ ràng\n→ SQL WHERE + vector
  case (semantic)
    note right: Câu hỏi chung\n→ vector similarity thuần
  case (diverse)
    note right: Muốn đa dạng\n→ MMR search
  case (list_all)
    note right: Liệt kê tất cả\n→ SQL thuần
  endswitch
  
  :Trả AgentDecision {action:'search', params};

case (register_for_activity)
  :Trích params: activityContext, activityId?;
  :Trả AgentDecision {action:'register', params};

case (respond_general)
  :Trích type: 'greeting' | 'out_of_scope';
  
  if (type = 'greeting') then (yes)
    :Trả AgentDecision {action:'greeting'};
  else
    :Trả AgentDecision {action:'out_of_scope'};
  endif
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
title Vòng đời Session Memory

participant "Controller" as C
participant "MemoryService" as M

C -> M: getMemory(sessionId)
alt Session tồn tại
  M -> M: lastAccessed = now()
  M --> C: existingMemory
else Session mới
  M -> M: new BufferMemory() + InMemoryChatMessageHistory()
  M -> M: memories.set(sessionId, entry)
  M --> C: newMemory
end

C -> M: addMessages(sessionId, [HumanMsg, AIMsg])
M -> M: Append to history
M -> M: turnCount++
M -> M: Kiểm tra maxMessagesPerSession (20)

note right of M
  Cleanup job (mỗi 5 phút):
  Xóa entries có lastAccessed > 30 phút
  Nếu memories.size > 1000 → xóa cũ nhất
end note

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
