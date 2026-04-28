## Luồng chatbot phía sinh viên (Student Chat Flow)

### Tổng quan kiến trúc

```
HTTP POST /ctxh-chat/message
         │
         ▼
   CtxhChatController
         │  • Xác thực JWT
         │  • Lấy userId, userType
         │  • Resolve userOrg (training department)
         │
    [userType === 'staff'] ──► StaffAgentService (luồng riêng)
         │
    [userType === student / default]
         │
         ▼
  LangChainRagChainService.invoke()
```

---

### Luồng chi tiết `invoke()`

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1 — Load Chat History                                   │
│  memoryService.getFormattedHistory(sessionId)                │
│  → Trả về chuỗi lịch sử để Router Agent giải nghĩa đại từ  │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│ Step 2 — Router Agent  (1 LLM call, withStructuredOutput)    │
│  Input : câu hỏi gốc + chat_history                          │
│  Output: { rewrittenQuestion, intent }                       │
│                                                              │
│  Intents:                                                    │
│   • GREETING           → Step 3                             │
│   • CHITCHAT           → Step 4                             │
│   • REGISTER_ACTIVITY  → Step 4.5                           │
│   • RAG_QUERY          → Step 5                             │
│                                                              │
│  Fallback khi LLM lỗi: intent = RAG_QUERY, câu hỏi giữ nguyên│
└──────────────────────────────────────────────────────────────┘
```

---

### Phân nhánh theo Intent

#### `GREETING` — Chào hỏi / hỏi khả năng chatbot

```
Nhận biết: "Xin chào", "Bạn là ai?", "Bạn làm được gì?", "Hello"
    │
    ▼
Trả ngay GREETING_RESPONSE (hardcoded, không gọi vector DB)
Lưu vào memory
    │
    ▼
Response: giới thiệu chatbot + danh sách tính năng
```

---

#### `CHITCHAT` — Câu hỏi ngoài phạm vi

```
Nhận biết: "Giải toán", "Thời tiết", "Viết code", "Tiết lộ API key"
    │
    ▼
Trả ngay CHITCHAT_REJECTION (hardcoded, không gọi vector DB)
Lưu vào memory
    │
    ▼
Response: "Xin lỗi, tôi chỉ hỗ trợ câu hỏi về hoạt động CTXH..."
```

---

#### `REGISTER_ACTIVITY` — Sinh viên muốn đăng ký

```
Nhận biết: "Đăng ký tôi vào", "Tôi muốn tham gia", "Ok đăng ký đi"
    │
    ▼
handleRegistrationIntent()
    │
    ├─► Priority 1: Tìm trong session memory (MentionedActivities)
    │     memoryService.getMentionedActivities(sessionId)
    │     resolveTargetActivity() — ưu tiên:
    │       1. Ordinal reference ("thứ 2", "số 4", "thứ nhất")
    │       2. Name fuzzy match
    │       3. First recruiting activity
    │
    ├─► Priority 2 (khi không tìm được trong memory):
    │     retrieveDocumentsWithVerification() → findRecruitingActivity()
    │
    ├─► Nếu activity KHÔNG còn tuyển:
    │     Response: "Hoạt động X hiện không còn nhận đăng ký"
    │     registrationTarget = undefined
    │
    └─► Nếu activity đang tuyển:
          Response: "Tôi sẽ đăng ký bạn vào hoạt động X"
          registrationTarget = { activityId, activityName }
                │
                ▼
        [Controller] participationService.registerSelf(activityId, userId)
                │
          ┌─────┴──────────────────┐
          │ Thành công             │ Lỗi
          ▼                        ▼
  "Đã đăng ký thành công..."  "Không thể đăng ký: <lý do>"
```

---

#### `RAG_QUERY` — Hỏi về hoạt động CTXH

```
Step 5 — retrieveDocumentsWithVerification()
    │
    ├─► Pre-fetch enrolled IDs (lọc hoạt động đã đăng ký)
    │     mcpFallbackService.queryEnrolledActivityIds(userId)
    │
    ├─► selectAndExecuteTool() — Dynamic Tool Selection (Phase 3)
    │     1 LLM call với bindTools([3 tools])
    │     LLM chọn 1 trong 4 tools:
    │
    │     search_with_filters  →  retrieveDocuments()
    │       • LLM trích xuất filters (thời gian, địa điểm, danh mục, tổ chức)
    │       • Resolve relative dates ("hôm nay" → YYYY-MM-DD bounds)
    │       • Org injection: nếu SV không đề cập khoa → inject userOrg
    │       • MCP SQL → lấy activityIds khớp filter
    │       • pgvector similarity search (constrained by IDs)
    │       • Parallel broad search + merge khi org được inject tự động
    │
    │     search_semantic  →  similaritySearchWithDateFilter()
    │       • Pure embedding similarity, không trích filter
    │       • Dùng khi câu hỏi tổng quát, không có bộ lọc
    │
    │     search_diverse  →  maxMarginalRelevanceSearch() (MMR)
    │       • Đa dạng hoá kết quả, tránh trùng lặp
    │       • Dùng khi SV muốn xem nhiều loại hoạt động
    │
    │     list_activities_sql  →  mcpFallbackService.listActivities()
    │       • Pure SQL qua MCP, không dùng embedding
    │       • Convert JSON → Document[]
    │
    │     Fallback (LLM không chọn tool):
    │       retrieveDocuments() với useMMR flag
    │
    ├─► [docs.length > 0] → filter enrolled → return
    │
    └─► [docs.length === 0] — Zero-result Fallback (Phase 2, song song):
          Promise.allSettled([
            runVerifierFallback()       ← LLM viết lại query đơn giản hơn
            mcpFallbackService.fallbackSearch(statusHint)  ← SQL thuần
          ])
          inferStatusFromQuestion() bằng regex (không cần LLM)
          Merge: MCP SQL ưu tiên hơn Verifier LLM
          filter enrolled → slice(topK) → return
    │
    ▼
Step 6 — Enrich & Format context
    mcpEnricher.enrichDocuments(sources)
    formatDocumentsAsContext(enrichedSources, currentDate)
    userOrgInstruction (nếu có userOrg)
    │
    ▼
Step 7 — RAG Chain (LLM generate)
    ragChain.invoke({ question, chat_history, context, current_date, ... })
    Chain: CTXH_RAG_PROMPT → LLM → StringOutputParser
    │
    ▼
Step 8 — Post-process
    extractActivitiesFromDocs() → setMentionedActivities() (lưu vào session)
    Nếu kết quả chỉ có 1 hoạt động DUY NHẤT đang tuyển:
      → Append "Bạn có muốn tôi đăng ký bạn vào hoạt động X không?"
    saveInteraction() → lưu Q&A vào memory
    │
    ▼
Response: { response, sources, responseTime, sessionId, intent }
```

---

### Sơ đồ tổng hợp

```
Câu hỏi sinh viên
        │
        ├── GREETING          → [hardcoded intro]
        │
        ├── CHITCHAT          → [polite rejection]
        │
        ├── REGISTER_ACTIVITY → [memory lookup / retrieval]
        │                           │
        │                    activity recruiting? ──No──► "Không còn nhận đăng ký"
        │                           │ Yes
        │                    participationService.registerSelf()
        │                           │
        │                    "Đã đăng ký thành công" / "Lỗi: <msg>"
        │
        └── RAG_QUERY         → Tool Selection → Retrieve → Verify/Fallback
                                       │
                                 Enrich → Format → LLM Generate
                                       │
                                 Post-process (track + suggest registration)
                                       │
                                 Response + Sources
```

---

### Các service liên quan

| Service | Vai trò |
|---|---|
| `LangChainMemoryService` | Lưu lịch sử hội thoại, track `MentionedActivities` theo session |
| `CtxhFilterExtractionService` | LLM trích xuất metadata filters từ câu hỏi |
| `LangChainVectorStoreService` | pgvector similarity/MMR search |
| `McpSqlFallbackService` | SQL qua MCP: query IDs, fallback search, enrolled IDs |
| `McpMetadataEnricherService` | Enrich document metadata trước khi format context |
| `UserContextService` | Lấy training department của sinh viên (userOrg) |
| `ParticipationService` | Thực hiện đăng ký hoạt động khi intent = REGISTER_ACTIVITY |

[0] [Nest] 7464  - 11:44:08 27/04/2026   DEBUG [UserContextService] [UserContext] userId=4048c600-69d3-43e9-b4f1-3ed91c3e448e -> dept="Khoa Kỹ Thuật Hóa Học"
[0] [Nest] 7464  - 11:44:09 27/04/2026   DEBUG [LangChainRagChainService] [RouterAgent] intent=RAG_QUERY | rewritten="Hoạt động CTXH nào đang diễn ra?"
[0] [Nest] 7464  - 11:44:11 27/04/2026   DEBUG [LangChainRagChainService] [ToolSelector] Selected: search_with_filters
[0] [Nest] 7464  - 11:44:12 27/04/2026   DEBUG [CtxhFilterExtractionService] Extracted filters for "Hoạt động CTXH nào đang diễn ra?...": {"status":["ongoing"]}
[0] [Nest] 7464  - 11:44:12 27/04/2026   DEBUG [LangChainRagChainService] [OrgFilter] Injected user dept: "Khoa Kỹ Thuật Hóa Học"
[0] [Nest] 7464  - 11:44:12 27/04/2026   DEBUG [LangChainRagChainService] Extracted filters: {"status":["ongoing"],"organizationKeywords":["Khoa Kỹ Thuật Hóa Học"]}
[0] [Nest] 7464  - 11:44:12 27/04/2026   DEBUG [McpSqlFallbackService] [MCP EmbeddingFilter] Found 1 activity_ids matching filters
[0] 🔧 Requesting embedding with dimension: 1024
[0] ✅ Received embedding dimension: 1024
[0] [Nest] 7464  - 11:44:13 27/04/2026   DEBUG [LangChainVectorStoreService] [ConstrainedSearch] 1 candidate IDs → 1 docs returned
[0] [Nest] 7464  - 11:44:13 27/04/2026   DEBUG [McpSqlFallbackService] [MCP EmbeddingFilter] Found 16 activity_ids matching filters
[0] 🔧 Requesting embedding with dimension: 1024
[0] ✅ Received embedding dimension: 1024
[0] [Nest] 7464  - 11:44:13 27/04/2026   DEBUG [LangChainVectorStoreService] [ConstrainedSearch] 16 candidate IDs → 5 docs returned
[0] [Nest] 7464  - 11:44:13 27/04/2026   DEBUG [LangChainRagChainService] [OrgFilter] Parallel merge: 1 org-specific + 4 broad -> total 5
[0] [Nest] 7464  - 11:44:13 27/04/2026   DEBUG [LangChainRagChainService] [Verifier] Primary retrieval returned 5 docs (0 enrolled excluded) — skipping verification
[0] [Nest] 7464  - 11:44:32 27/04/2026   DEBUG [LangChainMemoryService] Created new memory for session: session_4048c600-69d3-43e9-b4f1-3ed91c3e448e_1777265048358
[0] [Nest] 7464  - 11:44:32 27/04/2026   DEBUG [LangChainMemoryService] [Memory] Stored 5 activities for session_4048c600-69d3-43e9-b4f1-3ed91c3e448e_1777265048358 (turn 0)
[0] [Nest] 7464  - 11:44:32 27/04/2026   DEBUG [LangChainMemoryService] Saved interaction for session session_4048c600-69d3-43e9-b4f1-3ed91c3e448e_1777265048358, turn 1
[0] [Nest] 7464  - 11:44:36 27/04/2026   DEBUG [FollowUpSuggestionsService] [FollowUp] Generated 3 suggestions via LLM