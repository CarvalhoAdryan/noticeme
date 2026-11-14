import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env.ADMIN_API_KEY?.trim();
    if (!expectedToken) {
      throw new UnauthorizedException(
        'Token administrativo não configurado no servidor.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedHeader = request.headers['x-admin-token'];
    const bearerHeader = request.headers.authorization;

    let providedToken = '';
    if (typeof providedHeader === 'string' && providedHeader.trim()) {
      providedToken = providedHeader.trim();
    } else if (
      typeof bearerHeader === 'string' &&
      bearerHeader.startsWith('Bearer ')
    ) {
      providedToken = bearerHeader.slice('Bearer '.length).trim();
    }

    if (!providedToken) {
      throw new UnauthorizedException('Credencial administrativa ausente.');
    }

    const expectedBuf = Buffer.from(expectedToken, 'utf8');
    const providedBuf = Buffer.from(providedToken, 'utf8');

    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      throw new UnauthorizedException('Credencial administrativa inválida.');
    }

    return true;
  }
}
