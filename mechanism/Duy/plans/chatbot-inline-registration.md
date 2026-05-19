# Plan: Đăng ký hoạt động CTXH trực tiếp từ Chatbot

## Tổng quan

Khi AI chatbot trả về danh sách hoạt động CTXH (intent = `RAG_QUERY`), hệ thống sẽ tự trích xuất các hoạt động **đang tuyển** từ RAG sources và trả về dưới dạng structured data. Frontend render thành **activity cards có nút "Đăng ký"** ngay bên dưới nội dung tin nhắn. Người dùng bấm → gọi API đăng ký → card chuyển trạng thái inline với xác nhận (participation ID + status).

## Tại sao cần feature này?

**Hiện tại**, khi student hỏi chatbot về hoạt động CTXH, flow đăng ký có 2 vấn đề:

1. **Flow qua text** (intent `REGISTER_ACTIVITY`): AI tự đăng ký → user chỉ nhận text "✅ Đã đăng ký" → **không có proof** → sợ AI báo thành công nhưng thực tế chưa
2. **Flow thủ công**: User phải rời chat → vào trang Activity Detail → tìm hoạt động → bấm Register → quay lại chat

**Giải pháp**: Cho phép đăng ký ngay trong chat với **visual confirmation** rõ ràng (participation ID, status badge).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (ChatbotPopup)                                │
│                                                         │
│  ┌─────────────────────────────────────────┐            │
│  │ AssistantMessage                         │            │
│  │  ┌──────────────────────────────────┐   │            │
│  │  │ Text: "Có 2 hoạt động sắp..."   │   │            │
│  │  └──────────────────────────────────┘   │            │
│  │  ┌──────────────────────────────────┐   │            │
│  │  │ ActivityRegistrationCard #1      │   │  ← NEW     │
│  │  │  [Tên] [Ngày] [Nút Đăng ký]     │   │            │
│  │  └──────────────────────────────────┘   │            │
│  │  ┌──────────────────────────────────┐   │            │
│  │  │ ActivityRegistrationCard #2      │   │  ← NEW     │
│  │  │  [Tên] [Ngày] [Nút Đăng ký]     │   │            │
│  │  └──────────────────────────────────┘   │            │
│  │  ┌──────────────────────────────────┐   │            │
│  │  │ Follow-up suggestions chips      │   │            │
│  │  └──────────────────────────────────┘   │            │
│  └─────────────────────────────────────────┘            │
│                                                         │
│  Bấm "Đăng ký" ──→ POST /ctxh/activities/:id/register  │
│                       ↓                                 │
│                  ParticipationResponse                   │
│                  { id, status: PENDING|APPROVED }        │
│                       ↓                                 │
│              Card chuyển → ✅ Success state              │
└─────────────────────────────────────────────────────────┘
```

**Tại sao đăng ký từ frontend (REST API) thay vì qua backend chat controller?**
- Tránh race condition (user bấm nhanh 2 lần)
- Cho phép retry khi lỗi mạng
- Card giữ state riêng (loading/success/error) → UX tốt hơn
- Reuse endpoint `POST /ctxh/activities/:id/register` đã có sẵn + đã test

---

## Phase 1: Backend — Trích xuất hoạt động đang tuyển

### Step 1: Thêm `RegistrableActivityDto`

**File:** `backend/src/ctxh-chat/dto/chat-response.dto.ts`

**Thêm class mới** trước class `ChatResponseDto`:

```typescript
export class RegistrableActivityDto {
  @ApiProperty({ description: 'Activity UUID', example: '123e4567-...' })
  @IsString()
  activityId: string;

  @ApiProperty({ description: 'Tên hoạt động', example: 'Chiến dịch Mùa hè xanh 2025' })
  @IsString()
  activityName: string;

  @ApiProperty({ description: 'Tổ chức phụ trách', example: 'Đoàn Khoa CSE' })
  @IsString()
  organizationName: string;

  @ApiProperty({ required: false, example: '2025-06-01' })
  startDate?: string;

  @ApiProperty({ required: false, example: '2025-06-15' })
  endDate?: string;

  @ApiProperty({ required: false, example: 'Quận 9, TP.HCM' })
  location?: string;

  @ApiProperty({ required: false, example: 3 })
  totalDays?: number;

  @ApiProperty({ description: 'Hoạt động có cần duyệt không', example: true })
  requiresApproval: boolean;
}
```

**Thêm field vào `ChatResponseDto`** — sau field `confidence`:

```typescript
  @ApiProperty({
    description: 'List of activities currently recruiting that user can register for',
    type: [RegistrableActivityDto],
    required: false,
  })
  registrableActivities?: RegistrableActivityDto[];
```

---

### Step 2: Extend `RAGResponse` interface

**File:** `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts`

**Code hiện tại** (lines 20-37):
```typescript
export interface RAGResponse {
  response: string;
  sources: Document[];
  responseTime: number;
  sessionId?: string;
  intent?: RouterOutput['intent'];
  registrationTarget?: {
    activityId: string | number;
    activityName: string;
  };
}
```

**Thêm field mới:**
```typescript
export interface RAGResponse {
  response: string;
  sources: Document[];
  responseTime: number;
  sessionId?: string;
  intent?: RouterOutput['intent'];
  registrationTarget?: {
    activityId: string | number;
    activityName: string;
  };
  registrableActivities?: Array<{       // ← THÊM
    activityId: string;
    activityName: string;
    organizationName: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    totalDays?: number;
    requiresApproval: boolean;
  }>;
}
```

---

### Step 3: Thêm method `extractRegistrableActivities()`

**File:** `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts`

**Thêm private method** — đặt gần `findRecruitingActivity()` (sau line ~837):

```typescript
/**
 * Trích xuất tất cả hoạt động đang tuyển từ RAG sources.
 * Khác với findRecruitingActivity() chỉ trả 1, method này trả tất cả.
 */
private extractRegistrableActivities(
  docs: Document[],
  currentDate?: string,
): RAGResponse['registrableActivities'] {
  if (docs.length === 0) return [];

  const today = currentDate ? new Date(currentDate) : new Date();
  today.setHours(0, 0, 0, 0);

  const seen = new Set<string>(); // deduplicate by activityId
  const results: NonNullable<RAGResponse['registrableActivities']> = [];

  for (const doc of docs) {
    const metadata = doc.metadata || {};
    const activityId = metadata.activityId;
    const activityName = metadata.activityName;

    if (!activityId || !activityName || seen.has(String(activityId))) continue;

    const activityStatus = this.normalizeActivityStatus(metadata.status);
    const startRaw = metadata.startDate ? new Date(metadata.startDate) : null;
    const endRaw = metadata.endDate ? new Date(metadata.endDate) : null;
    if (startRaw) startRaw.setHours(0, 0, 0, 0);
    if (endRaw) endRaw.setHours(0, 0, 0, 0);

    // Tính real-time status
    let realtimeStatus: string;
    if (activityStatus === ActivityStatus.CANCELLED || activityStatus === ActivityStatus.COMPLETED) {
      realtimeStatus = 'ended';
    } else if (!startRaw || !endRaw) {
      realtimeStatus = 'unknown';
    } else if (today < startRaw) {
      realtimeStatus = 'upcoming';
    } else if (today > endRaw) {
      realtimeStatus = 'ended';
    } else {
      realtimeStatus = 'ongoing';
    }

    const isRecruiting =
      activityStatus === ActivityStatus.ACTIVE &&
      (realtimeStatus === 'ongoing' || realtimeStatus === 'upcoming');

    if (isRecruiting) {
      seen.add(String(activityId));
      results.push({
        activityId: String(activityId),
        activityName,
        organizationName: metadata.organizationName || 'N/A',
        startDate: startRaw?.toISOString().split('T')[0],
        endDate: endRaw?.toISOString().split('T')[0],
        location: metadata.location,
        totalDays: metadata.totalDays,
        requiresApproval: metadata.requiresApproval ?? true, // default cần duyệt
      });
    }
  }

  return results;
}
```

**Lưu ý logic:**
- Reuse logic từ `findRecruitingActivity()` nhưng collect tất cả thay vì return đầu tiên
- Deduplicate theo `activityId` (nhiều chunks có thể từ cùng 1 activity)
- Chỉ include hoạt động `ACTIVE` + đang trong thời gian tuyển (upcoming/ongoing)
- `requiresApproval` lấy từ metadata — **cần verify** rằng field này có trong vector embeddings

> **⚠️ Cần kiểm tra**: `metadata.requiresApproval` có tồn tại trong embeddings không? Check `CtxhVectorSyncService` / `LangChainIngestionService` xem có embed field `requires_approval` không. Nếu chưa có → cần thêm vào ingestion pipeline hoặc fallback `true`.

---

### Step 4: Gọi method trong `invoke()` + trả về trong RAGResponse

**File:** `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts`

**Vị trí:** Trong `invoke()`, sau bước retrieve documents (step 5), trước bước return (lines 559-571).

**Code hiện tại** (return statement):
```typescript
      return {
        response,
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
        intent,
      };
```

**Sửa thành:**
```typescript
      // Extract registrable activities for inline registration cards
      const registrableActivities = this.extractRegistrableActivities(sources, currentDate);

      return {
        response,
        sources,
        responseTime: Date.now() - startTime,
        sessionId,
        intent,
        registrableActivities,
      };
```

---

### Step 5: Controller pass `registrableActivities` vào ChatResponseDto

**File:** `backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts`

**Code hiện tại** (return statement trong `sendMessage()`):
```typescript
    return {
      sessionId: response.sessionId || sessionId,
      response: response.response,
      sources: response.sources.map(doc => ({
        activityId: doc.metadata?.activityId,
        activityName: doc.metadata?.activityName,
        organizationName: doc.metadata?.organizationName,
        content: doc.pageContent.substring(0, 200) + '...',
        similarityScore: doc.metadata?.score ?? 0,
      })),
      responseTime: response.responseTime,
      timestamp: new Date(),
      followUpSuggestions,
      confidence: this.calculateConfidence(response.sources.length),
      ...(chatRequestDto.evaluation_mode && {
        contexts: response.sources.map(doc => doc.pageContent),
      }),
    };
```

**Thêm field `registrableActivities`:**
```typescript
    return {
      sessionId: response.sessionId || sessionId,
      response: response.response,
      sources: response.sources.map(doc => ({ ... })),
      responseTime: response.responseTime,
      timestamp: new Date(),
      followUpSuggestions,
      confidence: this.calculateConfidence(response.sources.length),
      // Chỉ include khi có hoạt động đang tuyển
      ...(response.registrableActivities?.length && {
        registrableActivities: response.registrableActivities,
      }),
      ...(chatRequestDto.evaluation_mode && {
        contexts: response.sources.map(doc => doc.pageContent),
      }),
    };
```

---

## Phase 2: Frontend — Render cards + đăng ký inline

### Step 6: Cập nhật frontend types

**File:** `frontend/src/features/ctxh-chat/types/chat.types.ts`

**Thêm interface mới:**
```typescript
/** Hoạt động có thể đăng ký trực tiếp từ chatbot */
export interface RegistrableActivity {
  activityId: string;
  activityName: string;
  organizationName: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  totalDays?: number;
  requiresApproval: boolean;
}
```

**Thêm field vào `CtxhChatResponse`:**
```typescript
export interface CtxhChatResponse {
  sessionId: string;
  response: string;
  sources: CtxhSource[];
  responseTime: number;
  timestamp: string;
  followUpSuggestions?: string[];
  confidence?: number;
  registrableActivities?: RegistrableActivity[];  // ← THÊM
}
```

---

### Step 7: Cập nhật adapter — pass activities vào metadata

**File:** `frontend/src/features/ctxh-chat/runtime/ctxh-chat.adapter.ts`

**Code hiện tại** (final yield, lines 85-93):
```typescript
    if (!abortSignal?.aborted) {
      yield {
        content: [{ type: 'text' as const, text: data.response }],
        metadata: {
          custom: {
            followUpSuggestions: data.followUpSuggestions,
            sessionId: data.sessionId,
          },
        },
      };
    }
```

**Sửa thành:**
```typescript
    if (!abortSignal?.aborted) {
      yield {
        content: [{ type: 'text' as const, text: data.response }],
        metadata: {
          custom: {
            followUpSuggestions: data.followUpSuggestions,
            sessionId: data.sessionId,
            registrableActivities: data.registrableActivities,  // ← THÊM
          },
        },
      };
    }
```

---

### Step 8: Tạo component `ActivityRegistrationCard`

**File mới:** `frontend/src/features/ctxh-chat/components/ActivityRegistrationCard.tsx`

**State machine cho nút:**
```
idle ──(click)──→ loading ──(success)──→ success
                           ──(error)────→ error ──(click retry)──→ loading
```

**Props & Logic:**
```typescript
import { useState } from 'react';
import { MapPin, Calendar, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../../../shared/services/apiClient';
import type { RegistrableActivity } from '../types/chat.types';

type CardState = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  activity: RegistrableActivity;
}

interface RegistrationResult {
  id: string;
  status: 'PENDING' | 'APPROVED';
}

export function ActivityRegistrationCard({ activity }: Props) {
  const [state, setState] = useState<CardState>('idle');
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    setState('loading');
    try {
      const res = await apiClient.post<RegistrationResult>(
        `/ctxh/activities/${activity.activityId}/register`,
      );
      setResult(res);
      setState('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra';
      setErrorMsg(msg);
      setState('error');
    }
  };

  // ... render card UI (xem mockup bên dưới)
}
```

**UI Mockup:**

```
┌──────────────────────────────────────────────────────┐
│  📌 Chiến dịch Mùa hè xanh 2025                     │
│  🏢 Đoàn Khoa CSE                                    │
│  📅 01/06/2025 - 15/06/2025  •  📍 Quận 9, TP.HCM   │
│  ⏱️ 3 ngày CTXH                                      │
│                                                      │
│  [🔵 Đăng ký]  ← idle state                          │
│  ℹ️ Cần được duyệt                                   │
│                                                      │
│  ──── hoặc khi loading ────                          │
│  [⏳ Đang đăng ký...]                                │
│                                                      │
│  ──── hoặc khi success ────                          │
│  ✅ Đã đăng ký — Chờ duyệt                           │
│  Mã: #abc123                                         │
│                                                      │
│  ──── hoặc khi error ────                            │
│  ❌ Bạn đã đăng ký hoạt động này rồi                 │
│  [Thử lại]                                           │
└──────────────────────────────────────────────────────┘
```

**Tailwind classes tham khảo** (dựa theo brand style hiện có):
- Card container: `rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm`
- Activity name: `font-semibold text-gray-800`
- Meta text: `text-xs text-gray-500 flex items-center gap-1`
- Register button (idle): `rounded-lg bg-doan-500 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-doan-600`
- Register button (loading): `rounded-lg bg-doan-400 px-3 py-1.5 text-xs text-white cursor-not-allowed`
- Success badge: `flex items-center gap-1 text-xs text-green-600 font-medium`
- Error badge: `flex items-center gap-1 text-xs text-red-600`
- Requires approval hint: `text-[10px] text-amber-600`
- Card animation: `animate-in fade-in-0 slide-in-from-bottom-2 duration-300`

---

### Step 9: Render cards trong ChatbotPopup

**File:** `frontend/src/features/ctxh-chat/components/ChatbotPopup.tsx`

**Sửa `CustomMeta` interface:**
```typescript
// TRƯỚC:
interface CustomMeta {
  followUpSuggestions?: string[];
  sessionId?: string;
}

// SAU:
interface CustomMeta {
  followUpSuggestions?: string[];
  sessionId?: string;
  registrableActivities?: RegistrableActivity[];  // ← THÊM
}
```

**Thêm import:**
```typescript
import { ActivityRegistrationCard } from './ActivityRegistrationCard';
import type { RegistrableActivity } from '../types/chat.types';
```

**Render cards** — chèn vào trong `AssistantMessage`, giữa message bubble và follow-up suggestions.

**Code hiện tại** (simplified):
```tsx
{/* Message bubble */}
<div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-sm">
  <MessagePrimitive.Content components={{ Text: MarkdownText }} />
</div>

{/* Action bar (reload, copy) */}
<div className="flex items-center gap-1 pt-1">
  ...
</div>

{/* Follow-up suggestions */}
{custom.followUpSuggestions && custom.followUpSuggestions.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-1.5">
    ...
  </div>
)}
```

**Chèn registrable activities giữa action bar và follow-up suggestions:**
```tsx
{/* Action bar */}
<div className="flex items-center gap-1 pt-1">...</div>

{/* ← THÊM: Activity registration cards */}
{custom.registrableActivities && custom.registrableActivities.length > 0 && (
  <div className="mt-2 flex flex-col gap-2">
    {custom.registrableActivities.map((activity) => (
      <ActivityRegistrationCard key={activity.activityId} activity={activity} />
    ))}
  </div>
)}

{/* Follow-up suggestions */}
{custom.followUpSuggestions && ...}
```

---

## Phase 3: UX Polish

### Animations

- **Cards fade-in**: Sử dụng Tailwind `animate-in fade-in-0 slide-in-from-bottom-2 duration-300` (cần check tailwindcss-animate plugin có trong project không)
- **Nút đăng ký hover**: `transition-all duration-200 hover:scale-105 hover:shadow-md`
- **Success state**: Icon tick + text slide-in với `transition-all duration-300`
- **Loading spinner**: `<Loader2 className="animate-spin" size={14} />`

### Format ngày tiếng Việt

```typescript
function formatDateVN(isoDate?: string): string {
  if (!isoDate) return 'N/A';
  const d = new Date(isoDate);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
```

---

## Tổng hợp files cần sửa / tạo

| # | File | Action | Mô tả |
|---|------|--------|-------|
| 1 | `backend/src/ctxh-chat/dto/chat-response.dto.ts` | **Sửa** | Thêm `RegistrableActivityDto` class + field trong `ChatResponseDto` |
| 2 | `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts` | **Sửa** | Extend `RAGResponse`, thêm `extractRegistrableActivities()`, gọi trong `invoke()` |
| 3 | `backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts` | **Sửa** | Pass `registrableActivities` vào response DTO |
| 4 | `frontend/src/features/ctxh-chat/types/chat.types.ts` | **Sửa** | Thêm `RegistrableActivity` interface + field trong `CtxhChatResponse` |
| 5 | `frontend/src/features/ctxh-chat/runtime/ctxh-chat.adapter.ts` | **Sửa** | Pass `registrableActivities` vào `metadata.custom` |
| 6 | `frontend/src/features/ctxh-chat/components/ActivityRegistrationCard.tsx` | **Tạo mới** | Component card với nút đăng ký + state machine |
| 7 | `frontend/src/features/ctxh-chat/components/ChatbotPopup.tsx` | **Sửa** | Extend `CustomMeta`, render `ActivityRegistrationCard` list |

**Không sửa:**
- `frontend/src/shared/services/apiClient.ts` — reuse as-is
- `backend/src/ctxh/activity/services/participation.service.ts` — reuse endpoint as-is
- `backend/src/ctxh/activity/activities.controller.ts` — reuse `POST /register` as-is

---

## Data Flow chi tiết

```
1. User hỏi: "Hoạt động CTXH sắp diễn ra?"

2. Backend RAG Chain:
   Router Agent → intent = RAG_QUERY
   → Retrieve 5 documents from pgvector
   → extractRegistrableActivities(docs, "2026-04-20")
     → Filter: ACTIVE + (upcoming|ongoing)
     → Deduplicate by activityId
     → Return: [
         { activityId: "abc", activityName: "Mùa hè xanh", ..., requiresApproval: true },
         { activityId: "def", activityName: "Hiến máu", ..., requiresApproval: false },
       ]
   → Generate RAG response text

3. Controller:
   → Map sources → SourceDto[]
   → Attach registrableActivities to ChatResponseDto
   → Return JSON

4. Frontend Adapter:
   → Fetch response
   → Simulate streaming text
   → Final yield: metadata.custom.registrableActivities = [...]

5. ChatbotPopup:
   → AssistantMessage reads metadata.custom
   → Render text bubble
   → Render ActivityRegistrationCard × 2
   → Render follow-up suggestions

6. User bấm "Đăng ký" trên card "Mùa hè xanh":
   → Card state: idle → loading
   → POST /ctxh/activities/abc/register (via apiClient)
   → Backend ParticipationService.registerSelf("abc", userId)
     → Validate: activity ACTIVE, not already registered, has capacity
     → Create CtxhParticipation { status: PENDING }  (vì requiresApproval=true)
     → Return: { id: "xyz789", status: "PENDING", ... }
   → Card state: loading → success
   → Display: "✅ Đã đăng ký — Chờ duyệt" + "Mã: #xyz789"

7. User bấm "Đăng ký" trên card "Hiến máu":
   → POST /ctxh/activities/def/register
   → ParticipationService → status: APPROVED (vì requiresApproval=false)
   → Card display: "✅ Đã đăng ký thành công"
```

---

## Edge cases & Error handling

| Scenario | Backend Response | Card Display |
|----------|-----------------|--------------|
| Đã đăng ký rồi | 400: "Bạn đã đăng ký hoạt động này" | ❌ "Bạn đã đăng ký rồi" |
| Hết slot (max_participants reached) | 400: "Hoạt động đã đủ số lượng" | ❌ "Hoạt động đã đầy" |
| Activity không còn ACTIVE | 400: "Hoạt động không ở trạng thái mở" | ❌ Message từ backend |
| Network error | fetch throws | ❌ "Lỗi kết nối, vui lòng thử lại" + [Thử lại] |
| GREETING/CHITCHAT intent | Không có `registrableActivities` | Không render cards |
| REGISTER_ACTIVITY intent | Không có `registrableActivities` (giữ flow cũ) | Không render cards |
| Không có hoạt động đang tuyển | `registrableActivities: []` hoặc undefined | Không render cards |
| Nhiều chunks cùng 1 activity | Deduplicate by activityId | 1 card duy nhất |

---

## Verification checklist

### Functional tests
- [ ] Hỏi "hoạt động CTXH sắp diễn ra?" → response có `registrableActivities` array
- [ ] Cards render đúng thông tin (tên, tổ chức, ngày, địa điểm, số ngày)
- [ ] Bấm "Đăng ký" → card chuyển loading → success với participation ID
- [ ] Activity có `requiresApproval=true` → hiện "Cần được duyệt" hint + success hiện "Chờ duyệt"
- [ ] Activity có `requiresApproval=false` → success hiện "Đã đăng ký thành công"
- [ ] Đăng ký trùng → hiện error message
- [ ] Hỏi "xin chào" (GREETING) → không có cards
- [ ] Hỏi "đăng ký tôi vào..." (REGISTER_ACTIVITY) → không có cards, giữ flow cũ
- [ ] Sau đăng ký qua chat → vào Activity Detail → tab Participants → thấy tên mình

### UX tests
- [ ] Cards có animation fade-in
- [ ] Nút disabled sau khi success (không bấm lại được)
- [ ] Error state có nút "Thử lại"
- [ ] Loading state hiện spinner
- [ ] Responsive trong popup chat (không overflow)

---

## Quyết định thiết kế

| Quyết định | Lý do |
|-----------|-------|
| Đăng ký từ frontend REST API | Tránh race condition, cho retry, card giữ state riêng |
| Verification = response từ register API | `ParticipationResponse.id` + `status` là proof, không cần API verify riêng |
| Chỉ cho RAG_QUERY intent | REGISTER_ACTIVITY giữ flow cũ (auto-register qua text) |
| Không check trùng trước khi render nút | Tốn N API calls mỗi response, handle error khi bấm là đủ |
| Hiện `requiresApproval` hint | User biết trước sẽ phải chờ duyệt, tránh confused |
| Chỉ cho student | Staff dùng flow khác (StaffAgentService) |
| `requiresApproval` default `true` | An toàn hơn nếu metadata thiếu field này |

---

## Scope ngoài (không làm)

- Cancel registration từ chat
- Email/notification từ chat
- Staff inline registration
- Hiển thị số slot còn lại trên card
- Deep link từ card sang Activity Detail page
