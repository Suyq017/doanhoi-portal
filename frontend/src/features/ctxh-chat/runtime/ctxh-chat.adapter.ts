import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from '@assistant-ui/react';
import { authService } from '../../auth/services/authService';
import type { CtxhChatResponse } from '../types/chat.types';

const BACKEND = import.meta.env.VITE_BACKEND_API_URL || '/api';

// ── Streaming delay config ─────────────────────────────────────────────────
// Simulates a ~60 tokens/sec typing speed.
// When the backend gains a real SSE endpoint, replace this adapter section
// with a fetch-based EventSource reader (see: api/ctxh-chat/stream).
const TOKEN_DELAY_MS = 16; // ~60 chars/sec

/**
 * Splits text into tokens (words + whitespace) to stream progressively.
 */
function tokenize(text: string): string[] {
  // Keep whitespace tokens so accumulated text matches original exactly
  return text.split(/(\s+)/);
}

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

    const token = authService.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // ── Fetch full response from non-streaming endpoint ────────────────
    const res = await fetch(`${BACKEND}/ctxh-chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: userText, sessionId }),
      signal: abortSignal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CtxhChatResponse = await res.json();

    // ── Simulate streaming: yield tokens progressively ─────────────────
    const tokens = tokenize(data.response);
    let accumulated = '';

    for (const token of tokens) {
      if (abortSignal?.aborted) break;

      accumulated += token;

      yield {
        content: [{ type: 'text' as const, text: accumulated }],
      };

      // Only delay on actual word tokens, not on whitespace tokens
      if (token.trim().length > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, TOKEN_DELAY_MS));
      }
    }

    // ── Final yield with metadata ──────────────────────────────────────
    if (!abortSignal?.aborted) {
      yield {
        content: [{ type: 'text' as const, text: data.response }],
        metadata: {
          custom: {
            followUpSuggestions: data.followUpSuggestions,
            sessionId: data.sessionId,
            sources: data.sources,
          },
        },
      };
    }
  },
};

