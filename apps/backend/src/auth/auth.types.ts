export interface AuthenticatedUser {
  id: string;
  email: string | null;
  role: string;
}

export interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  exp: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
}
