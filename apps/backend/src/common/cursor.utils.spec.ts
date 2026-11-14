import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { decodeCursor, encodeCursor } from './cursor.utils';

void describe('CursorUtils', () => {
  const sampleCursor = {
    published_at: '2026-11-14T10:00:00.000Z',
    id: '550e8400-e29b-41d4-a716-446655440000',
  };

  void it('deve codificar e decodificar cursor em base64url', () => {
    const encoded = encodeCursor(sampleCursor);
    const decoded = decodeCursor(encoded);
    assert.deepEqual(decoded, sampleCursor);
  });

  void it('deve decodificar cursor no formato pipe (published_at|id)', () => {
    const pipeCursor = `${sampleCursor.published_at}|${sampleCursor.id}`;
    const decoded = decodeCursor(pipeCursor);
    assert.deepEqual(decoded, sampleCursor);
  });

  void it('deve lançar BadRequestException para cursor malformado', () => {
    assert.throws(() => decodeCursor('cursor-invalido'), BadRequestException);
    assert.throws(
      () => decodeCursor('2026-11-14T10:00:00.000Z|nao-e-uuid'),
      BadRequestException,
    );
  });
});
