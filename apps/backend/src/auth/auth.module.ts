import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OptionalSupabaseAuthGuard } from './optional-supabase-auth.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    SupabaseJwtService,
    AuthService,
    SupabaseAuthGuard,
    OptionalSupabaseAuthGuard,
  ],
  exports: [
    SupabaseJwtService,
    AuthService,
    SupabaseAuthGuard,
    OptionalSupabaseAuthGuard,
  ],
})
export class AuthModule {}
