import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types';
import { SupabaseJwtService } from './supabase-jwt.service';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser | null;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly jwtService: SupabaseJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Cabeçalho Authorization Bearer ausente.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Token Bearer vazio.');
    }

    request.user = await this.jwtService.verifyToken(token);
    return true;
  }
}

