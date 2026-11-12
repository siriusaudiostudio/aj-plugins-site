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
    slug: 'organizador-pro', name: 'AJ Organizer Pro', status: 'Em breve', icon: FolderTree,
    description: 'Organize seus VS no REAPER em menos tempo, com ajuda da inteligência artificial. Adicione pastas, ZIPs ou RARs, revise os destinos dos stems e importe as músicas prontas em ordem.',
    version: '0.2.80',
    requirements: 'Windows 64 bits. Requer REAPER e ativação no computador.',
    category: 'Ferramenta para REAPER',
    action: 'Conhecer o AJ Organizer Pro',
    highlights: [
      { title: 'IA de BPM e batidas', description: 'Quando o BPM não estiver informado no nome da pasta ou do clique, a IA analisa a mixagem do VS ou um áudio escolhido para estimar o BPM, identificar as batidas e sugerir o compasso. Ajuste a grade ao andamento original ou alinhe os stems juntos a um BPM fixo.' },
      { title: 'IA de reconhecimento de instrumentos e sugestão de destinos', description: 'A IA analisa o áudio de cada stem para reconhecer a família do instrumento. O Organizer usa esse resultado e as regras da sessão para sugerir a pista de destino no REAPER e pode preenchê-la automaticamente quando houver uma opção compatível e inequívoca.' },
      { title: 'Da importação ao ensaio', description: 'Revise e importe várias músicas em ordem, alinhe os stems pelo clique e exporte um MP3 de ensaio com clique e guia quando presentes.' },
    ],
    features: [
      { title: 'Importação e fila de músicas', items: [
        'Carregue VS de pastas ou arquivos ZIP e RAR, com extração automática dos compactados.',
        'Selecione vários arquivos compactados de uma vez ou arraste-os para a fila. Adicione, remova e reordene músicas antes de importar.',
        'Acompanhe o BPM, os destinos reconhecidos e as pendências de cada VS. Enquanto uma música aguarda análise, o Organizer pode adiantar a conferência das próximas.',
        'Importe os VS prontos em ordem, com uma única confirmação. Se precisar pausar, pare após a música em andamento.',
      ] },
      { title: 'Reconhecimento de instrumentos e destinos', items: [
        'Analise as pistas da sessão aberta no REAPER, incluindo canais soltos e canais organizados em pastas.',
        'Identifique instrumentos por nomes, abreviações e aliases. Indicações como Solo, L e R ajudam a localizar um destino compatível.',
        'Quando o nome for insuficiente, a IA YAMNet analisa o áudio localmente para identificar a família do instrumento e ajudar o Organizer a sugerir uma pista de destino. O destino pode ser preenchido automaticamente quando o reconhecimento e as regras da sessão indicarem uma opção compatível e inequívoca.',
        'Pesquise e altere destinos entre as pistas reais da sessão. Filtre por família ou consulte todas as pistas.',
        'Aplique um destino a vários arquivos, ignore áudios do lote, autorize stems a compartilhar uma pista ou crie um canal quando faltar um destino.',
        'Aplique a escolha apenas à importação atual ou salve aliases, vínculos e regras para os próximos lotes.',
      ] },
      { title: 'BPM, compasso e alinhamento musical', items: [
        'Aproveite o BPM indicado no nome da pasta ou do clique. Se a informação estiver ausente, a IA analisa a mixagem do VS ou um áudio escolhido para estimar o BPM e identificar as batidas.',
        'Trabalhe com BPM fracionado, estimativa de compasso e mudanças sustentadas de andamento. Ajuste BPM e compasso manualmente quando precisar.',
        'Preserve o áudio e ajuste a grade do REAPER ao andamento detectado ou ajuste todos os stems juntos a um BPM fixo.',
        'Localize o primeiro ataque significativo do clique com a ferramenta de transientes e ajuste o início com um corte sincronizado entre os stems.',
        'Transponha os stems das famílias harmônicas em semitons com o algoritmo élastique 3.3.3 Pro.',
      ] },
      { title: 'Posicionamento, prévia e normalização', items: [
        'Defina o nome da região e posicione o VS no cursor de edição ou no fim livre do projeto.',
        'Abra espaço para inserir uma música entre regiões e deslocar o conteúdo posterior.',
        'Ouça cada stem antes de importar, navegue pela prévia e confira o destino na tabela.',
        'Inclua ou deixe de fora o baixo e revise conflitos de destino antes de confirmar.',
        'Ative a normalização individual por pico para uma música ou para todos os VS prontos da fila.',
      ] },
      { title: 'MP3 para ensaio', items: [
        'Gere um MP3 de ensaio com os áudios originais carregados, incluindo clique e guia quando presentes.',
        'Exporte a soma dos stems com as proporções de volume originais, sem aplicar os efeitos da sessão do REAPER.',
        'Escolha a pasta de saída e acompanhe ou cancele a exportação. Os arquivos originais ficam intactos.',
      ] },
      { title: 'Configurações e suporte', items: [
        'Gerencie aliases, vínculos de pistas, famílias e regras da sessão nas configurações avançadas.',
        'Consulte os detalhes da análise e gere um log de diagnóstico com os tempos de processamento por música.',
        'Reabra o Organizer com o tamanho de janela que você ajustou.',
        'Confira a versão e o titular da licença no menu Sobre.',
      ] },
    ],
  },
] as const;

export const faq = [
  ['Como instalo um ReaScript?', 'Depois de baixar e extrair o pacote, siga o manual da versão. Se a distribuição incluir um arquivo ReaScript para carregamento manual, abra a lista de ações do REAPER e use New action… → Load ReaScript… para selecionar o arquivo. O manual indicará qual arquivo carregar e onde manter os arquivos auxiliares.'],
  ['Como atualizo um script?', 'Leia as notas de atualização da nova versão e faça uma cópia dos arquivos e das configurações atuais. Feche a ferramenta e siga as instruções da versão para substituir os arquivos. Se o caminho do script mudar, carregue-o novamente na lista de ações.'],
  ['Quais são os requisitos?', 'É necessário ter o REAPER instalado. Verifique a página do produto e as notas da versão para confirmar a compatibilidade com seu sistema e as dependências exigidas.'],
  ['O script não aparece ou não abre. O que verifico?', 'Confira se o pacote foi extraído por completo e se você carregou o arquivo indicado no manual. Pesquise pelo nome na seção correta da lista de ações e verifique se as extensões exigidas estão instaladas.'],
  ['Quais informações incluir em um relato de bug?', 'Inclua a versão do produto, a versão do REAPER, o sistema operacional, os passos para reproduzir o problema e a mensagem de erro. Use um projeto de teste ou remova dados pessoais das capturas.'],
];

