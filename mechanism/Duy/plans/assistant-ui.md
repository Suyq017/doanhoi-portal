# Kế Hoạch Hiện Thực Trang Chatbot CTXH (assistant-ui)

> Dùng thư viện `@assistant-ui/react` để xây dựng trang chatbot độc lập tại `/portal/ctxh/chatbot`

---

## Tổng Quan Kiến Trúc

```
frontend/src/features/ctxh-chat/
├── components/
│   ├── CtxhThread.tsx          # Thread với custom message renderer
│   ├── CtxhComposer.tsx        # Composer (input box)
│   ├── SourceCard.tsx          # Card hiển thị 1 RAG source
│   └── SourceList.tsx          # Danh sách sources dưới message
├── runtime/
│   └── ctxh-chat.adapter.ts    # ChatModelAdapter → gọi NestJS API
├── types/
│   └── chat.types.ts           # TypeScript types khớp với backend DTOs
├── pages/
│   └── CtxhChatPage.tsx        # Trang độc lập, đăng ký trong App.tsx
└── index.ts                    # Re-export
```

**Runtime pattern được chọn**: `LocalRuntime` + `ChatModelAdapter`

- Backend là NestJS tự viết → không dùng Vercel AI SDK hay LangGraph Cloud
- `LocalRuntime` nhận vào một adapter tùy chỉnh, adapter có nhiệm vụ gọi API và stream kết quả về
- Adapter đọc SSE từ `POST /api/ctxh-chat/stream` và push từng chunk vào `update.appendText()`
- Sources được đính kèm vào message qua `update.result()` dạng tool call ảo

---

## Bước 1 — Cài Đặt Packages

```bash
npm install @assistant-ui/react @assistant-ui/react-markdown
```

Các package đi kèm đã có sẵn trong `package.json` hiện tại:
- `@radix-ui/react-*` (dùng bởi assistant-ui primitives)
- `tailwindcss` + `clsx` + `tailwind-merge`
- `@tanstack/react-query`
- `lucide-react`

Thêm vào `tailwind.config.js`:
```js
// Để assistant-ui resolve class đúng khi dùng shadcn preset
content: [
  './src/**/*.{ts,tsx}',
  './node_modules/@assistant-ui/react/dist/**/*.js',   // ← thêm dòng này
],
```

---

## Bước 2 — Types (`types/chat.types.ts`)

Khớp 1-1 với `ChatRequestDto` / `ChatResponseDto` / `SourceDto` của backend:

```typescript
/** Khớp với SourceDto backend */
export interface CtxhSource {
  activityId: string;
  activityName: string;
  organizationName: string;
  similarityScore: number;
  content?: string;
  link?: string;
}

/** Khớp với ChatResponseDto backend */
export interface CtxhChatResponse {
  sessionId: string;
  response: string;
  sources: CtxhSource[];
  responseTime: number;
  timestamp: string;
  followUpSuggestions?: string[];
  confidence?: number;
}

/** Dữ liệu extra gắn vào AssistantMessage để render sources */
export interface MessageMetadata {
  sources: CtxhSource[];
  responseTime: number;
  confidence?: number;
  followUpSuggestions?: string[];
}
```

---

## Bước 3 — ChatModelAdapter (`runtime/ctxh-chat.adapter.ts`)

Đây là **trái tim** của tích hợp. Adapter nhận prompt, gọi SSE endpoint, đẩy từng chunk vào `update.appendText()`, khi xong gắn sources vào metadata.

```typescript
import type { ChatModelAdapter, ChatModelRunOptions } from '@assistant-ui/react';
import { authService } from '../../../features/auth/services/authService';
import type { CtxhChatResponse, MessageMetadata } from '../types/chat.types';

const BACKEND = import.meta.env.VITE_BACKEND_API_URL || '';

export const ctxhChatAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }: ChatModelRunOptions) {
    // Lấy message cuối cùng của user
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUserMsg?.content
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('\n') ?? '';

    // Lấy sessionId từ metadata của message đầu tiên (nếu có)
    const firstAssistant = messages.find((m) => m.role === 'assistant');
    const sessionId: string | undefined = (firstAssistant?.metadata as any)?.sessionId;

    const token = authService.getAccessToken();

    // ── TRY STREAMING TRƯỚC ──────────────────────────────────────────
    try {
      const res = await fetch(`${BACKEND}/api/ctxh-chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userText, sessionId }),
        signal: abortSignal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let currentSessionId = sessionId;
      let sources: CtxhChatResponse['sources'] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        // Parse SSE lines: "data: {...}\n\n"
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json || json === '[DONE]') continue;

          try {
            const event = JSON.parse(json);

            if (event.type === 'content' && event.content) {
              fullText += event.content;
              yield { type: 'text-delta', textDelta: event.content };
            }

            if (event.type === 'complete') {
              currentSessionId = event.sessionId ?? currentSessionId;
              sources = event.sources ?? [];
            }
          } catch {
            // chunk bị split — bỏ qua, sẽ join ở chunk tiếp theo
          }
        }
      }

      // Gắn metadata vào message vừa hoàn thành
      const meta: MessageMetadata = {
        sources,
        responseTime: 0,
        sessionId: currentSessionId,
      } as any;
      yield { type: 'finish', finishReason: 'stop', metadata: meta as any };

    // ── FALLBACK NON-STREAMING ───────────────────────────────────────
    } catch (streamErr) {
      console.warn('[ctxh-chat] streaming failed, falling back to /message', streamErr);

      const res = await fetch(`${BACKEND}/api/ctxh-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userText, sessionId }),
        signal: abortSignal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CtxhChatResponse = await res.json();

      yield { type: 'text-delta', textDelta: data.response };

      const meta: MessageMetadata = {
        sources: data.sources,
        responseTime: data.responseTime,
        confidence: data.confidence,
        followUpSuggestions: data.followUpSuggestions,
        sessionId: data.sessionId,
      } as any;
      yield { type: 'finish', finishReason: 'stop', metadata: meta as any };
    }
  },
};
```

> **Lưu ý SSE**: NestJS `@Sse()` gửi `data: { type, content }` dạng JSON.  
> Nếu backend stream thực tế chỉ gửi plain-text chunk thì đổi parse logic cho phù hợp.

---

## Bước 4 — SourceCard & SourceList (`components/`)

**`SourceCard.tsx`**

```tsx
import type { CtxhSource } from '../types/chat.types';

interface Props { source: CtxhSource; }

export function SourceCard({ source }: Props) {
  const pct = Math.round(source.similarityScore * 100);
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-900 truncate">{source.activityName}</p>
        <p className="text-blue-600 truncate">{source.organizationName}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="h-1.5 w-20 rounded-full bg-blue-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-blue-500">{pct}% khớp</span>
        </div>
      </div>
      {source.link && (
        <a
          href={source.link}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-blue-600 hover:underline font-medium"
        >
          Xem →
        </a>
      )}
    </div>
  );
}
```

**`SourceList.tsx`**

```tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SourceCard } from './SourceCard';
import type { CtxhSource } from '../types/chat.types';

interface Props { sources: CtxhSource[]; }

export function SourceList({ sources }: Props) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {sources.length} nguồn tham khảo
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {sources.map((s) => <SourceCard key={s.activityId} source={s} />)}
        </div>
      )}
    </div>
  );
}
```

---

## Bước 5 — CtxhThread (`components/CtxhThread.tsx`)

Dùng `ThreadPrimitive` + `MessagePrimitive` từ `@assistant-ui/react`, kết hợp `SourceList` custom:

```tsx
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  useMessage,
} from '@assistant-ui/react';
import { Markdown } from '@assistant-ui/react-markdown';
import { SourceList } from './SourceList';
import type { MessageMetadata } from '../types/chat.types';
import { Send, Trash2, Bot, User } from 'lucide-react';

// ── Renderer cho 1 message ─────────────────────────────────────────────────
function AssistantMessage() {
  const message = useMessage();
  const meta = (message.metadata as unknown as MessageMetadata) ?? {};

  return (
    <MessagePrimitive.Root className="flex gap-3 py-3 px-4">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <Bot size={16} className="text-green-600" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Nội dung markdown */}
        <div className="prose prose-sm max-w-none text-gray-800">
          <MessagePrimitive.Content components={{ Text: Markdown }} />
        </div>

        {/* RAG Sources */}
        {meta.sources && <SourceList sources={meta.sources} />}

        {/* Footer */}
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
          {meta.responseTime != null && (
            <span>⚡ {(meta.responseTime / 1000).toFixed(1)}s</span>
          )}
          {meta.confidence != null && (
            <span>🎯 {meta.confidence}% tự tin</span>
          )}
          {/* Copy / Reload */}
          <ActionBarPrimitive.Root className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <ActionBarPrimitive.Copy className="hover:text-gray-600 cursor-pointer" />
            <ActionBarPrimitive.Reload className="hover:text-gray-600 cursor-pointer" />
          </ActionBarPrimitive.Root>
        </div>

        {/* Follow-up suggestions */}
        {meta.followUpSuggestions?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meta.followUpSuggestions.map((s) => (
              <button
                key={s}
                className="text-xs border border-blue-200 rounded-full px-2.5 py-1
                           text-blue-600 hover:bg-blue-50 transition-colors"
                // ComposerPrimitive.Input có thể được ref và set value — 
                // hoặc đơn giản là dispatch custom event
                onClick={() => {
                  const el = document.querySelector<HTMLTextAreaElement>('[data-aui-composer-input]');
                  if (el) { el.value = s; el.dispatchEvent(new Event('input', { bubbles: true })); }
                }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </MessagePrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex gap-3 py-3 px-4 flex-row-reverse">
      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
        <User size={16} className="text-white" />
      </div>
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-500 text-white px-4 py-2.5 text-sm">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

// ── Thread chính ─────────────────────────────────────────────────────────────
export function CtxhThread({ onClear }: { onClear?: () => void }) {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-green-600" />
          <span className="font-semibold text-gray-800">Trợ lý CTXH</span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} /> Xoá hội thoại
          </button>
        )}
      </div>

      {/* Message list */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {/* Welcome screen khi chưa có tin nhắn */}
        <ThreadPrimitive.Empty>
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <Bot size={32} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Xin chào! Tôi là trợ lý CTXH</h2>
              <p className="text-sm text-gray-500 mt-1">Hỏi tôi về các hoạt động cộng đồng, tình nguyện...</p>
            </div>
            {/* Gợi ý mẫu */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {[
                'Có hoạt động tình nguyện nào đang mở không?',
                'Hoạt động nào diễn ra tháng này?',
                'Tôi có thể đăng ký CTXH ở đâu?',
              ].map((q) => (
                <ComposerPrimitive.Input key={q} asChild>
                  {/* Nút gợi ý điền vào composer */}
                  <button
                    className="text-xs border border-gray-200 rounded-full px-3 py-1.5
                               bg-white hover:bg-gray-50 text-gray-600 transition-colors"
                    onClick={() => {}} // ComposerPrimitive.Input asChild tự handle
                  >
                    {q}
                  </button>
                </ComposerPrimitive.Input>
              ))}
            </div>
          </div>
        </ThreadPrimitive.Empty>

        {/* Messages */}
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />

        {/* Typing indicator */}
        <ThreadPrimitive.If running>
          <div className="flex gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Bot size={16} className="text-green-600" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        </ThreadPrimitive.If>
      </ThreadPrimitive.Viewport>

      {/* Composer */}
      <div className="border-t bg-white p-3">
        <ComposerPrimitive.Root className="flex items-end gap-2 rounded-xl border border-gray-200
                                           bg-gray-50 px-3 py-2 focus-within:border-blue-400
                                           focus-within:ring-1 focus-within:ring-blue-100 transition">
          <ComposerPrimitive.Input
            data-aui-composer-input
            placeholder="Hỏi về hoạt động CTXH..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none max-h-32
                       placeholder:text-gray-400 leading-relaxed"
          />
          <ComposerPrimitive.Send className="shrink-0 w-8 h-8 rounded-lg bg-blue-500
                                             hover:bg-blue-600 disabled:bg-gray-200
                                             flex items-center justify-center transition-colors">
            <Send size={14} className="text-white" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          Trả lời dựa trên dữ liệu CTXH của Đoàn Trường ĐHBK
        </p>
      </div>
    </ThreadPrimitive.Root>
  );
}
```

---

## Bước 6 — CtxhChatPage (`pages/CtxhChatPage.tsx`)

Đây là trang độc lập, bọc `LocalRuntime` + `CtxhThread`:

```tsx
import { useLocalRuntime, AssistantRuntimeProvider } from '@assistant-ui/react';
import { useCallback, useRef } from 'react';
import { ctxhChatAdapter } from '../runtime/ctxh-chat.adapter';
import { CtxhThread } from '../components/CtxhThread';

export function CtxhChatPage() {
  const runtime = useLocalRuntime(ctxhChatAdapter);

  const handleClear = useCallback(async () => {
    // LocalRuntime không có built-in clearThread, tạo thread mới
    await runtime.threads.switchToNewThread();
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Trang full-height, bên dưới navbar của Layout */}
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <CtxhThread onClear={handleClear} />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

---

## Bước 7 — Đăng Ký Route trong App.tsx

Thêm vào block CTXH Routes trong `frontend/src/App.tsx`:

```tsx
// Import ở đầu file
import { CtxhChatPage } from './features/ctxh-chat';

// Thêm route vào <Routes> bên trong AuthGuard
<Route
  path="ctxh/chatbot"
  element={
    <EnhancedProtectedRoute requiredPermissions={['ctxh.access']}>
      <Layout>
        <CtxhChatPage />
      </Layout>
    </EnhancedProtectedRoute>
  }
/>
```

URL cuối cùng: **`/portal/ctxh/chatbot`**

---

## Bước 8 — index.ts

```typescript
export { CtxhChatPage } from './pages/CtxhChatPage';
export { ctxhChatAdapter } from './runtime/ctxh-chat.adapter';
```

---

## Checklist Triển Khai

| # | Task | File | Phụ thuộc |
|---|------|------|-----------|
| 1 | Cài packages | – | – |
| 2 | Cập nhật `tailwind.config.js` | `tailwind.config.js` | Bước 1 |
| 3 | Tạo `chat.types.ts` | `types/chat.types.ts` | – |
| 4 | Tạo `ctxh-chat.adapter.ts` | `runtime/` | Bước 3 |
| 5 | Tạo `SourceCard` + `SourceList` | `components/` | Bước 3 |
| 6 | Tạo `CtxhThread.tsx` | `components/` | Bước 4+5 |
| 7 | Tạo `CtxhChatPage.tsx` | `pages/` | Bước 5+6 |
| 8 | Tạo `index.ts` | `features/ctxh-chat/` | Bước 7 |
| 9 | Đăng ký route | `App.tsx` | Bước 8 |

---

## Lưu Ý Quan Trọng

### 1. SSE + JWT Auth
`EventSource` của browser không hỗ trợ custom header → phải dùng `fetch()` + `ReadableStream` như trong adapter trên.

### 2. metadata trên AssistantMessage
`assistant-ui` v0.11+ cho phép đính kèm metadata tùy ý vào message qua `yield { type: 'finish', metadata }`. Dùng điều này để truyền `sources`, `responseTime`, `followUpSuggestions` từ backend về component.

### 3. sessionId persistence
`LocalRuntime` không tự persist session xuống localStorage. Nếu muốn giữ hội thoại sau refresh:
- Lưu `sessionId` vào `localStorage` trong adapter mỗi khi nhận được từ backend
- Khi khởi tạo, đọc lại từ `localStorage` và truyền theo request

### 4. Clear session ↔ backend
Khi user bấm "Xoá hội thoại":
1. Gọi `DELETE /api/ctxh-chat/session/:sessionId` (xoá memory trên server)
2. Gọi `runtime.threads.switchToNewThread()` (reset state trên client)

### 5. Nếu backend SSE format khác
Kiểm tra format thực tế từ `@Sse('stream')` trong `ctxh-chat.controller.ts`. NestJS mặc định gửi:
```
data: {"data": {...}}\n\n
```  
Chú ý field là `event.data.data` chứ không phải `event.data`.

---

## Tài Liệu Tham Khảo assistant-ui

- [LocalRuntime](https://www.assistant-ui.com/docs/runtimes/custom/local) — runtime được chọn
- [ThreadPrimitive](https://www.assistant-ui.com/docs/api-reference/primitives/thread) — message list, viewport
- [ComposerPrimitive](https://www.assistant-ui.com/docs/api-reference/primitives/composer) — input + send
- [MessagePrimitive](https://www.assistant-ui.com/docs/api-reference/primitives/message) — render message
- [ActionBarPrimitive](https://www.assistant-ui.com/docs/api-reference/primitives/action-bar) — copy, reload
- [Markdown](https://www.assistant-ui.com/docs/ui/markdown) — render markdown trong message
- [Suggestions](https://www.assistant-ui.com/docs/guides/suggestions) — follow-up suggestions

