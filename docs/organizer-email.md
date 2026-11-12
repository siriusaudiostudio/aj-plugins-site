# Entrega de compras por e-mail

Integração com a API transacional da Brevo. Somente o pagamento aprovado e conferido na API do Mercado Pago dispara a entrega. O destinatário é `buyer_email`, informado no formulário de compra do site; o e-mail da conta Mercado Pago não o substitui.

## Configuração (produção e homologação separadas)

1. Criar a conta Brevo, verificar o remetente e liberar o envio transacional. Não contratar plano pago sem autorização.
2. Aplicar `db/organizer-email.sql` no D1 vinculado ao ambiente antes de configurar os novos segredos.
3. Cadastrar no Cloudflare Pages, como segredos:
   - `BREVO_API_KEY`: chave API da Brevo, não senha SMTP.
   - `ORGANIZER_DELIVERY_KEY`: 32 bytes aleatórios em hexadecimal (64 caracteres). Criptografa os códigos guardados no D1 com AES-GCM. Fazer backup seguro; não trocar sem migrar os códigos criptografados.
   - `ORGANIZER_DELIVERY_ADMIN_TOKEN`: segredo aleatório exclusivo para entregas administrativas.
4. Cadastrar variáveis:
   - `ORGANIZER_EMAIL_FROM`: remetente verificado na Brevo.
   - `ORGANIZER_EMAIL_REPLY_TO`: `siriusaudiostudio@gmail.com`.
   - `ORGANIZER_PUBLIC_ORIGIN`: `https://ajplugins.pages.dev` em produção, sem barra final; usar o endereço da homologação no ambiente de teste.
   - `ORGANIZER_EMAIL_ENABLED`: `true` somente depois da migração e configuração.
5. Publicar, executar uma entrega autorizada de pedido aprovado e conferir o registro de entrega na Brevo e a chegada ao destinatário.

Endereço Gmail não permite autenticar seu domínio na Brevo. O serviço pode substituir o remetente por um domínio próprio; `Reply-To` mantém as respostas no Gmail informado. Para identidade de remetente com domínio próprio, configurar domínio e DNS verificados. Referência: https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders

## Segurança e funcionamento

- A tabela `organizer_delivery` guarda hash do código, cópia criptografada, tentativas, último erro sanitizado, identificador do provedor e horário de aceitação.
- O código enviado é uma credencial adicional do mesmo pedido. Não revoga o código anterior, não cria outra licença e não amplia o limite de dois computadores.
- O link usa fragmento `#pedido=`, evitando colocar a chave nos parâmetros recebidos pelo servidor. É um link privado: não compartilhar.
- A licença `.ajlic` é vinculada à máquina e emitida na ativação, não antecipadamente por e-mail.
- Não há anexo EXE: o instalador permanece no bucket privado e exige pedido aprovado.
- Webhooks duplicados não reenviam mensagens marcadas como enviadas. Uma trava de dois minutos coordena tentativas simultâneas; a requisição à Brevo usa `IdempotencyKey`.
- Falha de envio mantém o pagamento aprovado e retorna 503 ao webhook para nova tentativa do Mercado Pago. Não existe tarefa agendada neste projeto; monitorar pendências e reenviar administrativamente se as tentativas do provedor se esgotarem.
- Em falha ambígua (provedor recebeu, mas resposta ou gravação se perdeu), conferir o log da Brevo antes de repetir fora da janela de idempotência. Não há garantia absoluta de envio único entre sistemas externos.
- `state=sent` indica aceitação pela API da Brevo, não comprova entrega à caixa de entrada. Conferir eventos de entrega/rejeição no provedor.

## Entrega de compra anterior ou repetição de tentativa pendente

POST `/api/organizer?delivery`, com `Authorization: Bearer <ORGANIZER_DELIVERY_ADMIN_TOKEN>` e JSON `{"orderId":"UUID do pedido"}`. Nunca incluir segredos na URL, no repositório ou em registros. O endpoint não aceita endereço alternativo e não libera pedido sem pagamento. Se já enviado, retorna `sent` sem novo envio.

Para monitorar sem expor códigos:

```sql
SELECT order_id, state, attempts, last_error, provider_id, sent_at
FROM organizer_delivery;
```

## Validação local

`node --test scripts/organizer-email-test.mjs`

Testes usam SQLite real em memória e respostas simuladas dos provedores. Cobrem pagamento pendente/aprovado, assinatura inválida, falha e repetição, destinatário, criptografia, código antigo, novo código e bloqueio do terceiro computador. Não comprovam envio real de e-mail ou entrega na caixa de entrada.
# Recuperação e acompanhamento (12/11/2026)

Aplicar também `db/organizer-recovery.sql` antes de publicar esta versão, em cada ambiente. Migração aditiva: não altera credenciais nem computadores existentes.

- A página do produto oferece **Já comprei — recuperar meu pedido**. `POST /api/organizer?recover` recebe somente o e-mail; envia ao endereço registrado, nunca a um destinatário fornecido separadamente. A resposta pública não revela se há pedidos. Pedidos não pagos ou bloqueados não recebem acesso.
- Reenvio reutiliza a credencial criptografada e mantém o limite compartilhado de dois computadores. Limites persistentes: 15 minutos entre solicitações por e-mail, 3/dia por e-mail, 10/h por IP e 100 solicitações/dia globais. Até cinco pedidos por e-mail. A execução usa `waitUntil`; falhas ficam registradas na tabela de entrega. Não há tarefa periódica: repetir após o intervalo ou acionar suporte em caso de falha.
- **Salvar meu acesso** baixa um arquivo privado com código e link. Não é uma nova licença e não altera a ativação. E-mail incorreto na compra exige suporte e conferência do comprovante; não há troca anônima de destinatário.
- A consulta autenticada do pedido acompanha eventos reais da API Brevo, com cache de um minuto. Aceite do provedor, recebimento pelo servidor destinatário, adiamento e bloqueio são estados diferentes. `delivered` não garante caixa principal nem leitura. Não há webhook Brevo configurado; a consulta ocorre ao verificar o pedido/atualizar a situação.
- Notificações assinadas do Mercado Pago consultam o pagamento na API. Reembolso integral, chargeback e cancelamento de pagamento vinculado bloqueiam novos downloads, recuperação e ativações, mantendo histórico e vagas. O bloqueio é conservador e exige revisão manual para reversão. Uma licença permanente já emitida funciona offline: este ajuste **não revoga retroativamente o arquivo no computador**. Reembolsos parciais e disputas precisam de acompanhamento administrativo.
- Troca de computador: verificar identidade/comprovante e avaliar individualmente. Não apagar vagas automaticamente: isso permitiria emitir licenças offline ilimitadas. Não há transferência automática implementada.
