import { describe, expect, it } from '@jest/globals';
import { validateSync } from 'class-validator';

import { ChatMessageDto, ChatResponseDto, ConversationHistoryDto } from '../chat.dto';

describe('chat.dto', () => {
  it('should validate a chat message dto with a valid payload', () => {
    const message = Object.assign(new ChatMessageDto(), {
      message: 'Xin chào chatbot',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(validateSync(message)).toHaveLength(0);
  });

  it('should reject an invalid chat message dto', () => {
    const message = Object.assign(new ChatMessageDto(), {
      message: 123,
      sessionId: 'not-a-uuid',
    });

    const errors = validateSync(message);

    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['message', 'sessionId']));
  });

  it('should expose the response and history shapes', () => {
    const response = Object.assign(new ChatResponseDto(), {
      response: 'Đã tìm thấy hoạt động phù hợp',
      sessionId: 'session-1',
      sources: [
        {
          activityId: 'activity-1',
          activityName: 'Hoạt động môi trường',
          score: 0.91,
          content: 'Dọn dẹp khuôn viên',
        },
      ],
      metadata: {
        processingTime: 1200,
        model: 'gemini-2.0-flash',
        tokensUsed: 256,
      },
    });

    const history = Object.assign(new ConversationHistoryDto(), {
      messages: [
        {
          role: 'user',
          content: 'Có hoạt động nào về môi trường không?',
          timestamp: new Date('2026-04-29T10:00:00.000Z'),
        },
      ],
      metadata: {
        sessionId: 'session-1',
        startTime: new Date('2026-04-29T09:55:00.000Z'),
        lastActive: new Date('2026-04-29T10:00:00.000Z'),
        turnCount: 1,
      },
    });

    expect(response.sources[0].activityName).toContain('môi trường');
    expect(response.metadata.model).toBe('gemini-2.0-flash');
    expect(history.messages).toHaveLength(1);
    expect(history.metadata.turnCount).toBe(1);
  });
});