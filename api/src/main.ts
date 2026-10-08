import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SuspendedUserFilter } from './utils/suspendExecption';
import * as process from 'node:process';
import { json, urlencoded } from 'express';
import { isOriginAllowed } from './common/corsOrigins';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

(() => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const match = readFileSync(envPath, 'utf8').match(/^\s*PORT\s*=\s*"?([^"\r\n#]+)"?/m);
  if (match?.[1]) process.env.PORT = match[1].trim();
})();

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.useGlobalFilters(new SuspendedUserFilter());
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 1100;
  await app.listen(port, '0.0.0.0');
  logger.log(`Cloud Storage API running on port ${port}`);
}

bootstrap();
