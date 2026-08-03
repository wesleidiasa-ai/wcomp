# API de Pedidos de Compra

Backend REST em Node.js + TypeScript + Express + Prisma + PostgreSQL, modelado a partir do
schema de `companies`, `departments`, `users`, `approval_rules`, `purchase_requests`,
`purchase_request_items`, `approval_steps`, `status_history` e `notifications`, com as
extensões `quotes`, `quote_attachments` (cotações de fornecedor) e `whatsapp_sessions`
(bot de intake de pedidos via WhatsApp).

## Stack

- Express (REST)
- Prisma ORM + PostgreSQL
- JWT (jsonwebtoken + bcryptjs) para autenticação
- Zod para validação de payloads

## Rodando localmente

Pré-requisitos: Node.js 20+, Docker (ou um Postgres já rodando).

```bash
cd backend
npm install
cp .env.example .env
docker compose up -d
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

A API sobe em `http://localhost:3000`. O seed cria uma empresa de exemplo com 4 usuários
(admin, aprovador, comprador, solicitante), todos com senha `senha123`.

## Autenticação

- `POST /auth/register-company` — cria uma empresa (tenant) + usuário admin.
- `POST /auth/login` — retorna um JWT.
- `GET /auth/me` — dados do usuário autenticado.

Envie o token nas demais rotas via header `Authorization: Bearer <token>`. O JWT carrega
`userId`, `companyId` e `role`; todas as rotas filtram automaticamente pelo `companyId` do
token (multi-tenant).

## Papéis (`role`)

`admin`, `comprador`, `solicitante`, `aprovador`. Regras de acesso principais:

- `admin`: CRUD completo de setores, usuários e regras de aprovação, e edita os dados
  cadastrais da empresa (`PATCH /companies/me`). Qualquer usuário pode ver esses dados
  (`GET /companies/me`).
- Qualquer usuário autenticado pode criar um pedido de compra.
- `solicitante` só vê os próprios pedidos; os demais papéis veem todos os pedidos da empresa.
- `aprovador`/`admin` aprovam ou reprovam etapas de aprovação.
- `comprador`/`admin` avançam o status pós-aprovação (`em_cotacao` → `pedido_enviado` → `aguardando_entrega`
  **ou** `aguardando_retirada` → `recebido`, ou `cancelado` em qualquer ponto do caminho).
- `comprador`/`admin` registram e selecionam cotações de fornecedores (com anexos de orçamento) enquanto o
  pedido está `em_cotacao`.

## Motor de aprovação

Ao criar um pedido (`POST /purchase-requests`):

1. Busca `approval_rules` do setor do pedido; se nenhuma regra de setor bater com o valor
   estimado, cai para as regras "empresa toda" (`department_id = null`).
2. Filtra as regras cujo valor estimado do pedido esteja entre `min_value` e `max_value`.
3. Cria uma `approval_steps` (cópia congelada) por regra, ordenada por `step_order`.
4. Se nenhuma regra bater, o pedido é aprovado automaticamente.
5. Notifica (stub em `notifications`) o primeiro aprovador.

Aprovações são sequenciais: uma etapa só pode ser decidida se todas as etapas de
`step_order` menor já estiverem aprovadas. Ao aprovar a última etapa, o pedido vira
`aprovado` e o solicitante é notificado; ao reprovar qualquer etapa, o pedido vira
`reprovado` imediatamente.

## Cotações (fase `em_cotacao`)

Depois de aprovado, o comprador move o pedido para `em_cotacao` e pode registrar quantas
cotações de fornecedor quiser (`POST /purchase-requests/:id/quotes`: fornecedor, valor
total, prazo de entrega, observações). Uma delas é marcada como vencedora
(`POST .../quotes/:quoteId/select` — desmarca as demais automaticamente). O avanço de
status `em_cotacao` → `pedido_enviado` é **bloqueado (409)** até existir uma cotação
vencedora selecionada. Cotações só podem ser criadas/selecionadas/removidas enquanto o
pedido está `em_cotacao`.

Cada cotação aceita anexos (PNG, JPEG, WEBP ou PDF, até 10MB) — prints de orçamento, PDFs
de proposta, etc. Os arquivos ficam em `backend/uploads/<company_id>/<quote_id>/...` no
disco local (trocar por S3/Cloudinary antes de ir pra produção multi-instância) e só são
servidos via `GET .../attachments/:attachmentId` autenticado — nunca por URL pública direta.

Depois de `pedido_enviado`, o comprador escolhe se o pedido vai ficar `aguardando_entrega`
(transportadora leva até a empresa) ou `aguardando_retirada` (alguém busca no
fornecedor/depósito); os dois convergem para `recebido`.

## Bot de pedidos via WhatsApp

Qualquer usuário cadastrado com `phone` preenchido pode abrir um pedido de compra
mandando mensagem pro número do WhatsApp Business da empresa. O bot guia uma conversa
curta: título → setor → itens (nome, quantidade, valor unitário estimado) → confirmação.
No fim, chama o mesmo `createPurchaseRequest` usado pela rota REST — mesma regra de
negócio, mesmo motor de aprovação, mesmas notificações.

Comandos: mandar **"pedido"** (ou "solicitar"/"comprar") começa um pedido novo;
**"cancelar"** aborta a qualquer momento; no passo de item, **"pular"** pula o valor
unitário estimado.

### Roteamento multi-tenant (cada empresa com seu próprio número)

O sistema é multi-tenant — várias empresas usam a mesma instalação, cada uma enxergando só
os próprios dados. Pra isso funcionar com o bot de WhatsApp, **cada empresa precisa
cadastrar o `Phone Number ID` do seu próprio número do WhatsApp Business** em
`PATCH /companies/me` (campo `whatsappPhoneNumberId`, também editável na tela "Empresa" do
frontend).

Quando uma mensagem chega no webhook, é o `metadata.phone_number_id` do payload da Meta —
ou seja, **qual número recebeu a mensagem**, não quem mandou — que diz a qual empresa ela
pertence. Só depois disso o usuário é procurado pelo campo `phone`, e só dentro daquela
empresa. Sem essa etapa, dois clientes diferentes do SaaS com o mesmo número de celular
cadastrado (coincidência rara, mas possível) poderiam ter suas mensagens misturadas — e é
exatamente esse cenário que o roteamento por `phone_number_id` evita. Mensagens que chegam
num `phone_number_id` sem empresa correspondente são ignoradas e logadas, nunca processadas
"na sorte".

O usuário dentro da empresa é casado pelo campo `phone` (comparado só por dígitos — pode
estar em qualquer formato, ex: `(11) 99999-8888` ou `5511999998888`). Números não
cadastrados recebem uma mensagem pedindo pra falar com o admin.

### Rodando sem credenciais da Meta (dev)

Sem `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` no `.env`, o envio de mensagem cai
num stub que só loga no console (`[whatsapp:stub] to=... -> ...`) — dá pra testar a
conversa inteira simulando os payloads que a Meta manda, sem precisar de conta nenhuma:

```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{ "id": "1", "changes": [{ "field": "messages", "value": {
      "messaging_product": "whatsapp",
      "metadata": { "phone_number_id": "SEU_WHATSAPP_PHONE_NUMBER_ID_AQUI" },
      "messages": [{ "from": "5511999998888", "id": "wamid.1", "timestamp": "0", "type": "text", "text": { "body": "pedido" } }]
    }}]}]
  }'
```

O `metadata.phone_number_id` precisa bater com o `whatsappPhoneNumberId` de alguma empresa
cadastrada (`PATCH /companies/me`), e o número em `"from"` precisa bater com o `phone` de
algum usuário **daquela empresa** (ver `POST /users` ou `PATCH /users/:id`).

### Configurando de verdade (Meta Cloud API)

Passos que só dá pra fazer no painel da Meta (fora do meu alcance — precisa da sua conta):

1. Criar um app em [developers.facebook.com](https://developers.facebook.com), adicionar o
   produto **WhatsApp**, e configurar/verificar um número de telefone comercial.
2. Gerar um **access token permanente** (token temporário de teste expira em 24h) e pegar o
   **Phone Number ID** — ambos vão em `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`.
3. Definir um `WHATSAPP_VERIFY_TOKEN` (qualquer string sua) e um `WHATSAPP_APP_SECRET`
   (em App Settings → Basic) no `.env`.
4. No painel do produto WhatsApp → Configuration, apontar o **Callback URL** pro seu
   `https://<seu-dominio-publico>/webhooks/whatsapp`, com o **Verify Token** igual ao
   `WHATSAPP_VERIFY_TOKEN`, e assinar o campo `messages`.
5. Como este backend só roda em `localhost` por enquanto, o passo 4 exige um endereço
   público — use `ngrok http 3000` (ou similar) pra testar, e um deploy de verdade
   (Railway/Render/VPS) antes de usar em produção. A Meta não aceita `localhost`.

Sem `WHATSAPP_APP_SECRET` configurado, a verificação de assinatura do webhook é pulada —
isso é aceitável em dev (só você bate no seu próprio endpoint), mas é **obrigatório**
configurar em produção, senão qualquer um que descobrir a URL do webhook pode forjar
mensagens em nome de qualquer usuário cadastrado.

## Principais rotas

```
POST   /auth/register-company
POST   /auth/login
GET    /auth/me

GET    /companies/me
PATCH  /companies/me

GET    /departments
POST   /departments
PATCH  /departments/:id
DELETE /departments/:id

GET    /users
POST   /users
PATCH  /users/:id
DELETE /users/:id

GET    /approval-rules
POST   /approval-rules
PATCH  /approval-rules/:id
DELETE /approval-rules/:id

GET    /purchase-requests
GET    /purchase-requests/:id
POST   /purchase-requests
PATCH  /purchase-requests/:id
POST   /purchase-requests/:id/approval-steps/:stepId/approve
POST   /purchase-requests/:id/approval-steps/:stepId/reject
PATCH  /purchase-requests/:id/status

POST   /purchase-requests/:id/quotes
POST   /purchase-requests/:id/quotes/:quoteId/select
DELETE /purchase-requests/:id/quotes/:quoteId

POST   /purchase-requests/:id/quotes/:quoteId/attachments
GET    /purchase-requests/:id/quotes/:quoteId/attachments/:attachmentId
DELETE /purchase-requests/:id/quotes/:quoteId/attachments/:attachmentId

GET    /webhooks/whatsapp   (verificação da Meta)
POST   /webhooks/whatsapp   (recebe mensagens)
```

## Notas de implementação

- `notifications` (in-app) é um stub: grava a linha no banco e loga no console — trocar por
  uma integração de e-mail de verdade em `src/services/notification.service.ts` quando fizer
  sentido. O canal WhatsApp de fato manda mensagem real assim que `WHATSAPP_ACCESS_TOKEN` e
  `WHATSAPP_PHONE_NUMBER_ID` estiverem configurados (ver seção acima).
- Anexos de cotação ficam em disco local (`backend/uploads/`) — funciona bem para uma
  instância única; trocar por S3/Cloudinary antes de rodar múltiplas instâncias do backend.
