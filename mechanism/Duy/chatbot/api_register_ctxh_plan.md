## Kế hoạch: Tích hợp đăng ký hoạt động vào chatbot RAG

### Tổng quan luồng xử lý mới

```
User: "đăng ký tôi vào hoạt động này"
  │
  ├─ Router Agent → intent: REGISTER_ACTIVITY
  │
  ├─ RAG Chain: lookup lastMentionedActivity từ session memory
  │     ├─ Tìm thấy activityId → set registrationTarget trong RAGResponse
  │     └─ Không tìm thấy → retrieval để tìm activity, báo lỗi nếu vẫn không ra
  │
  └─ Controller: nhận registrationTarget + userId → gọi ParticipationService.registerSelf()
                 → trả về thông báo thành công/thất bại

User: "hoạt động hiến máu tuần này"
  │
  ├─ Router Agent → intent: RAG_QUERY
  ├─ Retrieval → tìm được activity X (ACTIVE, Đang diễn ra)
  ├─ Lưu vào session: lastMentionedActivity = { activityId: X, ... }
  ├─ Generate response bình thường
  └─ Post-process: nếu activity còn tuyển thành viên →
        append "Bạn có muốn tôi đăng ký bạn vào hoạt động này không?"
```

---

### Các file cần sửa/tạo

#### 1. `dto/router-output.dto.ts` — Thêm intent mới

```typescript
// Thêm 'REGISTER_ACTIVITY' vào IntentEnum
export const IntentEnum = z.enum([
  'RAG_QUERY', 'DOC_QUERY', 'GREETING', 'CHITCHAT',
  'REGISTER_ACTIVITY'   // <-- thêm
]);

// Cập nhật describe() trên intent field:
// "REGISTER_ACTIVITY nếu sinh viên muốn đăng ký/thêm bản thân vào một hoạt động CTXH
//  (ví dụ: 'đăng ký tôi vào', 'thêm tôi vào', 'tôi muốn tham gia hoạt động này', 'đăng ký cho tôi')"
```

#### 2. `prompts/router-agent.prompt.ts` — Thêm examples cho REGISTER_ACTIVITY

Thêm vào phần examples trong prompt:
```
"đăng ký tôi vào hoạt động này"           → REGISTER_ACTIVITY
"thêm tôi vào hoạt động ctxh này"         → REGISTER_ACTIVITY
"tôi muốn tham gia hoạt động đó"          → REGISTER_ACTIVITY
```

Lưu ý: `rewrittenQuestion` với REGISTER_ACTIVITY vẫn cần resolve contextual reference "hoạt động này/đó" thành tên cụ thể từ history nếu có.

#### 3. `interfaces/conversation.interface.ts` — Mở rộng `SessionContext`

```typescript
export interface SessionContext {
  recentTopics: string[];
  userPreferences: Record<string, any>;
  
  // TẠO MỚI: track activity được đề cập gần nhất để dùng khi REGISTER_ACTIVITY
  lastMentionedActivity?: {
    activityId: string | number;
    activityName: string;
    isRecruiting: boolean;  // còn tuyển thành viên (ACTIVE + Đang/Sắp diễn ra)
  };
}
```

#### 4. `services/langchain-memory.service.ts` — Thêm 2 phương thức

```typescript
// Lưu activity được đề cập gần nhất vào session
setLastMentionedActivity(
  sessionId: string,
  activityId: string | number,
  activityName: string,
  isRecruiting: boolean
): void

// Đọc lại activity gần nhất
getLastMentionedActivity(sessionId: string): {
  activityId: string | number;
  activityName: string;
  isRecruiting: boolean;
} | null
```

Implementation: đọc/ghi `session.context.lastMentionedActivity` trực tiếp trên `MemoryEntry` đang có sẵn trong `Map`.

#### 5. `services/langchain-rag-chain.service.ts` — Thay đổi chính

**5a. Mở rộng `RAGResponse` interface:**
```typescript
export interface RAGResponse {
  response: string;
  sources: Document[];
  responseTime: number;
  sessionId?: string;
  intent?: RouterOutput['intent'];
  
  // TẠO MỚI: nếu intent là REGISTER_ACTIVITY và tìm thấy activity
  registrationTarget?: {
    activityId: string | number;
    activityName: string;
  };
}
```

**5b. Mở rộng `RAGChainOptions`:**
```typescript
export interface RAGChainOptions {
  // ... existing fields ...
  userId?: string;  // TẠO MỚI: để truyền xuống nếu cần, chủ yếu dùng ở controller
}
```

**5c. Trong `invoke()` — xử lý REGISTER_ACTIVITY (sau Step 2):**

```
//── Step 3.5: REGISTER_ACTIVITY — tìm activity cần đăng ký ────────────────
if (intent === 'REGISTER_ACTIVITY') {
  // Ưu tiên 1: lấy từ session memory (activity được đề cập trong turn trước)
  const lastActivity = memoryService.getLastMentionedActivity(sessionId);
  
  if (lastActivity) {
    if (!lastActivity.isRecruiting) {
      response = `Hoạt động "${lastActivity.activityName}" hiện không còn nhận đăng ký.`;
    } else {
      response = `Tôi sẽ tiến hành đăng ký bạn vào hoạt động "${lastActivity.activityName}".`;
    }
    return {
      response,
      sources: [],
      registrationTarget: lastActivity.isRecruiting ? lastActivity : undefined,
      intent,
      ...
    };
  }
  
  // Ưu tiên 2: chạy retrieval với rewrittenQuestion để tìm activity
  const sources = await retrieveDocumentsWithVerification(rewrittenQuestion, ...);
  const target = findOngoingActivity(sources, currentDate);  // helper mới
  
  if (!target) {
    response = "Tôi không tìm thấy hoạt động bạn đề cập. Bạn có thể cho tôi biết tên cụ thể?";
    return { response, sources: [], intent, ... };
  }
  
  if (!target.isRecruiting) {
    response = `Hoạt động "${target.activityName}" hiện không còn nhận đăng ký.`;
    return { response, sources, intent, ... };
  }
  
  return {
    response: `Tôi sẽ đăng ký bạn vào hoạt động "${target.activityName}".`,
    sources,
    registrationTarget: { activityId: target.activityId, activityName: target.activityName },
    intent,
    ...
  };
}
```

**5d. Trong `invoke()` — sau Step 5 (retrieval), trước Step 7 cho RAG_QUERY:**

```
// Lưu activity gần nhất vào session memory để dùng cho REGISTER_ACTIVITY sau này
const ongoingActivity = findRecruitingActivity(sources, currentDate);
if (ongoingActivity && sessionId) {
  memoryService.setLastMentionedActivity(
    sessionId,
    ongoingActivity.activityId,
    ongoingActivity.activityName,
    ongoingActivity.isRecruiting
  );
}
```

**5e. Trong `invoke()` — sau Step 7 (generation), append suggestion:**

```
// Nếu query về 1 activity cụ thể đang mở đăng ký → gợi ý
const distinctActivityIds = new Set(sources.map(d => d.metadata?.activityId).filter(Boolean));
if (distinctActivityIds.size === 1 && ongoingActivity?.isRecruiting) {
  response += '\n\n---\n💬 Bạn có muốn tôi đăng ký bạn vào hoạt động **'
    + ongoingActivity.activityName + '** này không?';
}
```

**5f. Helper method `findRecruitingActivity(docs, currentDate)`:**

Tái sử dụng logic từ `formatDocumentsAsContext()`:
- Parse `startDate`, `endDate` từ metadata
- Compute `realtimeStatus` (Đang diễn ra / Sắp diễn ra)  
- Trả về activity đầu tiên thỏa: `activityStatus === ACTIVE AND (Đang diễn ra OR Sắp diễn ra)`
- Trả về `{ activityId, activityName, isRecruiting }` hoặc `null`

#### 6. `controllers/ctxh-chat.controller.ts` — Gọi registration API

```typescript
// Inject thêm:
import { ParticipationService } from '../../ctxh/activity/services/participation.service';

// Trong sendMessage(), sau khi invoke():
if (response.intent === 'REGISTER_ACTIVITY' && response.registrationTarget) {
  try {
    await this.participationService.registerSelf(
      response.registrationTarget.activityId,
      userId  // đã có từ request.user.id
    );
    // Ghi đè response text với thông báo thành công
    return {
      ...chatResponse,
      message: `✅ Đã đăng ký thành công bạn vào hoạt động **${response.registrationTarget.activityName}**!`
    };
  } catch (err) {
    // Ghi đè với thông báo lỗi
    return {
      ...chatResponse,
      message: `❌ Không thể đăng ký: ${err.message || 'Vui lòng thử lại sau.'}`
    };
  }
}
```

#### 7. `ctxh-chat.module.ts` — Import ActivitiesModule

```typescript
// Thêm ActivitiesModule vào imports để có thể dùng ParticipationService
imports: [
  // ... existing imports ...
  ActivitiesModule,   // <-- thêm (hoặc dùng forwardRef nếu circular)
]
```

---

### Luồng xử lý đầy đủ

```
Case 1: Student hỏi về hoạt động cụ thể (RAG_QUERY)
──────────────────────────────────────────────────
1. Router: RAG_QUERY
2. Retrieval: tìm docs, VD activity "Hiến máu 5/2026" (ACTIVE, startDate=ngày mai)
3. Memory: setLastMentionedActivity(sessionId, "123", "Hiến máu 5/2026", isRecruiting=true)
4. Generate response: "Hoạt động Hiến máu... diễn ra vào..."
5. Post-process: distinctIds == 1 AND isRecruiting → append suggestion
   → "💬 Bạn có muốn tôi đăng ký bạn vào hoạt động Hiến máu 5/2026 này không?"

Case 2: Student đăng ký (REGISTER_ACTIVITY - turn tiếp theo)
──────────────────────────────────────────────────────────────
1. Router: REGISTER_ACTIVITY
2. Memory lookup: lastMentionedActivity = { activityId: "123", isRecruiting: true }
3. RAG chain trả về: registrationTarget = { activityId: "123", activityName: "Hiến máu 5/2026" }
4. Controller: participationService.registerSelf("123", userId)
5. Response: "✅ Đã đăng ký thành công bạn vào hoạt động Hiến máu 5/2026!"

Case 3: Student đăng ký ngay lập tức (không có context trước)
──────────────────────────────────────────────────────────────
Input: "đăng ký tôi vào hoạt động hiến máu tuần này"
1. Router: REGISTER_ACTIVITY, rewrittenQuestion = "hoạt động hiến máu tuần này"
2. Memory lookup: không có lastMentionedActivity
3. Fallback retrieval với rewrittenQuestion → tìm được activity "Hiến máu..."
4. Trả về registrationTarget nếu còn tuyển, báo lỗi nếu không
5. Controller: registerSelf() → thành công/thất bại
```

---

### Điểm cần lưu ý khi implement

| Vấn đề | Giải pháp đề xuất |
|---|---|
| Circular dependency `CtxhChatModule` ↔ `ActivitiesModule` | Dùng `forwardRef(() => ActivitiesModule)` nếu cần |
| SSE `/stream` endpoint cũng cần xử lý REGISTER_ACTIVITY | Xử lý tương tự trong `stream()` — yield confirmation rồi return; controller gọi `registerSelf()` sau khi stream kết thúc |
| Activity ID trong metadata của vector docs | Key là `metadata.activityId` (xác nhận từ `LangChainIngestionService.prepareDocuments()`) |
| `lastMentionedActivity` lỗi thời (user đổi chủ đề) | TTL có thể đặt 1 turn hoặc set lại mỗi lần có RAG_QUERY mới |
| User chưa đăng nhập / không có `userId` | Guard đã xử lý ở controller level — không cần handle thêm |