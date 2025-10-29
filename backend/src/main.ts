import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure request size limits
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
      process.env.FRONTEND_URL || 'https://doanhoi.hcmut.edu.vn',
      'https://doanhoi.hcmut.edu.vn/grafana',
      'https://doanhoi.hcmut.edu.vn/prometheus',
    ]
    : ['http://localhost:9100', 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Đoàn Hội Sinh viên API')
    .setDescription('API for Student Organization Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); await app.listen(process.env.PORT || 9200);
  console.log(`🚀 Backend server is running on http://localhost:${process.env.PORT || 9200}`);
  console.log(`📖 API Documentation: http://localhost:${process.env.PORT || 9200}/api`);
}
bootstrap();
