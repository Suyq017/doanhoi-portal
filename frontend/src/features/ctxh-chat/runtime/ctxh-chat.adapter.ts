import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from '@assistant-ui/react';
import { apiClient } from '../../../shared/services/apiClient';
import type { CtxhChatResponse } from '../types/chat.types';

/** Delay (ms) between each word chunk during fake streaming */
const FAKE_STREAM_DELAY_MS = 18;

export const ctxhChatAdapter: ChatModelAdapter = {
  async *run({
    messages,
    abortSignal,
  }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void> {
    // ── Extract last user message ──────────────────────────────────────
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const userText =
      lastUserMsg?.content
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('\n') ?? '';

    // ── Extract sessionId from previous assistant message ──────────────
    const firstAssistant = messages.find((m) => m.role === 'assistant');
    const sessionId: string | undefined = (
      (firstAssistant?.metadata as Record<string, unknown> | undefined)
        ?.custom as Record<string, unknown> | undefined
    )?.sessionId as string | undefined;

    // ── Fetch full response from regular POST endpoint ─────────────────
    const data = await apiClient.post<CtxhChatResponse>('/ctxh-chat/message', {
      message: userText,
      sessionId,
    });

    const fullText = data.response ?? '';

    // ── Fake streaming: yield word-by-word ────────────────────────────
    // Split on whitespace, keeping the delimiter so spaces are preserved.
    const tokens = fullText.split(/(\s+)/);
    let accumulated = '';

    for (const token of tokens) {
      if (abortSignal?.aborted) return;
      accumulated += token;
      yield {
        content: [{ type: 'text' as const, text: accumulated }],
      };
      if (token.trim().length > 0) {
        // Only delay on actual words, not on whitespace tokens
        await new Promise<void>((resolve) => setTimeout(resolve, FAKE_STREAM_DELAY_MS));
      }
    }

    // ── Final yield with metadata ──────────────────────────────────────
    if (!abortSignal?.aborted) {
      yield {
        content: [{ type: 'text' as const, text: fullText }],
        metadata: {
          custom: {
            followUpSuggestions: data.followUpSuggestions ?? [],
            sessionId: data.sessionId ?? sessionId,
            sources: data.sources ?? [],
          },
        },
      };
    }
  },
};

