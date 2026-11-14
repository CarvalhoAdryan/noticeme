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

/**
 * Remove tags HTML e limita tamanho de texto para resumo curto
 */
export function cleanText(rawHtmlOrText?: string | null, maxLength = 500): string | null {
  if (!rawHtmlOrText) return null;

  // Remove tags HTML
  const stripped = rawHtmlOrText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return null;

  if (stripped.length <= maxLength) {
    return stripped;
  }

  return `${stripped.slice(0, maxLength - 1)}…`;
}

