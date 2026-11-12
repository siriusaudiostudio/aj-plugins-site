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
