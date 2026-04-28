## Kế hoạch cải thiện `generateFollowUpSuggestions` bằng LLM

### Vấn đề hiện tại
`generateFollowUpSuggestions` dùng keyword-matching cứng (kiểm tra chuỗi "hoạt động", "ngày", v.v.) → suggestions không phản ánh context thực sự của câu trả lời, dễ bị lặp lại và không liên quan.

---

### Kiến trúc đề xuất

**Tạo một `FollowUpSuggestionsService` riêng biệt** — inject `UniversalLLMService`, dùng một lightweight LLM call để sinh ra 3 câu hỏi tiếp theo dựa trên cặp `(userMessage, assistantResponse)`.

```
Controller.sendMessage()
    │
    ├── ragChainService.invoke(...)  ← giữ nguyên
    │        └── response: { response, sources, intent, ... }
    │
    └── followUpSuggestionsService.generate(userMessage, response.response)
             │
             ├── Build prompt: "Dựa vào câu hỏi X và trả lời Y, đề xuất 3 câu hỏi ngắn..."
             ├── llm.invoke(prompt) với structured output (Zod schema: string[])
             ├── Fallback (nếu LLM lỗi) → static suggestions như hiện tại
             └── return: string[3]
```

---

### Các bước triển khai

#### Bước 1 — Tạo prompt template
Tạo file `backend/src/ctxh-chat/prompts/follow-up-suggestions.prompt.ts`:
- Input: `{ userQuestion, assistantAnswer }`
- Yêu cầu LLM trả về JSON array 3 strings — câu hỏi ngắn gọn, tiếng Việt, liên quan trực tiếp đến câu trả lời vừa rồi
- Dùng `/no_think` để tương thích Qwen/Ollama

#### Bước 2 — Tạo `FollowUpSuggestionsService`
File `backend/src/ctxh-chat/services/follow-up-suggestions.service.ts`:
- Inject `UniversalLLMService`
- Method `generate(userMessage: string, assistantResponse: string): Promise<string[]>`
- Dùng `withStructuredOutput` với Zod schema `z.object({ suggestions: z.array(z.string()).max(3) })` — tương tự pattern đang dùng trong `routeQuestion()`
- Timeout ~3s + fallback về static suggestions (tách hàm `generateFallback()` từ code hiện tại)

#### Bước 3 — Đăng ký vào module
Thêm `FollowUpSuggestionsService` vào `providers` trong `ctxh-chat.module.ts`

#### Bước 4 — Cập nhật controller
- Inject `FollowUpSuggestionsService` vào `CtxhChatController`
- Thay lời gọi `this.generateFollowUpSuggestions(response.response)` thành `await this.followUpSuggestionsService.generate(chatRequestDto.message, response.response)`
- Xóa private method `generateFollowUpSuggestions()` khỏi controller

#### Bước 5 — Tối ưu latency
Chạy song song LLM call của follow-up với bước xử lý `REGISTER_ACTIVITY` (dùng `Promise.all`), vì hai việc này độc lập nhau → không tăng thêm thời gian chờ cho user.

---

### Thiết kế prompt (Bước 1 chi tiết)

```
/no_think
Dựa vào cuộc hội thoại dưới đây, hãy đề xuất đúng 3 câu hỏi ngắn gọn mà người dùng có thể muốn hỏi tiếp theo.

Câu hỏi của người dùng: {userQuestion}
Câu trả lời vừa rồi: {assistantAnswer}

Yêu cầu:
- Mỗi câu hỏi ≤ 15 từ, tiếng Việt
- Liên quan trực tiếp đến nội dung câu trả lời (tên hoạt động, thời gian, tổ chức cụ thể đã đề cập)
- Không lặp lại câu hỏi gốc
- Đa dạng: ví dụ 1 câu về chi tiết, 1 câu về đăng ký, 1 câu mở rộng tìm kiếm
```

---

### Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|---|---|
| LLM gọi thêm tăng latency | Chạy `Promise.all` song song; timeout 3s |
| Model trả về sai format | Dùng `withStructuredOutput` (Zod) như pattern `routeQuestion()` |
| Model local (Ollama) quá tải | Fallback về static suggestions khi catch error |
| Suggestions không liên quan | Giới hạn `assistantAnswer` input ≤ 500 chars (trim context) |

---

Bạn muốn tôi bắt đầu implement từ bước nào?