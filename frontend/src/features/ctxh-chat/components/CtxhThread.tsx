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
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Pencil,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { type FC, memo, forwardRef, useEffect, useState } from 'react';

// ── Custom metadata type ───────────────────────────────────────────────────
interface CustomMeta {
  followUpSuggestions?: string[];
  sessionId?: string;
}

// ── Markdown renderer (light theme) ────────────────────────────────────────
const MarkdownText: FC = memo(() => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none text-gray-800 prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-code:text-doan-500 prose-headings:text-gray-900 prose-a:text-hsv-500 prose-strong:text-gray-900"
    />
  );
});
MarkdownText.displayName = 'MarkdownText';

// ── Tooltip icon button ────────────────────────────────────────────────────
const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tooltip: string }
>(({ tooltip, className, children, ...props }, ref) => (
  <button
    ref={ref}
    title={tooltip}
    className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-gray-100 ${className ?? ''}`}
    {...props}
  >
    {children}
  </button>
));
TooltipIconButton.displayName = 'TooltipIconButton';

// ── Thinking animation ────────────────────────────────────────────────────
const ThinkingAnimation: FC = () => {
  // Cycle through labels to give a sense of progress
  const steps = ['Đang suy nghĩ', 'Đang tìm kiếm', 'Đang tổng hợp'];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2.5 py-1">
      {/* Three bouncing dots */}
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-doan-500/70"
            style={{
              animation: 'thinking-bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </span>
      {/* Cycling label */}
      <span
        key={step}
        className="text-sm text-gray-400"
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

  // Detect thinking phase: running but no text emitted yet
  const textContent = message.content
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('');
  const isThinking = message.status?.type === 'running' && textContent.length === 0;

  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl gap-3 px-4">
      {/* Avatar */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full shadow-sm transition-all ${
          isThinking ? 'bg-doan-500/60 animate-pulse' : 'bg-doan-500'
        }`}
      >
        <GraduationCap size={16} className="text-white" />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {/* Thinking animation OR streamed content */}
        {isThinking ? (
          <ThinkingAnimation />
        ) : (
          <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        )}

        {/* Action bar + Branch picker */}
        <div className="flex items-center gap-1 pt-2">
          <BranchPicker />

          <ActionBarPrimitive.Root
            hideWhenRunning
            autohide="not-last"
            autohideFloat="single-branch"
            className="flex items-center gap-1 rounded-lg data-[floating]:absolute data-[floating]:border data-[floating]:border-gray-200 data-[floating]:bg-white data-[floating]:p-1 data-[floating]:shadow-sm"
          >
            <ActionBarPrimitive.Reload asChild>
              <TooltipIconButton tooltip="Tạo lại" className="text-gray-400 hover:text-gray-600">
                <RefreshCw size={14} />
              </TooltipIconButton>
            </ActionBarPrimitive.Reload>
            <ActionBarPrimitive.Copy asChild>
              <TooltipIconButton tooltip="Sao chép" className="text-gray-400 hover:text-gray-600">
                <AuiIf condition={(s) => s.message.isCopied}>
                  <Check size={14} className="text-green-500" />
                </AuiIf>
                <AuiIf condition={(s) => !s.message.isCopied}>
                  <Copy size={14} />
                </AuiIf>
              </TooltipIconButton>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>

        {/* Follow-up suggestions */}
        {custom.followUpSuggestions && custom.followUpSuggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {custom.followUpSuggestions.map((s) => (
              <button
                key={s}
                className="rounded-2xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-600 shadow-sm transition-colors hover:border-hsv-500/30 hover:bg-hsv-50 hover:text-hsv-500"
                onClick={() => {
                  const el = document.querySelector<HTMLTextAreaElement>(
                    '[data-aui-composer-input]',
                  );
                  if (el) {
                    const nativeInputValueSetter =
                      Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype,
                        'value',
                      )?.set;
                    nativeInputValueSetter?.call(el, s);
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
const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="relative mx-auto flex w-full max-w-3xl flex-col items-end gap-1 px-4">
      <div className="flex items-start gap-3">
        <ActionBarPrimitive.Root
          hideWhenRunning
          autohide="not-last"
          autohideFloat="single-branch"
          className="mt-2"
        >
          <ActionBarPrimitive.Edit asChild>
            <TooltipIconButton tooltip="Chỉnh sửa" className="text-gray-400 hover:text-gray-600">
              <Pencil size={14} />
            </TooltipIconButton>
          </ActionBarPrimitive.Edit>
        </ActionBarPrimitive.Root>

        <div className="rounded-3xl bg-doan-500/10 px-5 py-2.5 text-gray-800">
          <MessagePrimitive.Content />
        </div>
      </div>

      <BranchPicker className="mt-2 mr-3" />
    </MessagePrimitive.Root>
  );
};

// ── Edit Composer ──────────────────────────────────────────────────────────
const EditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col justify-end gap-1 rounded-3xl border border-gray-200 bg-white shadow-sm">
      <ComposerPrimitive.Input className="flex h-8 w-full resize-none bg-transparent p-5 pb-0 text-gray-800 outline-none" />

      <div className="m-3 mt-2 flex items-center justify-center gap-2 self-end">
        <ComposerPrimitive.Cancel className="rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Huỷ
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="rounded-full bg-doan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-doan-600">
          Gửi
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

// ── Branch Picker ──────────────────────────────────────────────────────────
const BranchPicker: FC<{ className?: string }> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={`inline-flex items-center text-sm font-semibold text-gray-400 ${className ?? ''}`}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Trước" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={14} />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <BranchPickerPrimitive.Number />/<BranchPickerPrimitive.Count />
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Sau" className="text-gray-400 hover:text-gray-600">
          <ChevronRight size={14} />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

// ── Thread chính (Light theme, brand colors) ─────────────────────────────
export function CtxhThread({ onClear: _onClear }: { onClear?: () => void }) {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col items-stretch bg-white">
      {/* Message viewport */}
      <ThreadPrimitive.Viewport className="flex grow flex-col gap-6 overflow-y-scroll bg-gray-50/50 pt-8 pb-4">
        {/* Welcome screen */}
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex grow flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-doan-500 shadow-lg shadow-doan-500/20">
              <GraduationCap size={28} className="text-white" />
            </div>
            <p className="mt-4 text-xl font-semibold text-gray-800">
              Tôi có thể giúp gì cho bạn?
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Hỏi về các hoạt động công tác xã hội, tình nguyện...
            </p>

            {/* Gợi ý mẫu */}
            <div className="mt-8 flex flex-wrap justify-center gap-2.5 max-w-lg">
              {[
                'Có hoạt động công tác xã hội nào đang mở không?',
                'Hoạt động nào diễn ra tháng này?',
                'Tôi có thể đăng ký CTXH ở đâu?',
              ].map((q) => (
                <ThreadPrimitive.Suggestion
                  key={q}
                  prompt={q}
                  autoSend
                  asChild
                >
                  <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 shadow-sm transition-all hover:border-hsv-500/30 hover:bg-hsv-50 hover:text-hsv-500 hover:shadow-md">
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

      {/* Composer */}
      <div className="border-t border-gray-100 bg-white px-4 pb-3 pt-3">
        <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end rounded-2xl border border-gray-200 bg-gray-50 pl-4 shadow-sm transition-colors focus-within:border-hsv-500/40 focus-within:bg-white focus-within:shadow-md">
          <ComposerPrimitive.Input
            data-aui-composer-input
            placeholder="Hỏi về hoạt động CTXH..."
            className="h-12 max-h-40 grow resize-none bg-transparent p-3.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send className="m-2 flex size-8 items-center justify-center rounded-full bg-doan-500 transition-all hover:bg-doan-600 disabled:bg-gray-200">
              <ArrowUp size={16} className="text-white" />
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel className="m-2 flex size-8 items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400">
              <div className="size-2.5 rounded-sm bg-white" />
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </ComposerPrimitive.Root>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          Trả lời dựa trên dữ liệu CTXH của Đoàn Trường ĐHBK
        </p>
      </div>
    </ThreadPrimitive.Root>
  );
}
