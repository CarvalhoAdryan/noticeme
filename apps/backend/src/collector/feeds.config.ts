export type CategorySlug =
  | 'geral'
  | 'politica'
  | 'economia'
  | 'tecnologia'
  | 'mundo'
  | 'esportes'
  | 'ciencia-saude'
  | 'maranhao';

export type FeedCategory = CategorySlug;

export interface FeedConfig {
  slug: string; // identificador único da fonte/feed
  name: string;
  url: string;
  category: CategorySlug;
  enabled: boolean;
}

export const FEEDS: FeedConfig[] = [
  // Geral
  {
    slug: 'agencia-brasil',
    name: 'Agência Brasil',
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    category: 'geral',
    enabled: true,
  },
  {
    slug: 'g1-geral',
    name: 'g1',
    url: 'https://g1.globo.com/rss/g1/',
    category: 'geral',
    enabled: true,
  },
  {
    slug: 'folha-geral',
    name: 'Folha de S.Paulo',
    url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml',
    category: 'geral',
    enabled: true,
  },
  {
    slug: 'cnn-brasil',
    name: 'CNN Brasil',
    url: 'https://www.cnnbrasil.com.br/feed/',
    category: 'geral',
    enabled: true,
  },

  // Política
  {
    slug: 'g1-politica',
    name: 'g1 Política',
    url: 'https://g1.globo.com/rss/g1/politica/',
    category: 'politica',
    enabled: true,
  },
  {
    slug: 'poder360',
    name: 'Poder360',
    url: 'https://www.poder360.com.br/feed/',
    category: 'politica',
    enabled: true,
  },

  // Economia
  {
    slug: 'g1-economia',
    name: 'g1 Economia',
    url: 'https://g1.globo.com/rss/g1/economia/',
    category: 'economia',
    enabled: true,
  },
  {
    slug: 'folha-mercado',
    name: 'Folha Mercado',
    url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',
    category: 'economia',
    enabled: true,
  },
  {
    slug: 'infomoney',
    name: 'InfoMoney',
    url: 'https://www.infomoney.com.br/feed/',
    category: 'economia',
    enabled: true,
  },

  // Tecnologia
  {
    slug: 'tecnoblog',
    name: 'Tecnoblog',
    url: 'https://tecnoblog.net/feed/',
    category: 'tecnologia',
    enabled: true,
  },
  {
    slug: 'canaltech',
    name: 'Canaltech',
    url: 'https://canaltech.com.br/rss/',
    category: 'tecnologia',
    enabled: true,
  },
  {
    slug: 'olhar-digital',
    name: 'Olhar Digital',
    url: 'https://olhardigital.com.br/feed/',
    category: 'tecnologia',
    enabled: true,
  },
  {
    slug: 'g1-tecnologia',
    name: 'g1 Tecnologia',
    url: 'https://g1.globo.com/rss/g1/tecnologia/',
    category: 'tecnologia',
    enabled: true,
  },
  {
    slug: 'folha-tec',
    name: 'Folha Tec',
    url: 'https://feeds.folha.uol.com.br/tec/rss091.xml',
    category: 'tecnologia',
    enabled: true,
  },

  // Mundo
  {
    slug: 'bbc-brasil',
    name: 'BBC Brasil',
    url: 'https://feeds.bbci.co.uk/portuguese/rss.xml',
    category: 'mundo',
    enabled: true,
  },
  {
    slug: 'dw-brasil',
    name: 'DW Brasil',
    url: 'https://rss.dw.com/rdf/rss-br-all',
    category: 'mundo',
    enabled: true,
  },
  {
    slug: 'g1-mundo',
    name: 'g1 Mundo',
    url: 'https://g1.globo.com/rss/g1/mundo/',
    category: 'mundo',
    enabled: true,
  },

  // Esportes
  {
    slug: 'ge',
    name: 'ge',
    url: 'https://ge.globo.com/rss/ge/',
    category: 'esportes',
    enabled: true,
  },
  {
    slug: 'folha-esporte',
    name: 'Folha Esporte',
    url: 'https://feeds.folha.uol.com.br/esporte/rss091.xml',
    category: 'esportes',
    enabled: true,
  },

  // Ciência e saúde
  {
    slug: 'g1-ciencia',
    name: 'g1 Ciência',
    url: 'https://g1.globo.com/rss/g1/ciencia/',
    category: 'ciencia-saude',
    enabled: true,
  },
  {
    slug: 'g1-saude',
    name: 'g1 Saúde',
    url: 'https://g1.globo.com/rss/g1/saude/',
    category: 'ciencia-saude',
    enabled: true,
  },
  {
    slug: 'folha-ciencia',
    name: 'Folha Ciência',
    url: 'https://feeds.folha.uol.com.br/ciencia/rss091.xml',
    category: 'ciencia-saude',
    enabled: true,
  },

  // Regional
  {
    slug: 'g1-maranhao',
    name: 'g1 Maranhão',
    url: 'https://g1.globo.com/rss/g1/ma/maranhao/',
    category: 'maranhao',
    enabled: true,
  },
];
