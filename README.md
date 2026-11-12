# AJ Plugins

Site estático em React, TypeScript e Vite. O build gera HTML para cada rota e uma página 404 para o Cloudflare Pages. O CSS da interface é próprio, a fonte Inter é servida localmente e os ícones são do Lucide.

## Desenvolvimento

Instale o Node.js 24 com npm e execute na pasta deste projeto.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

O build verifica TypeScript e gera a pasta `dist`. O preview do Vite permite conferir as páginas locais. A resposta HTTP 404 em rotas inexistentes é responsabilidade do Pages em produção.

## Cloudflare Pages

1. Crie um repositório vazio no GitHub, exclusivo para o site. Na pasta `aj-plugins-site`, inicialize e envie os arquivos. Substitua o endereço do remoto pelo endereço real do novo repositório.
   ```sh
   git init -b main
   git add .
   git commit -m "Cria site AJ Plugins"
   git remote add origin URL_DO_REPOSITORIO
   git push -u origin main
   ```
2. No Cloudflare, abra **Workers & Pages → Create application → Pages → Import an existing Git repository**. Autorize a integração para o repositório do site.
3. Escolha **ajplugins** como nome do projeto se estiver disponível. Configure a branch de produção como `main`, o comando como `npm run build` e a saída como `dist`. Mantenha a raiz do repositório como diretório de trabalho.
4. Salve e implante. Abra o endereço de produção mostrado em **Deployments**. O subdomínio `pages.dev` é atribuído pelo Pages.
5. Depois de confirmar a URL pública, preencha `site.origin` em `src/config.ts` e envie a alteração para `main`. Isso ativa as URLs canônicas e a imagem Open Graph. Confira também uma página interna e uma rota inexistente no endereço publicado.

Referências oficiais: [React no Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [integração Git](https://developers.cloudflare.com/pages/get-started/git-integration/) e [páginas estáticas e erros 404](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Produtos, contatos e mídia

Edite `src/config.ts`. O catálogo e as rotas de produto são gerados da lista `products`. As capturas do AJ Plugin Browser são configuradas na lista `screenshots` de `src/config.ts`. Cada entrada tem caminho do PNG original, WebP de exibição, miniatura, dimensões, título, descrição, texto alternativo e ordem. Para adicionar uma captura, guarde o PNG original em `public/capturas`, exporte um WebP sem perdas nas dimensões originais e uma miniatura proporcional e adicione uma entrada à lista. A versão retratada é independente da release pública. Preencha apenas contatos oficiais. Para e-mail, use uma URL `mailto:`; os demais links usam HTTPS. Defina o manual HTTPS em `release.manual`.

O objeto `commerce` reserva os campos de preço em reais, checkout externo, entrega digital, validação de licença e documentação. A página apresenta o modelo comercial planejado e só mostra o link de documentação quando configurado. Antes de vender, implemente e teste o fluxo com os serviços escolhidos.

## Downloads e novas versões sem rebuild

1. Publique uma release estável em um repositório GitHub público. Anexe o arquivo distribuível na seção **Assets**, com um nome fixo entre versões. Teste o download desse anexo em uma janela sem sessão do GitHub.
2. Configure `release.repository` como `proprietario/repositorio`, `release.asset` com o nome exato do anexo, `release.platform`, `release.requirements` e `release.enabled: true`. Faça um deploy dessa configuração.
3. A cada versão seguinte, publique uma release estável marcada como a mais recente, com tag, notas e o mesmo nome de anexo. A versão, a data, as notas e a URL vêm do GitHub Releases em tempo de visita. Mantenha os assets antigos para que os links históricos externos continuem funcionando. Alterações no repositório de origem, no nome do anexo, nas plataformas anunciadas ou nos requisitos exibidos exigem atualizar a configuração e implantar o site novamente.

O site exige um anexo público com o nome configurado, estado de upload concluído, tamanho positivo e URL canônica do repositório. Releases privadas, rascunhos, prévias, falhas de consulta e anexos ausentes mantêm **Download em breve**. A API pública do GitHub tem limites de requisição. O histórico mostra a release atual e as releases estáveis encontradas entre as dez entradas mais recentes da API.


## Comentários e sugestões

Cada página de produto tem sua própria seção `#comentarios`. O painel identifica o produto de cada envio. O painel em `/moderacao/` exige a chave de acesso para consultar ou moderar envios. Comentários começam pendentes. Sugestões ficam privadas e não podem ser publicadas. Use **Retirar do site** para arquivar um comentário publicado ou **Voltar para revisão** para reabrir um envio arquivado. O formulário aceita até cinco envios por origem por dia e a lista pública exibe os 30 comentários aprovados mais recentes.

Para um banco existente com o esquema anterior, execute `db/feedback-by-product.sql` uma vez antes do deploy. Os envios existentes ficam associados ao AJ Plugin Browser.

Para ativar em produção:

1. No Cloudflare, crie um banco D1 dedicado, por exemplo `ajplugins-feedback`. Execute o conteúdo de `db/feedback.sql` no console do banco.
2. No projeto Pages **ajplugins**, em **Settings → Bindings**, vincule esse banco em **Production** com o nome `FEEDBACK_DB`.
3. Em **Settings → Variables and Secrets**, adicione `FEEDBACK_ADMIN_TOKEN` em **Production** como **Secret**. Gere uma chave aleatória, por exemplo com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, e guarde-a no seu gerenciador de senhas. Use essa chave no painel de moderação. Mantenha-a fora do Git.
4. Publique a branch com a função e o formulário. Verifique que a rota pública `GET /api/feedback` responde com `items`, que `GET /api/feedback?admin` sem chave retorna 401 e que um comentário só aparece após aprovação.

Referência: [Bindings e secrets no Cloudflare Pages](https://developers.cloudflare.com/pages/functions/bindings/).
