## Kế hoạch: Tối ưu truy vấn theo tổ chức của sinh viên

### Bối cảnh & Vấn đề hiện tại

Pipeline hiện tại có field `userOrg` trong `RAGChainOptions` nhưng controller KHÔNG bao giờ truyền giá trị này
vào `invoke()` — nó là dead code. Kết quả: tất cả sinh viên nhận được kết quả giống nhau, không được
cá nhân hóa theo khoa/tổ chức của mình.

Schema database liên quan:
- `users.trainingDepartmentId` (FK) → `departments.id`
- `departments.name` là tên khoa/tổ chức cần filter (VD: "Khoa Khoa học & Kỹ thuật Máy tính")

---

### Tổng quan luồng mới

```
sendMessage(userId)
  │
  ├─ [NEW] UserContextService.getTrainingDepartmentName(userId)
  │         → JOIN users + departments WHERE users.id = userId
  │         → trả về "Khoa Khoa học & Kỹ thuật Máy tính" hoặc null
  │
  ├─ ragChainService.invoke(..., { userOrg: "Khoa Khoa học & Kỹ thuật Máy tính" })
  │
  └─ invoke() → retrieveDocumentsWithVerification(userOrg)
                  → selectAndExecuteTool(userOrg)
                      → retrieveDocuments(userOrg)
                           ┌─ LLM extractFilters(question)
                           │
                           │   Case A: user KHÔNG đề cập khoa trong câu hỏi
                           │   → filters.organizationKeywords = [] (LLM không extract được)
                           │   → inject userOrg: filters.organizationKeywords = ["Khoa KTMT"]
                           │   → orgInjected = true
                           │   → [Query 1] search với org filter (KTMT-specific)
                           │   → [Query 2] search KHÔNG có org filter (broad, song song)
                           │   → merge kết quả: org-specific trước, broad bổ sung sau
                           │   → slice(0, topK)
                           │
                           │   Case B: user ĐỀ CẬP khoa cụ thể trong câu hỏi
                           │   → filters.organizationKeywords = ["Liên chi đoàn..."]  (LLM extract)
                           │   → KHÔNG inject userOrg (tôn trọng câu hỏi của user)
                           │   → search bình thường
                           │
                           └─ return docs
```

---

### Các file cần tạo/sửa

#### 1. `services/user-context.service.ts` — TẠO MỚI

```typescript
@Injectable()
export class UserContextService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Fetch the training department name for a given user.
   * Returns null if userId is undefined, user not found, or user has no trainingDepartment.
   */
  async getTrainingDepartmentName(userId: string | undefined): Promise<string | null> {
    if (!userId) return null;

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['trainingDepartment'],
      select: ['id'],   // chỉ load relation, không cần toàn bộ user
    });

    return user?.trainingDepartment?.name ?? null;
  }
}
```

**Import cần thiết:**
- `@InjectRepository(User)` từ `@nestjs/typeorm`
- `User` entity từ `../../entities/user.entity`
- `Repository` từ `typeorm`

---

#### 2. `services/langchain-rag-chain.service.ts` — Thay đổi chính

##### 2a. Thread `userOrg` xuống các private methods

```typescript
// Tất cả 3 private methods thêm tham số cuối: userOrg?: string

private async retrieveDocuments(
  question: string,
  currentDate: string,
  topK: number,
  useMMR: boolean,
  userOrg?: string,          // <-- THÊM
): Promise<Document[]>

private async selectAndExecuteTool(
  question: string,
  currentDate: string,
  topK: number,
  useMMR: boolean,
  userOrg?: string,          // <-- THÊM
): Promise<Document[]>

private async retrieveDocumentsWithVerification(
  question: string,
  currentDate: string,
  topK: number,
  useMMR: boolean,
  userOrg?: string,          // <-- THÊM
): Promise<Document[]>
```

##### 2b. Logic inject-then-**parallel-merge** trong `retrieveDocuments()`

> ⚠️ **Thay đổi so với kế hoạch cũ:** Trước đây dùng "retry nếu 0 kết quả". Cách đó sai vì khi user
> hỏi chung ("hiến máu", "hội thảo đoàn trường"), org-injected query vẫn trả về kết quả của khoa
> user → không retry → miss hoàn toàn các hoạt động của trường/đoàn/hội sinh viên.
>
> **Giải pháp mới:** khi `orgInjected = true`, **luôn chạy 2 query song song** (có org + không org),
> sau đó merge kết quả, ưu tiên giữ các doc của khoa user lên trước.

```typescript
// Sau khi extract filters + resolve dates:

// ── Org injection: nếu user không đề cập khoa và có dept từ profile ──────
const userMentionedOrg = (filters.organizationKeywords?.length ?? 0) > 0;
let orgInjected = false;

if (!userMentionedOrg && userOrg) {
  filters = { ...filters, organizationKeywords: [userOrg] };
  orgInjected = true;
  this.logger.debug(`[OrgFilter] Injected user dept: "${userOrg}"`);
}

// ... (phần xử lý isEmpty + search bình thường cho orgDocs) ...

let docs = await this.vectorStoreService.similaritySearchWithMetadataFilters(
  question, filters, topK, currentDate,
);

// ── Parallel broad-search & merge khi org được auto-inject ───────────────
// Lý do: query "hiến máu" với org="KTMT" trả về kết quả KTMT (không retry vì > 0),
// nhưng miss hoạt động của Đoàn trường / Hội sinh viên.
// → Luôn chạy thêm broad search (không có org filter) và merge vào.
if (orgInjected) {
  const filtersWithoutOrg = { ...filters, organizationKeywords: [] };
  const broadDocs = await this.vectorStoreService.similaritySearchWithMetadataFilters(
    question,
    filtersWithoutOrg,
    topK,
    currentDate,
  );

  // Merge: giữ org-specific docs trước, append các broad doc chưa có trong tập đầu
  const seenIds = new Set(docs.map(d => d.metadata?.activityId).filter(Boolean));
  const newDocs = broadDocs.filter(d => !seenIds.has(d.metadata?.activityId));
  docs = [...docs, ...newDocs].slice(0, topK);

  this.logger.debug(
    `[OrgFilter] Parallel merge: ${docs.length - newDocs.length} org-specific + ${newDocs.length} broad → total ${docs.length}`,
  );
}

return docs;
```

**Quan trọng:**
- Parallel merge chỉ thực hiện khi `orgInjected === true` (system inject), KHÔNG khi user tự đề cập khoa
- Org-specific docs được ưu tiên (đứng trước) vì thường có relevance score cao hơn với user's context
- Tổng số docs sau merge bị giới hạn bởi `topK` để không làm tăng chi phí LLM generation

##### 2c. Cập nhật `selectAndExecuteTool()` truyền `userOrg` vào `retrieveDocuments()`

```typescript
case RAG_TOOL_NAMES.FILTERED_SEARCH:
  return this.retrieveDocuments(question, currentDate, topK, false, userOrg);  // +userOrg

// SEMANTIC và DIVERSE không dùng filter extraction, giữ nguyên
// (userOrg vẫn được dùng gián tiếp qua user_org_instruction trong RAG prompt)
```

##### 2d. Cập nhật `invoke()` truyền `userOrg` vào `retrieveDocumentsWithVerification()`

```typescript
// Trong invoke(), Step 5:
const sources = await this.retrieveDocumentsWithVerification(
  rewrittenQuestion, currentDate, k, useMMR, userOrg,  // +userOrg
);
```

Tương tự trong `stream()`.

---

#### 3. `controllers/ctxh-chat.controller.ts` — Fetch dept name

```typescript
// Inject thêm:
private readonly userContextService: UserContextService,

// Trong sendMessage(), TRƯỚC khi gọi invoke():
const userOrgName = await this.userContextService.getTrainingDepartmentName(userId);

// Trong invoke() call:
const response = await this.ragChainService.invoke(
  chatRequestDto.message,
  sessionId,
  {
    k: 5,
    useMMR: false,
    includeHistory: true,
    currentDate,
    currentDayOfWeek,
    currentDatetime,
    userOrg: userOrgName ?? undefined,   // <-- THÊM (đã có field này trong RAGChainOptions)
  }
);
```

`userOrgInstruction` trong prompt đã có sẵn logic inject → LLM cũng nhận được hint về khoa của user.

---

#### 4. `ctxh-chat.module.ts` — Đăng ký `UserContextService`

```typescript
// imports:
TypeOrmModule.forFeature([CtxhEmbedding, CtxhActivity, User]),  // thêm User

// providers:
UserContextService,  // thêm

// exports:
UserContextService,  // thêm (nếu cần dùng ở module khác)
```

---

### Luồng xử lý chi tiết theo các trường hợp

```
Case 1: Câu hỏi chung, không đề cập khoa
────────────────────────────────────────
Query: "Có hoạt động hiến máu nào đang diễn ra không?"
userId = "abc123" → trainingDepartment.name = "Khoa KTMT"

extractFilters() → { status: ["active"], organizationKeywords: [] }
orgInjected = true (inject "Khoa KTMT")
filters → { status: ["active"], organizationKeywords: ["Khoa KTMT"] }

→ Query 1 (org-filtered): tìm HĐ hiến máu của Khoa KTMT
→ Query 2 (broad, song song): tìm HĐ hiến máu không giới hạn org
→ Merge: [KTMT results] + [Đoàn trường / Hội SV results chưa có] → slice(0, topK)
✅ Trả về đầy đủ: cả HĐ khoa user VÀ HĐ chung của trường/đoàn

Case 1b: Câu hỏi chung không có kết quả org-specific
──────────────────────────────────────────────────────
Query: "Hội thảo điện toán đám mây của đoàn trường" (user là khoa KTMT nhưng không nói)
→ Query 1 (org-filtered "KTMT"): 0 kết quả (vì hoạt động thuộc Đoàn trường)
→ Query 2 (broad): tìm được "Hội thảo KHSV - Đoàn trường"
→ Merge: [] + [Đoàn trường results] → slice(0, topK)
✅ Vẫn trả về đúng kết quả

Case 2: Câu hỏi đề cập khoa cụ thể
────────────────────────────────────
Query: "Hoạt động của Liên chi đoàn Khoa Điện tuần này?"
userId = "abc123" → trainingDepartment.name = "Khoa KTMT"

extractFilters() → { organizationKeywords: ["Liên chi đoàn Khoa Điện"], dateRange: {...} }
userMentionedOrg = true → KHÔNG inject "Khoa KTMT"
orgInjected = false → KHÔNG chạy parallel broad search

Search với đúng filter của user → kết quả

Case 3: User không có trainingDepartment
────────────────────────────────────────
userId = "xyz" → trainingDepartment = null → userOrgName = null

Không inject → orgInjected = false → không chạy parallel → behavior giữ nguyên như hiện tại

Case 4: Unauthenticated / userId undefined (không tồn tại vì người dùng bắt buộc phải login, bỏ qua case này)
```

---

### Điểm cần lưu ý khi implement

| Vấn đề | Giải pháp |
|---|---|
| `select: ['id']` khi load user relations | Với TypeORM, `select` chỉ hoạt động cho cột scalar, không cho relations. Dùng `loadRelationIds: false` hoặc bỏ `select`, dùng `findOne({ where, relations })` là đủ |
| Performance: DB query thêm mỗi request | Thêm `@CacheKey` / in-memory LRU cache với TTL ~5 phút theo `userId` trong `UserContextService` nếu cần |
| `isEmpty()` check trong `retrieveDocuments()` | Sau inject, filters không còn empty → sẽ dùng `similaritySearchWithMetadataFilters()` thay vì fallback search. Đây là behavior đúng |
| Retry chỉ dùng `similaritySearchWithMetadataFilters()` | Khi retry (bỏ org), không cần gọi MMR — dùng luôn similarity search để nhất quán |
| `stream()` cũng cần truyền `userOrg` | Cập nhật tương tự invoke() — fetch dept name trong controller trước khi stream |

---

### Tóm tắt các file cần thay đổi

| File | Loại thay đổi |
|---|---|
| `services/user-context.service.ts` | TẠO MỚI |
| `services/langchain-rag-chain.service.ts` | Sửa 3 private methods + inject-then-retry |
| `controllers/ctxh-chat.controller.ts` | Inject `UserContextService` + fetch + pass `userOrg` |
| `ctxh-chat.module.ts` | Add `User` entity + `UserContextService` |
