import { Global, Module } from '@nestjs/common';
import { OptionalSupabaseAuthGuard } from './optional-supabase-auth.guard';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseJwtService } from './supabase-jwt.service';

@Global()
@Module({
  providers: [SupabaseJwtService, SupabaseAuthGuard, OptionalSupabaseAuthGuard],
  exports: [SupabaseJwtService, SupabaseAuthGuard, OptionalSupabaseAuthGuard],
})
export class AuthModule {}
