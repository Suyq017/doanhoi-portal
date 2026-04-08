import { useLocalRuntime, AssistantRuntimeProvider } from '@assistant-ui/react';
import { useCallback } from 'react';
import { ctxhChatAdapter } from '../runtime/ctxh-chat.adapter';
import { CtxhThread } from '../components/CtxhThread';

export function CtxhChatPage() {
  const runtime = useLocalRuntime(ctxhChatAdapter);

  const handleClear = useCallback(async () => {
    // Tạo thread mới — reset toàn bộ hội thoại phía client
    await runtime.threads.switchToNewThread();
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Full-page chatbot — stretches to fill available height */}
      <div className="flex flex-col border-2 rounded h-[calc(100vh-64px)]">
        <CtxhThread onClear={handleClear} />
      </div>
    </AssistantRuntimeProvider>
  );
}
