import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanText, normalizeUrl } from './collector.utils';

void describe('CollectorUtils', () => {
  void describe('normalizeUrl', () => {
    void it('deve remover parâmetros de rastreamento utm_* e fbclid', () => {
      const raw =
        'https://g1.globo.com/noticia/123.ghtml?utm_source=rss&utm_medium=feed&fbclid=abc';
      assert.equal(normalizeUrl(raw), 'https://g1.globo.com/noticia/123.ghtml');
    });

    void it('deve remover fragmentos (#)', () => {
      const raw = 'https://exemplo.com/artigo#comentarios';
      assert.equal(normalizeUrl(raw), 'https://exemplo.com/artigo');
    });

    void it('deve manter parâmetros de query legítimos que não sejam de rastreamento', () => {
      const raw = 'https://exemplo.com/busca?q=brasil&utm_source=feed';
      assert.equal(normalizeUrl(raw), 'https://exemplo.com/busca?q=brasil');
    });
  });

  void describe('cleanText', () => {
    void it('deve remover tags HTML e entidades', () => {
      const html = '<p>Texto com <b>negrito</b> &amp; &quot;aspas&quot;</p>';
      assert.equal(cleanText(html), 'Texto com negrito & "aspas"');
    });

    void it('deve truncar textos longos respeitando o maxLength', () => {
      const longText = 'a'.repeat(600);
      const cleaned = cleanText(longText, 100);
      assert.equal(cleaned?.length, 100);
      assert.equal(cleaned?.endsWith('…'), true);
    });

    void it('deve retornar null para texto vazio ou nulo', () => {
      assert.equal(cleanText(null), null);
      assert.equal(cleanText(''), null);
      assert.equal(cleanText('   '), null);
    });
  });
});
