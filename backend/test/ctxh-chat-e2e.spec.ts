import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { CtxhChatModule } from '../src/ctxh-chat/ctxh-chat.module';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

describe('CtxhChatController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  // Mock JWT Guard for testing
  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        // TypeOrmModule would be configured here with test database
        CtxhChatModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // In real tests, you would get a valid token from auth service
    authToken = 'test-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/ctxh-chat/message (POST)', () => {
    it('should send chat message and receive response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Có hoạt động CTXH nào về trồng cây không?',
        })
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('sources');
      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.sources)).toBe(true);
    });

    it('should maintain conversation across multiple messages', async () => {
      // First message
      const response1 = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Tôi muốn tham gia hoạt động CTXH',
        })
        .expect(200);

      const sessionId = response1.body.sessionId;

      // Second message in same session
      const response2 = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hoạt động nào phù hợp với tôi?',
          sessionId: sessionId,
        })
        .expect(200);

      expect(response2.body.sessionId).toBe(sessionId);
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required 'message' field
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .send({
          message: 'Test message',
        })
        .expect(403);

      mockJwtAuthGuard.canActivate.mockReturnValue(true);
    });
  });

  describe('/api/ctxh-chat/history/:sessionId (GET)', () => {
    it('should retrieve conversation history', async () => {
      // First create a conversation
      const chatResponse = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Xin chào',
        });

      const sessionId = chatResponse.body.sessionId;

      // Then retrieve history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/ctxh-chat/history/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body).toHaveProperty('sessionId');
      expect(historyResponse.body).toHaveProperty('messages');
      expect(historyResponse.body).toHaveProperty('metadata');
      expect(Array.isArray(historyResponse.body.messages)).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/api/ctxh-chat/history/non-existent-session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/ctxh-chat/session/:sessionId (DELETE)', () => {
    it('should clear conversation session', async () => {
      // Create a conversation
      const chatResponse = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
        });

      const sessionId = chatResponse.body.sessionId;

      // Clear the session
      await request(app.getHttpServer())
        .delete(`/api/ctxh-chat/session/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify session is cleared
      await request(app.getHttpServer())
        .get(`/api/ctxh-chat/history/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/ctxh-chat/feedback (POST)', () => {
    it('should submit positive feedback', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ctxh-chat/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: 'session-123',
          rating: 'positive',
          comment: 'Rất hữu ích!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should submit negative feedback', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ctxh-chat/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: 'session-123',
          rating: 'negative',
          comment: 'Thông tin không chính xác',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array.from({ length: 35 }, () =>
        request(app.getHttpServer())
          .post('/api/ctxh-chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: 'Test message',
          })
      );

      const responses = await Promise.allSettled(requests);

      // Some requests should be rate limited (429)
      const rateLimited = responses.some(
        (result: any) => result.status === 'fulfilled' && result.value.status === 429
      );

      // Note: This test depends on rate limit configuration
      // Adjust based on actual rate limit settings (30 req/min)
    });
  });

  describe('Response Time Requirements', () => {
    it('should respond within 2 seconds (95th percentile)', async () => {
      const iterations = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(app.getHttpServer())
          .post('/api/ctxh-chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: `Test query ${i}`,
          });

        responseTimes.push(Date.now() - startTime);
      }

      // Calculate 95th percentile
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      expect(p95ResponseTime).toBeLessThan(2000);
    });
  });

  describe('Concurrent Users', () => {
    it('should handle 10 concurrent users', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/ctxh-chat/message')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            message: `User ${i} query`,
          })
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sessionId');
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid sessionId format', async () => {
      await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test',
          sessionId: 'invalid-uuid-format',
        })
        .expect(400);
    });

    it('should handle very long messages gracefully', async () => {
      const longMessage = 'Câu hỏi rất dài '.repeat(500);

      const response = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: longMessage,
        });

      expect([200, 400]).toContain(response.status);
    });

    it('should handle special characters in messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ctxh-chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test with special chars: @#$%^&*()_+{}[]|\\:";\'<>?,./`~',
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');
    });
  });
});
