import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useLocalRuntime, AssistantRuntimeProvider } from '@assistant-ui/react';
import { ctxhChatAdapter } from '../runtime/ctxh-chat.adapter';
import { ChatbotPopup } from './ChatbotPopup';

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const runtimeRef = useRef<ReturnType<typeof useLocalRuntime> | null>(null);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <>
      {/* Popup — always mounted to preserve conversation history; hidden via CSS when closed */}
      <ChatbotPopupWrapper isOpen={isOpen} onClose={toggle} runtimeRef={runtimeRef} />

      {/* Floating Button */}
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[9999] flex size-14 items-center justify-center overflow-hidden rounded-full bg-doan-500 text-white shadow-lg shadow-doan-500/30 transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-doan-500/40"
        aria-label={isOpen ? 'Đóng chatbot' : 'Mở chatbot'}
      >
        {/* Chat icon — xoay ra khi mở */}
        <span
          className={`absolute transition-all duration-300 ease-in-out ${
            isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        >
          <MessageCircle size={24} />
        </span>

        {/* X icon — xoay vào khi mở */}
        <span
          className={`absolute transition-all duration-300 ease-in-out ${
            isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        >
          <X size={24} />
        </span>
      </button>
    </>
  );
}

function ChatbotPopupWrapper({
  isOpen,
  onClose,
  runtimeRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  runtimeRef: React.MutableRefObject<ReturnType<typeof useLocalRuntime> | null>;
}) {
  const runtime = useLocalRuntime(ctxhChatAdapter);

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime, runtimeRef]);

  const handleClear = useCallback(async () => {
    await runtime.threads.switchToNewThread();
  }, [runtime]);

  return (
    // Use visibility+pointer-events instead of conditional rendering so the
    // runtime (and its conversation history) is never destroyed on close.
    <div className={isOpen ? '' : 'invisible pointer-events-none'}>
      <AssistantRuntimeProvider runtime={runtime}>
        <ChatbotPopup onClose={onClose} onClear={handleClear} />
      </AssistantRuntimeProvider>
    </div>
  );
}
