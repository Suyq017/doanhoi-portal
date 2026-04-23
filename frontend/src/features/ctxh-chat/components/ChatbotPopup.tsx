import { type FC, memo, forwardRef, useEffect, useState } from 'react';
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  useMessage,
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface CustomMeta {
  followUpSuggestions?: string[];
  sessionId?: string;
}

// ── Markdown ───────────────────────────────────────────────────────────────
const MarkdownText: FC = memo(() => (
  <MarkdownTextPrimitive className="prose prose-sm max-w-none text-gray-800 prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-code:text-doan-500 prose-headings:text-gray-900 prose-a:text-hsv-500 prose-strong:text-gray-900" />
));
MarkdownText.displayName = 'MarkdownText';

// ── Tooltip Button ─────────────────────────────────────────────────────────
const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tooltip: string }
>(({ tooltip, className, children, ...props }, ref) => (
  <button
    ref={ref}
    title={tooltip}
    className={`inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-gray-100 ${className ?? ''}`}
    {...props}
  >
    {children}
  </button>
));
TooltipIconButton.displayName = 'TooltipIconButton';

// ── Thinking Animation ────────────────────────────────────────────────────
const ThinkingAnimation: FC = () => {
  const steps = ['Đang suy nghĩ', 'Đang tìm kiếm', 'Đang tổng hợp'];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-doan-500/70"
            style={{
              animation: 'thinking-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </span>
      <span
        key={step}
        className="text-xs text-gray-400"
        style={{ animation: 'thinking-fade 0.4s ease-in-out' }}
      >
        {steps[step]}
      </span>
    </div>
  );
};

// ── Assistant Message ──────────────────────────────────────────────────────
const AssistantMessage: FC = () => {
  const message = useMessage();
  const custom = (message.metadata?.custom ?? {}) as CustomMeta;
  const textContent = message.content
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('');
  const isThinking = message.status?.type === 'running' && textContent.length === 0;

  return (
    <MessagePrimitive.Root className="flex w-full gap-2 px-3">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-full shadow-sm overflow-hidden transition-all ${
          isThinking ? 'opacity-60 animate-pulse' : ''
        }`}
      >
        <img src="/assets/HCMCUT.png" alt="HCMUT" className="size-7 object-cover" />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {isThinking ? (
          <ThinkingAnimation />
        ) : (
          <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100 text-sm">
            <MessagePrimitive.Content components={{ Text: MarkdownText }} />
          </div>
        )}

        <div className="flex items-center gap-1 pt-1">
          <BranchPicker />
          <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            autohideFloat="single-branch"
            className="flex items-center gap-0.5"
          >
            <ActionBarPrimitive.Reload asChild>
              <TooltipIconButton tooltip="Tạo lại" className="text-gray-400 hover:text-gray-600">
                <RefreshCw size={12} />
              </TooltipIconButton>
            </ActionBarPrimitive.Reload>
            <ActionBarPrimitive.Copy asChild>
              <TooltipIconButton tooltip="Sao chép" className="text-gray-400 hover:text-gray-600">
                <AuiIf condition={(s) => s.message.isCopied}>
                  <Check size={12} className="text-green-500" />
                </AuiIf>
                <AuiIf condition={(s) => !s.message.isCopied}>
                  <Copy size={12} />
                </AuiIf>
              </TooltipIconButton>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>

        {custom.followUpSuggestions && custom.followUpSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {custom.followUpSuggestions.map((s) => (
              <button
                key={s}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-hsv-500/30 hover:bg-hsv-50 hover:text-hsv-500"
                onClick={() => {
                  const el = document.querySelector<HTMLTextAreaElement>(
                    '[data-aui-composer-input]',
                  );
                  if (el) {
                    const setter = Object.getOwnPropertyDescriptor(
                      window.HTMLTextAreaElement.prototype,
                      'value',
                    )?.set;
                    setter?.call(el, s);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};

// ── User Message ───────────────────────────────────────────────────────────
const UserMessage: FC = () => (
  <MessagePrimitive.Root className="flex w-full flex-col items-end px-3">
    <div className="max-w-[85%] rounded-2xl bg-doan-500 px-3.5 py-2 text-sm text-white">
      <MessagePrimitive.Content />
    </div>
  </MessagePrimitive.Root>
);

// ── Edit Composer ──────────────────────────────────────────────────────────
const EditComposer: FC = () => (
  <ComposerPrimitive.Root className="mx-3 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
    <ComposerPrimitive.Input className="h-8 w-full resize-none bg-transparent px-3 pt-2 text-sm text-gray-800 outline-none" />
    <div className="m-2 flex items-center justify-end gap-2">
      <ComposerPrimitive.Cancel className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
        Huỷ
      </ComposerPrimitive.Cancel>
      <ComposerPrimitive.Send className="rounded-full bg-doan-500 px-2.5 py-1 text-xs text-white hover:bg-doan-600">
        Gửi
      </ComposerPrimitive.Send>
    </div>
  </ComposerPrimitive.Root>
);

// ── Branch Picker ──────────────────────────────────────────────────────────
const BranchPicker: FC<{ className?: string }> = ({ className }) => (
  <BranchPickerPrimitive.Root
    hideWhenSingleBranch
    className={`inline-flex items-center text-xs text-gray-400 ${className ?? ''}`}
  >
    <BranchPickerPrimitive.Previous asChild>
      <TooltipIconButton tooltip="Trước" className="text-gray-400 hover:text-gray-600">
        <ChevronLeft size={12} />
      </TooltipIconButton>
    </BranchPickerPrimitive.Previous>
    <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
    <BranchPickerPrimitive.Next asChild>
      <TooltipIconButton tooltip="Sau" className="text-gray-400 hover:text-gray-600">
        <ChevronRight size={12} />
      </TooltipIconButton>
    </BranchPickerPrimitive.Next>
  </BranchPickerPrimitive.Root>
);

// ── Suggested Chips ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Xin chào! Chatbot này có thể giúp gì cho tôi?',
  'Hoạt động CTXH nào đang diễn ra?',
  'Điểm CTXH hiện tại của tôi?',
];

// ── Main Popup ─────────────────────────────────────────────────────────────
export function ChatbotPopup({
  onClose,
  onClear,
}: {
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="fixed bottom-24 right-6 z-[9998] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl
        w-[min(33vw,480px)] min-w-[360px] h-[min(66vh,720px)] min-h-[500px]
        max-[1023px]:w-[50vw] max-[1023px]:h-[70vh]
        max-[767px]:inset-0 max-[767px]:w-full max-[767px]:h-full max-[767px]:rounded-none max-[767px]:min-w-0 max-[767px]:min-h-0"
      style={{
        animation: 'chatbot-slide-up 200ms ease-out',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full overflow-hidden shadow-sm">
          <img src="/assets/HCMCUT.png" alt="HCMUT" className="size-9 object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800 leading-tight">Đoàn Hội Chatbot</h3>
          <p className="text-[11px] text-gray-500 leading-tight">
            Trợ lý AI của Đoàn TN - Hội SV ĐHBK
          </p>
        </div>
        <button
          onClick={onClear}
          title="Cuộc hội thoại mới"
          className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={onClose}
          title="Đóng"
          className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Chat Thread ─────────────────────────────────────────────── */}
      <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="flex flex-1 flex-col gap-4 overflow-y-auto bg-gray-50/50 pt-4 pb-3">
          {/* Welcome */}
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <div className="flex flex-col items-center px-4 pt-4">
              <div className="flex size-12 items-center justify-center rounded-full overflow-hidden shadow-lg shadow-doan-500/20">
                <img src="/assets/HCMCUT.png" alt="HCMUT" className="size-12 object-cover" />
              </div>
              <p className="mt-3 text-center text-sm font-semibold text-gray-800">
                Xin chào! Tôi có thể giúp gì?
              </p>
              <p className="mt-1 text-center text-xs text-gray-400">
                Hỏi về hoạt động Đoàn Hội, CTXH...
              </p>

              {/* Suggested Chips */}
              <div className="mt-5 flex flex-wrap justify-center gap-2 px-2">
                {SUGGESTIONS.map((q) => (
                  <ThreadPrimitive.Suggestion key={q} prompt={q} autoSend asChild>
                    <button className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-600 transition-all hover:bg-blue-50 hover:border-blue-300">
                      {q}
                    </button>
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </AuiIf>

          {/* Messages */}
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              EditComposer,
              AssistantMessage,
            }}
          />
        </ThreadPrimitive.Viewport>

        {/* ── Input Footer ────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 bg-white px-3 pb-2 pt-2">
          <ComposerPrimitive.Root className="flex items-end rounded-full border border-gray-200 bg-gray-50 pl-4 pr-1 transition-colors focus-within:border-doan-500/40 focus-within:bg-white focus-within:shadow-sm">
            <ComposerPrimitive.Input
              data-aui-composer-input
              placeholder="Hỏi về hoạt động Đoàn Hội..."
              className="h-10 max-h-24 grow resize-none bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
            <AuiIf condition={(s) => !s.thread.isRunning}>
              <ComposerPrimitive.Send className="m-1 flex size-8 items-center justify-center rounded-full bg-doan-500 transition-all hover:bg-doan-600 disabled:bg-gray-200">
                <ArrowUp size={14} className="text-white" />
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={(s) => s.thread.isRunning}>
              <ComposerPrimitive.Cancel className="m-1 flex size-8 items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400">
                <div className="size-2 rounded-sm bg-white" />
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </ComposerPrimitive.Root>
        </div>
      </ThreadPrimitive.Root>
    </div>
  );
}
