import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Milde Project Space API')
    .setDescription(
      'Workspace, project membership and virtual space API. ' +
      'Use POST /api/v1/auth/login in this page to sign in; the browser stores the HttpOnly cookie automatically. ' +
      'No token needs to be pasted into Authorize. Workspace OWNER members manage projects and spatial data; ' +
      'other workspace roles read only assigned projects. Use POST /api/v1/auth/logout to end the session.',
    )
    .setVersion('1.0')
    .addCookieAuth('milde_access_token', { type: 'apiKey', in: 'cookie' }, 'cookieAuth')
    .build();

  SwaggerModule.setup('api/v1/docs', app, () => SwaggerModule.createDocument(app, config), {
    customSiteTitle: 'Milde API documentation',
    raw: ['json'],
    swaggerOptions: {
      withCredentials: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      validatorUrl: null,
    },
  });
}
