import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { setupOpenApi } from './openapi';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.SWAGGER_ENABLED !== 'false');
const API_ORIGIN = process.env.API_ORIGIN ?? `http://localhost:${process.env.PORT ?? 3000}`;
const TRUSTED_WRITE_ORIGINS = new Set([
  FRONTEND_ORIGIN,
  ...(SWAGGER_ENABLED ? [API_ORIGIN] : []),
]);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const hasAuthCookie = request.headers.cookie?.split(';').some((cookie) => cookie.trim().startsWith('milde_access_token=')) ?? false;
    if (isMutation && hasAuthCookie && !TRUSTED_WRITE_ORIGINS.has(request.headers.origin ?? '')) {
      response.status(403).json({ statusCode: 403, message: 'Request origin is not allowed' });
      return;
    }
    next();
  });
  if (SWAGGER_ENABLED) setupOpenApi(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
