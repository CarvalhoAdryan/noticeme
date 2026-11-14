import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './supabase-auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

@Injectable()
export class OptionalSupabaseAuthGuard implements CanActivate {
  constructor(private readonly jwtService: SupabaseJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.user = null;
      return true;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      request.user = null;
      return true;
    }

    request.user = await this.jwtService.verifyToken(token);
    return true;
  }
}
