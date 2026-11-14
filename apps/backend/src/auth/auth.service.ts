import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { UserProfile } from '@dailybrief/shared';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { SupabaseJwtService } from './supabase-jwt.service';

export interface AuthSessionResponse {
  accessToken: string;
  user: UserProfile;
}

interface AuthUserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: Date | string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: SupabaseJwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponse> {
    const email = dto.email.trim().toLowerCase();
    const displayName = dto.displayName?.trim() || email.split('@')[0];

    const existing = await this.pool.query(
      `SELECT 1 FROM auth.users WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ConflictException('Este endereço de e-mail já está cadastrado.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userInsert = await client.query<{ id: string; created_at: Date | string }>(
        `
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at
        )
        VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          $1,
          crypt($2, gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('display_name', $3::text),
          now(),
          now()
        )
        RETURNING id, created_at
        `,
        [email, dto.password, displayName],
      );

      const newUser = userInsert.rows[0];

      await client.query(
        `
        INSERT INTO public.profiles (id, display_name)
        VALUES ($1::uuid, $2)
        ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
        `,
        [newUser.id, displayName],
      );

      await client.query('COMMIT');

      const accessToken = this.jwtService.signToken({ id: newUser.id, email });
      const createdAt =
        newUser.created_at instanceof Date
          ? newUser.created_at.toISOString()
          : new Date(newUser.created_at).toISOString();

      return {
        accessToken,
        user: {
          id: newUser.id,
          email,
          displayName,
          createdAt,
          categories: [],
        },
      };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto): Promise<AuthSessionResponse> {
    const email = dto.email.trim().toLowerCase();

    const res = await this.pool.query<AuthUserRow>(
      `
      SELECT
        u.id,
        u.email,
        p.display_name,
        COALESCE(p.created_at, u.created_at) AS created_at
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE lower(u.email) = $1
        AND u.encrypted_password = crypt($2, u.encrypted_password)
      LIMIT 1
      `,
      [email, dto.password],
    );

    const row = res.rows[0];
    if (!row) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const displayName = row.display_name || email.split('@')[0];

    await this.pool.query(
      `
      INSERT INTO public.profiles (id, display_name)
      VALUES ($1::uuid, $2)
      ON CONFLICT (id) DO NOTHING
      `,
      [row.id, displayName],
    );

    const catsRes = await this.pool.query<{ slug: UserProfile['categories'][number] }>(
      `
      SELECT c.slug
      FROM public.user_categories uc
      INNER JOIN public.categories c ON c.id = uc.category_id
      WHERE uc.user_id = $1::uuid
      ORDER BY c.slug ASC
      `,
      [row.id],
    );

    const accessToken = this.jwtService.signToken({ id: row.id, email: row.email });
    const createdAt =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString();

    return {
      accessToken,
      user: {
        id: row.id,
        email: row.email,
        displayName,
        createdAt,
        categories: catsRes.rows.map((r) => r.slug),
      },
    };
  }
}
