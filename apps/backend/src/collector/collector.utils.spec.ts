import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanText, decodeXmlBuffer, normalizeUrl } from './collector.utils';

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

    void it('deve decodificar entidades numéricas, acentuadas e remover caracteres inválidos', () => {
      const html =
        'Energia &ndash; Brasil&#8217;s grid &#x201C;renovou&#x201D; &amp;#8211; a&ccedil;&atilde;o\uFFFD\u200B &hellip;';
      assert.equal(
        cleanText(html),
        'Energia – Brasil’s grid “renovou” – ação …',
      );
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

  void describe('decodeXmlBuffer', () => {
    void it('deve decodificar XML em ISO-8859-1 preservando acentuação', () => {
      const xmlLatin1 = '<?xml version="1.0" encoding="ISO-8859-1"?><rss><title>Produção elétrica</title></rss>';
      const buffer = Buffer.from(xmlLatin1, 'latin1');
      const decoded = decodeXmlBuffer(buffer, 'application/xml');
      assert.equal(decoded.includes('Produção elétrica'), true);
      assert.equal(decoded.includes('\uFFFD'), false);
    });

    void it('deve usar fallback windows-1252 quando UTF-8 falhar sem charset explícito', () => {
      const raw = '<rss><title>Energia eólica — Brasil</title></rss>';
      // Simula bytes Windows-1252 (0xF3 = ó, 0x97 = —)
      const buffer = Buffer.from(
        '<rss><title>Energia e\xF3lica \x97 Brasil</title></rss>',
        'latin1',
      );
      const decoded = decodeXmlBuffer(buffer, 'text/xml');
      assert.equal(decoded, raw);
    });
  });
});
