/**
 * Normaliza uma URL removendo fragmentos (#) e parâmetros comuns de rastreamento (utm_*, fbclid, etc).
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());

    // Remove fragmento/hash
    url.hash = '';

    // Parâmetros a remover
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'utm_id',
      'fbclid',
      'gclid',
      'msclkid',
      'mc_cid',
      'mc_eid',
      'ref',
      'ref_src',
      'xtor',
    ];

    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }

    // Remove trailing slash exceto na raiz
    let cleaned = url.toString();
    if (cleaned.endsWith('/') && url.pathname !== '/') {
      cleaned = cleaned.slice(0, -1);
    }

    return cleaned;
  } catch {
    return rawUrl.trim();
  }
}

const WINDOWS_1252_C1_MAP: Record<number, string> = {
  0x80: '€',
  0x82: '‚',
  0x83: 'ƒ',
  0x84: '„',
  0x85: '…',
  0x86: '†',
  0x87: '‡',
  0x88: 'ˆ',
  0x89: '‰',
  0x8a: 'Š',
  0x8b: '‹',
  0x8c: 'Œ',
  0x8e: 'Ž',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
  0x98: '˜',
  0x99: '™',
  0x9a: 'š',
  0x9b: '›',
  0x9c: 'œ',
  0x9e: 'ž',
  0x9f: 'Ÿ',
};

const NAMED_HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bull: '•',
  middot: '·',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  sect: '§',
  para: '¶',
  laquo: '«',
  raquo: '»',
  times: '×',
  divide: '÷',
  plusmn: '±',
  ordf: 'ª',
  ordm: 'º',
  aacute: 'á',
  Aacute: 'Á',
  agrave: 'à',
  Agrave: 'À',
  acirc: 'â',
  Acirc: 'Â',
  atilde: 'ã',
  Atilde: 'Ã',
  auml: 'ä',
  Auml: 'Ä',
  eacute: 'é',
  Eacute: 'É',
  egrave: 'è',
  Egrave: 'È',
  ecirc: 'ê',
  Ecirc: 'Ê',
  euml: 'ë',
  Euml: 'Ë',
  iacute: 'í',
  Iacute: 'Í',
  igrave: 'ì',
  Igrave: 'Ì',
  icirc: 'î',
  Icirc: 'Î',
  iuml: 'ï',
  Iuml: 'Ï',
  oacute: 'ó',
  Oacute: 'Ó',
  ograve: 'ò',
  Ograve: 'Ò',
  ocirc: 'ô',
  Ocirc: 'Ô',
  otilde: 'õ',
  Otilde: 'Õ',
  ouml: 'ö',
  Ouml: 'Ö',
  uacute: 'ú',
  Uacute: 'Ú',
  ugrave: 'ù',
  Ugrave: 'Ù',
  ucirc: 'û',
  Ucirc: 'Û',
  uuml: 'ü',
  Uuml: 'Ü',
  ccedil: 'ç',
  Ccedil: 'Ç',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
};

function decodeCodePoint(codePoint: number, fallback: string): string {
  if (codePoint >= 0x80 && codePoint <= 0x9f) {
    return WINDOWS_1252_C1_MAP[codePoint] ?? fallback;
  }
  if (codePoint <= 0 || codePoint > 0x10ffff) {
    return fallback;
  }
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

/**
 * Decodifica entidades HTML/XML (nomeadas e numéricas decimais/hexadecimais)
 */
export function decodeHtmlEntities(input: string): string {
  // Desfaz entidades duplamente escapadas (ex.: &amp;#8217; ou &amp;quot;)
  const unwrapped = input.replace(
    /&amp;(#(?:\d+|x[0-9a-fA-F]+)|[a-zA-Z][a-zA-Z0-9]+);/g,
    '&$1;',
  );

  return unwrapped
    .replace(/&#(\d+);/g, (match, dec: string) =>
      decodeCodePoint(Number.parseInt(dec, 10), match),
    )
    .replace(/&#x([0-9a-fA-F]+);/gi, (match, hex: string) =>
      decodeCodePoint(Number.parseInt(hex, 16), match),
    )
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name: string) => {
      return NAMED_HTML_ENTITIES[name] ?? NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match;
    });
}

function normalizeCharsetLabel(rawCharset?: string | null): string | null {
  if (!rawCharset) return null;
  const cleaned = rawCharset.trim().toLowerCase().replace(/^["']|["']$/g, '');
  if (!cleaned) return null;
  if (cleaned === 'latin1' || cleaned === 'iso-8859-1' || cleaned === 'iso8859-1') {
    return 'windows-1252';
  }
  if (cleaned === 'utf8') {
    return 'utf-8';
  }
  return cleaned;
}

/**
 * Decodifica o buffer XML respeitando o charset do cabeçalho HTTP ou da declaração <?xml encoding="..."?>,
 * evitando caracteres corrompidos ( / ?).
 */
export function decodeXmlBuffer(buffer: Buffer, contentType?: string | null): string {
  const headerCharsetMatch = contentType?.match(/charset=([^;\s"']+)/i);
  const prologSample = buffer.subarray(0, 512).toString('latin1');
  const xmlEncodingMatch = prologSample.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);

  const explicitCharset = normalizeCharsetLabel(
    headerCharsetMatch?.[1] ?? xmlEncodingMatch?.[1],
  );
  const targetCharset = explicitCharset ?? 'utf-8';

  try {
    const decoded = new TextDecoder(targetCharset).decode(buffer);
    if (!explicitCharset && decoded.includes('\uFFFD')) {
      const latinFallback = new TextDecoder('windows-1252').decode(buffer);
      const utf8Replacements = (decoded.match(/\uFFFD/g) ?? []).length;
      const latinReplacements = (latinFallback.match(/\uFFFD/g) ?? []).length;
      if (latinReplacements < utf8Replacements) {
        return latinFallback;
      }
    }
    return decoded;
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

/**
 * Remove tags HTML e limita tamanho de texto para resumo curto
 */
export function cleanText(rawHtmlOrText?: string | null, maxLength = 500): string | null {
  if (!rawHtmlOrText) return null;

  // Remove tags HTML primeiro e depois decodifica entidades e normaliza espaços
  const withoutTags = rawHtmlOrText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  const stripped = decodeHtmlEntities(withoutTags)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return null;

  if (stripped.length <= maxLength) {
    return stripped;
  }

  return `${stripped.slice(0, maxLength - 1)}…`;
}

