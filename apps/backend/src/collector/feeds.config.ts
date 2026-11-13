export type FeedCategory =
  | 'geral'
  | 'politica'
  | 'economia'
  | 'tecnologia'
  | 'mundo'
  | 'esportes'
  | 'ciencia-saude'
  | 'maranhao';

export interface FeedConfig {
  slug: string;
  name: string;
  url: string;
  category: FeedCategory;
  enabled: boolean;
}

export const FEEDS: FeedConfig[] = [
  {
    slug: 'g1-geral',
    name: 'G1 - Todas as Notícias',
    url: 'https://g1.globo.com/rss/g1/',
    category: 'geral',
    enabled: true,
  },
  {
    slug: 'g1-tecnologia',
    name: 'G1 - Tecnologia',
    url: 'https://g1.globo.com/rss/g1/tecnologia/',
    category: 'tecnologia',
    enabled: true,
  },
  {
    slug: 'g1-economia',
    name: 'G1 - Economia',
    url: 'https://g1.globo.com/rss/g1/economia/',
    category: 'economia',
    enabled: true,
  },
  // TODO: Adicione os demais feeds RSS abaixo seguindo a interface FeedConfig
];
