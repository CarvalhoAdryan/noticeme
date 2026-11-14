const DEFAULT_API_URL = 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 15_000;

let authToken: string | null = null;

export function setApiAuthToken(token: string | null): void {
  authToken = token;
}

export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
  return raw.replace(/\/+$/, '');
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `Erro HTTP ${response.status}`;
      try {
        const errBody = (await response.json()) as {
          message?: string | string[];
        };
        if (Array.isArray(errBody.message)) {
          errorMessage = errBody.message.join('. ');
        } else if (typeof errBody.message === 'string') {
          errorMessage = errBody.message;
        }
      } catch {
        // Mantém mensagem padrão se não for JSON
      }
      throw new ApiError(response.status, errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'A conexão demorou mais de 15 segundos. Tente novamente.');
    }
    throw new ApiError(
      0,
      'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
    );
  } finally {
    clearTimeout(timer);
  }
}

