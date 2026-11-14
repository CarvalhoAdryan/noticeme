import { BadRequestException } from '@nestjs/common';
import { PaginationCursorSchema, type PaginationCursor } from '@dailybrief/shared';

export function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(
    JSON.stringify({
      published_at: cursor.published_at,
      id: cursor.id,
    }),
    'utf8',
  ).toString('base64url');
}

export function decodeCursor(rawCursor: string): PaginationCursor {
  try {
    let candidate: unknown;

    if (rawCursor.includes('|')) {
      const [published_at, id] = rawCursor.split('|');
      candidate = { published_at, id };
    } else {
      const decoded = Buffer.from(rawCursor, 'base64url').toString('utf8');
      candidate = JSON.parse(decoded);
    }

    const parsed = PaginationCursorSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new BadRequestException('Cursor de paginação inválido.');
    }

    return parsed.data;
  } catch (err: unknown) {
    if (err instanceof BadRequestException) {
      throw err;
    }
    throw new BadRequestException('Cursor de paginação inválido.');
  }
}
