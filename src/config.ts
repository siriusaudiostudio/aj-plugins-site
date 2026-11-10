import { AudioLines, FolderTree } from 'lucide-react';

export const site = {
  name: 'AJ Plugins',
  slogan: 'Ferramentas inteligentes para REAPER',
  description: 'Conheça as ferramentas da AJ Plugins para organizar plugins, otimizar projetos e acelerar seu workflow no REAPER.',
  origin: '', // Informe a URL pública confirmada, sem barra final.
  contacts: { Instagram: '', YouTube: '', WhatsApp: '', 'E-mail': '', 'Relatar um bug': '' },
};

export const release = {
  enabled: true,
  repository: 'siriusaudiostudio/aj-plugin-browser', // proprietário/repositório público
  asset: 'AJ_Plugin_Browser_Instalador_0.8.3-completo-offline-rc3.exe', // nome exato do arquivo anexado a cada release
  platform: 'Windows x64',
  requirements: ['REAPER instalado.', 'Consulte a documentação da versão para verificar sistemas, versões do REAPER e dependências compatíveis.'],
  manual: 'https://github.com/siriusaudiostudio/aj-plugin-browser/releases/download/v0.8.3/LEIA-ME.md',
};

export const commerce = {
  priceBRL: null as number | null,
  checkoutUrl: '',
  deliveryUrl: '',
  licenseValidationUrl: '',
  documentationUrl: '',
  model: ['Licença vitalícia', 'Pagamento único', 'Sem assinatura recorrente'],
};

const screenshots = [
  {
    order: 1,
    src: "/aj-plugin-browser-0.8.3.png",
    display: "/capturas/visao-geral.webp",
    thumbnail: "/capturas/visao-geral-mini.webp",
    width: 1136,
    height: 867,
    title: "Visão geral",
    description: "Pesquisa, filtros e miniaturas na tela principal.",
    alt: "Grade de efeitos e instrumentos com pesquisa e filtros no AJ Plugin Browser.",
  },
  {
    order: 2,
    src: "/capturas/compressores.png",
    display: "/capturas/compressores.webp",
    thumbnail: "/capturas/compressores-mini.webp",
    width: 1136,
    height: 867,
    title: "Compressores",
    description: "Favoritos da categoria Compressores, com miniaturas de plugins de dinâmica.",
    alt: "Categoria Compressores selecionada com o filtro Favoritos ativo.",
  },
  {
    order: 3,
    src: "/capturas/instrumentos.png",
    display: "/capturas/instrumentos.webp",
    thumbnail: "/capturas/instrumentos-mini.webp",
    width: 1136,
    height: 867,
    title: "Instrumentos virtuais",
    description: "Sintetizadores, pianos, órgãos e outros instrumentos em uma grade visual.",
    alt: "Categoria Instrumentos selecionada com miniaturas de sintetizadores, pianos e órgãos.",
  },
  {
    order: 4,
    src: "/capturas/channel-strips.png",
    display: "/capturas/channel-strips.webp",
    thumbnail: "/capturas/channel-strips-mini.webp",
    width: 1136,
    height: 867,
    title: "Channel strips",
    description: "Favoritos filtrados pela categoria Channel Strips.",
    alt: "Categoria Channel Strips selecionada com o filtro Favoritos ativo.",
  },
  {
    order: 5,
    src: "/capturas/favoritos.png",
    display: "/capturas/favoritos.webp",
    thumbnail: "/capturas/favoritos-mini.webp",
    width: 1136,
    height: 867,
    title: "Favoritos",
    description: "Efeitos e instrumentos favoritos reunidos na mesma grade.",
    alt: "Filtro Favoritos ativo na visão de todas as categorias.",
  },
];

export const products = [
  {
    slug: 'aj-plugin-browser', name: 'AJ Plugin Browser', status: 'Gratuito', icon: AudioLines,
    description: 'Visualize, encontre e organize seus plugins em uma interface prática e intuitiva. O AJ Plugin Browser facilita o acesso à sua biblioteca de efeitos e instrumentos diretamente no fluxo de trabalho do REAPER.',
    category: 'Ferramenta para REAPER',
    highlight: 'Navegação visual de plugins',
    features: [
      'Navegação visual com miniaturas dos plugins', 'Pesquisa rápida por nome', 'Filtros por fabricante',
      'Filtros por categoria', 'Filtros por formato e tipo', 'Organização por favoritos',
      'Coleções e acesso aos itens recentes', 'Opções de ordenação e organização', 'Interface escura',
    ],
    steps: [
      'Instale o AJ Plugin Browser no REAPER.',
      'Atualize o inventário para localizar seus plugins.',
      'Pesquise, organize e acesse suas ferramentas com maior facilidade.',
    ],
    action: 'Conhecer ferramenta',
    captureVersion: '0.8.3',
    screenshots,
  },
  {
    slug: 'organizador-pro', name: 'Organizador Pro', status: 'Em breve', icon: FolderTree,
    description: 'Organize faixas, arquivos de áudio e projetos com ferramentas desenvolvidas para otimizar a preparação de sessões no REAPER.',
    category: 'Ferramenta para REAPER',
    action: 'Conhecer o Organizador Pro',
  },
] as const;

export const faq = [
  ['Como instalo um ReaScript?', 'Depois de baixar e extrair o pacote, siga o manual da versão. Se a distribuição incluir um arquivo ReaScript para carregamento manual, abra a lista de ações do REAPER e use New action… → Load ReaScript… para selecionar o arquivo. O manual indicará qual arquivo carregar e onde manter os arquivos auxiliares.'],
  ['Como atualizo um script?', 'Leia as notas de atualização da nova versão e faça uma cópia dos arquivos e das configurações atuais. Feche a ferramenta e siga as instruções da versão para substituir os arquivos. Se o caminho do script mudar, carregue-o novamente na lista de ações.'],
  ['Quais são os requisitos?', 'É necessário ter o REAPER instalado. Verifique a página do produto e as notas da versão para confirmar a compatibilidade com seu sistema e as dependências exigidas.'],
  ['O script não aparece ou não abre. O que verifico?', 'Confira se o pacote foi extraído por completo e se você carregou o arquivo indicado no manual. Pesquise pelo nome na seção correta da lista de ações e verifique se as extensões exigidas estão instaladas.'],
  ['Quais informações incluir em um relato de bug?', 'Inclua a versão do produto, a versão do REAPER, o sistema operacional, os passos para reproduzir o problema e a mensagem de erro. Use um projeto de teste ou remova dados pessoais das capturas.'],
];

