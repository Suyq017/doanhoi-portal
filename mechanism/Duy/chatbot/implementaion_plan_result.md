Để viết code chính xác, tôi cần xem thêm vài file hiện tại để hiểu cấu trúc DTO và config của Ollama/Qwen.

Viewed filter-extraction.dto.ts:1-108
Viewed category.config.ts:1-59
Listed directory ctxh-chat
Listed directory prompts
Listed directory dto
Viewed langchain-rag-chain.service.ts:1-60
Viewed filter-extraction.prompt.ts:1-92

Bây giờ tôi đã có đủ thông tin để viết code. Hãy bắt đầu tạo task tracker và implement từng file.

Edited task.md

Bắt đầu implement:

**Bước 1: Tạo DTO `router-output.dto.ts`**

Created router-output.dto.ts

**Bước 2: Cập nhật `dto/index.ts`**

Viewed index.ts:1-3
Edited index.ts

**Bước 3: Tạo `router-agent.prompt.ts`** — Đây là phần quan trọng nhất, cần thiết kế prompt tối ưu cho Qwen/Ollama.

Created router-agent.prompt.ts

**Bước 4: Cập nhật `prompts/index.ts`**

Viewed index.ts:1-2
Edited index.ts

**Bước 5: Sửa `langchain-rag-chain.service.ts`** — Đây là bước lớn nhất, cần sửa nhiều chỗ không liền nhau.

Edited langchain-rag-chain.service.ts

Tất cả thay đổi đã được áp dụng. Hãy verify lại file cuối cùng để đảm bảo không còn tham chiếu nào đến code cũ:

Searched for "STANDALONE_QUESTION_PROMPT\|questionRewriteChain\|processQuestion\|buildQuestionRewriteChain\|RunnablePassthrough"
Searched for "routeQuestion\|RouterOutput\|ROUTER_AGENT_PROMPT\|CHITCHAT_REJECTION"

Hmm, grep không tìm thấy — có thể do encoding. Hãy xem trực tiếp service để verify:

Viewed langchain-rag-chain.service.ts:1-65
Viewed langchain-rag-chain.service.ts:90-220

Service trông rất tốt. Hãy fix một lỗi nhỏ — comment `JSDoc` của class bị lẫn với constant `CHITCHAT_REJECTION`:

Edited langchain-rag-chain.service.ts

Tất cả code đã hoàn chỉnh. Cập nhật task tracker:

Edited task.md

Phase 1 đã hoàn thành. Đây là tổng kết những gì đã được implement:

---

## ✅ Phase 1: Router Agent — Hoàn Thành

### Các file đã tạo/sửa

| File | Hành động |
|------|-----------|
| `dto/router-output.dto.ts` | **[NEW]** Zod schema `RouterOutputSchema` với `rewrittenQuestion` + `intent` enum |
| `dto/index.ts` | **[MOD]** Export thêm `RouterOutput` |
| `prompts/router-agent.prompt.ts` | **[NEW]** Prompt 2 nhiệm vụ trong 1 call |
| `prompts/index.ts` | **[MOD]** Export thêm `ROUTER_AGENT_PROMPT` |
| `services/langchain-rag-chain.service.ts` | **[MOD]** Thay `processQuestion` → `routeQuestion`, cập nhật `invoke`/`stream` |

### Quyết định thiết kế quan trọng

**Tối ưu cho Qwen/Ollama:**
- **`/no_think`** — prefix trong system prompt để tắt `<think>...</think>` block của Qwen, tránh corrupt JSON output của `withStructuredOutput`
- **Numbered list instructions** — Qwen follow số thứ tự tốt hơn bullet points
- **Graceful fallback** — nếu `withStructuredOutput` thất bại (LLM trả về JSON lỗi), `routeQuestion()` catch lỗi và tự động trả về `RAG_QUERY` với câu hỏi gốc — người dùng vẫn có câu trả lời

**Pipeline mới (7 bước rõ ràng):**
```
Load History → Router Agent → [CHITCHAT: early-exit] → Retrieve → Format → Generate → Save
```
- `CHITCHAT` → trả về rejection message ngay, **không chạm đến vector DB**
- `DOC_QUERY` → fallthrough sang RAG (như đã xác nhận Q1)
- `intent` được expose trong `RAGResponse` để debug/analytics

# Phase 1: Router Agent — Task List

- `[x]` **1. Tạo `dto/router-output.dto.ts`** — Zod schema `RouterOutputSchema`
- `[x]` **2. Cập nhật `dto/index.ts`** — export RouterOutput
- `[x]` **3. Tạo `prompts/router-agent.prompt.ts`** — Prompt tối ưu cho Qwen/Ollama
- `[x]` **4. Cập nhật `prompts/index.ts`** — export ROUTER_AGENT_PROMPT
- `[x]` **5. Sửa `services/langchain-rag-chain.service.ts`**:
  - Thêm import mới (ROUTER_AGENT_PROMPT, RouterOutput, RouterOutputSchema)
  - Xóa `private questionRewriteChain` field
  - Thêm `private routeQuestion()` với structured output + graceful fallback
  - Cập nhật `initializeChains()` — bỏ `buildQuestionRewriteChain()`
  - Cập nhật `invoke()` — 7-step flow với CHITCHAT early-exit, intent exposed trong response
  - Cập nhật `stream()` — CHITCHAT yields token rồi return sớm
  - Xóa hàm `processQuestion()` và `buildQuestionRewriteChain()`
  - Thêm `intent` vào `RAGResponse` interface

--------------------------------------------------------------------------------------------------------------
Created implementaion_plan_result.md

Để implement Phase 2, hãy xem lại trạng thái hiện tại của service sau Phase 1:

Viewed langchain-rag-chain.service.ts:155-260

Đủ thông tin rồi. Bắt đầu implement Phase 2:

**Bước 1: Tạo DTO `verifier-output.dto.ts`**

Created verifier-output.dto.ts

**Bước 2: Cập nhật `dto/index.ts`**

Edited index.ts

**Bước 3: Tạo `retrieval-verifier.prompt.ts`** — Prompt thiết kế gọn, tối ưu cho Qwen:

Created retrieval-verifier.prompt.ts

**Bước 4: Cập nhật `prompts/index.ts`**

Edited index.ts

**Bước 5: Sửa `langchain-rag-chain.service.ts`** — Thêm import và thay `retrieveDocuments()` bằng `retrieveDocumentsWithVerification()`:

Edited langchain-rag-chain.service.ts

Cần tìm đúng dòng gọi `retrieveDocuments` trong `invoke()` và `stream()`:

Viewed langchain-rag-chain.service.ts:390-460
Viewed langchain-rag-chain.service.ts:340-360
Viewed langchain-rag-chain.service.ts:360-380

Đã thấy rõ — dòng 372 (invoke) và dòng 459 (stream). Áp dụng:

Edited langchain-rag-chain.service.ts

Hoàn thành. Verify lại nhanh:

Viewed langchain-rag-chain.service.ts:210-305

Code hoàn chỉnh và chính xác. Cập nhật task tracker:

Edited task.md

Phase 2 hoàn thành. Đây là tổng kết:

---

## ✅ Phase 2: Retrieve-Then-Verify — Hoàn Thành

### Các file đã tạo/sửa

| File | Hành động |
|------|-----------|
| `dto/verifier-output.dto.ts` | **[NEW]** Zod schema: `verdict` (`SUFFICIENT`/`NEEDS_SUPPLEMENT`) + `supplementQuery` nullable |
| `dto/index.ts` | **[MOD]** Export thêm `VerifierOutput` |
| `prompts/retrieval-verifier.prompt.ts` | **[NEW]** Prompt nhỏ gọn, focus vào tạo `supplementQuery` tốt |
| `prompts/index.ts` | **[MOD]** Export thêm `RETRIEVAL_VERIFIER_PROMPT` |
| `services/langchain-rag-chain.service.ts` | **[MOD]** Thêm `retrieveDocumentsWithVerification()`, cập nhật Step 5 của cả `invoke()` và `stream()` |

### Cách hoạt động (flow thực tế)

```
retrieveDocumentsWithVerification()
  ├─ retrieveDocuments()  ← Primary retrieval (filters + vector search)
  │
  ├─ docs.length > 0  → Return immediately (ZERO added latency)
  │
  └─ docs.length === 0
       ├─ Verifier LLM → propose supplementQuery (strip filters, keep semantic core)
       ├─ similaritySearchWithDateFilter(supplementQuery)  ← No hard filters
       ├─ Deduplicate by activityId
       └─ Return merged docs (capped at topK)
```

### Điểm quan trọng về thiết kế

- **Zero overhead khi tìm được kết quả** — fast-path `if (docs.length > 0)` return ngay, không gọi LLM thêm
- **Verifier prompt cực kỳ ngắn** — model Qwen chỉ cần strip filters thay vì reasoning phức tạp  
- **Double graceful fallback**: nếu Verifier LLM lỗi → trả về empty docs → generation nói "không có thông tin" (không crash)