import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseJwtService } from './supabase-jwt.service';

const TEST_SECRET = 'super-secret-jwt-key-for-tests-only-123456';

function signHs256Jwt(payload: Record<string, unknown>, secret = TEST_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString(
    'base64url',
  );
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

void describe('SupabaseJwtService', () => {
  const configService = new ConfigService({
    SUPABASE_JWT_SECRET: TEST_SECRET,
  });
  const jwtService = new SupabaseJwtService(configService);

  void it('deve validar um token HS256 válido do Supabase e extrair o usuário', async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const token = signHs256Jwt({
      sub: userId,
      email: 'leitor@dailybrief.app',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const user = await jwtService.verifyToken(token);
    assert.deepEqual(user, {
      id: userId,
      email: 'leitor@dailybrief.app',
      role: 'authenticated',
    });
  });

  void it('deve rejeitar token com assinatura inválida', async () => {
    const token = signHs256Jwt(
      {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      'outro-segredo-incorreto',
    );

    await assert.rejects(() => jwtService.verifyToken(token), UnauthorizedException);
  });

  void it('deve rejeitar token expirado', async () => {
    const token = signHs256Jwt({
      sub: '550e8400-e29b-41d4-a716-446655440000',
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await assert.rejects(() => jwtService.verifyToken(token), UnauthorizedException);
  });

  void it('deve rejeitar token sem UUID válido no sub', async () => {
    const token = signHs256Jwt({
      sub: 'id-invalido',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await assert.rejects(() => jwtService.verifyToken(token), UnauthorizedException);
  });
});
