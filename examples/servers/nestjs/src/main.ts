import 'reflect-metadata';
import { CallHandler, ExecutionContext, NestInterceptor, Controller, Get, Header, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
const packageRequire = createRequire(__filename);
const { generateSRI, updateHTML } = packageRequire('@nithin93/sri-js');
const publicDir = join(__dirname, '../public');
class SRIInterceptor implements NestInterceptor {
  constructor(private readonly sri: Record<string, string>) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((body) => {
      const response = context.switchToHttp().getResponse<ServerResponse>();
      const contentType = String(response.getHeader('Content-Type') ?? '');
      if (typeof body === 'string' && contentType.includes('text/html')) {
        return updateHTML(body, this.sri);
      }
      return body;
    }));
  }
}
@Controller()
class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  getIndex(): string {
    return '<!doctype html><html><body><script src="/app.js"></script></body></html>';
  }
  @Get('app.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  async getScript(): Promise<string> {
    return readFile(join(publicDir, 'app.js'), 'utf8');
  }
}
@Module({ controllers: [AppController] })
class AppModule {}
async function bootstrap(): Promise<void> {
  const sri: Record<string, string> = await generateSRI({ algorithm: 'sha384', basePath: publicDir }).generateForDirectory();
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new SRIInterceptor(sri));
  await app.listen(4312, '127.0.0.1');
  console.log('NestJS listening on 127.0.0.1:4312');
}
void bootstrap();
