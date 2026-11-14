import crypto, { type JsonWebKey } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser, SupabaseJwtPayload } from './auth.types';

interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

interface JwksResponse {
  keys: Array<JsonWebKey & { kid?: string; alg?: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SupabaseJwtService {
  private jwksCache: { keys: JwksResponse['keys']; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Formato de token JWT inválido.');
    }

    const [rawHeader, rawPayload, rawSignature] = parts;

    let header: JwtHeader;
    let payload: SupabaseJwtPayload;

    try {
      header = JSON.parse(Buffer.from(rawHeader, 'base64url').toString('utf8')) as JwtHeader;
      payload = JSON.parse(
        Buffer.from(rawPayload, 'base64url').toString('utf8'),
      ) as SupabaseJwtPayload;
    } catch {
      throw new UnauthorizedException('Cabeçalho ou payload do token JWT malformado.');
    }

    if (!payload.sub || !UUID_REGEX.test(payload.sub)) {
      throw new UnauthorizedException('Token JWT sem identificador de usuário (sub) válido.');
    }

    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Token JWT expirado.');
    }

    const signingInput = `${rawHeader}.${rawPayload}`;
    const signatureBuffer = Buffer.from(rawSignature, 'base64url');

    if (header.alg === 'HS256') {
      this.verifyHs256(signingInput, signatureBuffer);
    } else if (header.alg === 'ES256' || header.alg === 'RS256') {
      await this.verifyAsymmetric(header, payload, signingInput, signatureBuffer);
    } else {
      throw new UnauthorizedException(`Algoritmo JWT não suportado: ${header.alg}`);
    }

    return {
      id: payload.sub,
      email: payload.email ?? null,
      role: payload.role ?? 'authenticated',
    };
  }

  private verifyHs256(signingInput: string, signatureBuffer: Buffer): void {
    const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('SUPABASE_JWT_SECRET não configurado no servidor.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest();

    if (
      expectedSignature.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedSignature, signatureBuffer)
    ) {
      throw new UnauthorizedException('Assinatura do token JWT inválida.');
    }
  }

  private async verifyAsymmetric(
    header: JwtHeader,
    payload: SupabaseJwtPayload,
    signingInput: string,
    signatureBuffer: Buffer,
  ): Promise<void> {
    const jwksUrl = this.resolveJwksUrl(payload.iss);
    const keys = await this.fetchJwksKeys(jwksUrl);

    const matchingKey = keys.find((k) => (header.kid ? k.kid === header.kid : true));
    if (!matchingKey) {
      throw new UnauthorizedException('Chave pública (JWK) não encontrada para o token.');
    }

    const publicKey = crypto.createPublicKey({
      key: matchingKey,
      format: 'jwk',
    });

    const isValid = crypto.verify(
      'sha256',
      Buffer.from(signingInput, 'utf8'),
      {
        key: publicKey,
        dsaEncoding: header.alg === 'ES256' ? 'ieee-p1363' : 'der',
      },
      signatureBuffer,
    );

    if (!isValid) {
      throw new UnauthorizedException('Assinatura assimétrica do token JWT inválida.');
    }
  }

  private resolveJwksUrl(issuer?: string): string {
    const configuredUrl = this.configService.get<string>('SUPABASE_URL');
    if (configuredUrl) {
      return `${configuredUrl.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`;
    }

    if (issuer && /^https:\/\/[a-z0-9-]+\.supabase\.co\/auth\/v1$/i.test(issuer)) {
      return `${issuer}/.well-known/jwks.json`;
    }

    throw new UnauthorizedException(
      'SUPABASE_URL não configurado para validação de token via JWKS.',
    );
  }

  private async fetchJwksKeys(jwksUrl: string): Promise<JwksResponse['keys']> {
    if (this.jwksCache && this.jwksCache.expiresAt > Date.now()) {
      return this.jwksCache.keys;
    }

    const res = await fetch(jwksUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new UnauthorizedException('Falha ao obter chaves públicas JWKS do Supabase.');
    }

    const data = (await res.json()) as JwksResponse;
    if (!Array.isArray(data.keys)) {
      throw new UnauthorizedException('Resposta JWKS inválida.');
    }

    this.jwksCache = {
      keys: data.keys,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };

    return data.keys;
  }
}
