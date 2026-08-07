# SupplyOR — Funcionalidades e Roadmap

_Última atualização: 06/08/2026_

Este documento resume o que o SupplyOR já faz hoje em produção (supplyor.com.br) e o que está mapeado como próximos passos. É um retrato do sistema neste momento — conforme novas funcionalidades entrarem, vale manter este arquivo atualizado.

---

## 1. Visão geral

SupplyOR é um SaaS multi-tenant de **pedido de compra e aprovação** para pequenas e médias empresas: cada empresa (tenant) tem seus próprios usuários, setores, fornecedores e fluxo de aprovação, isolados dos demais clientes na mesma base de dados.

Fluxo principal de um pedido:

```
Solicitação → Aprovação → Cotação → Pedido enviado ao fornecedor
→ Aguardando entrega/retirada → Recebido
```

---

## 2. Funcionalidades atuais

### 2.1 Pedidos de compra
- Criação de pedido com múltiplos itens (nome, quantidade, unidade, preço estimado, observações)
- Numeração sequencial automática por empresa (`#1`, `#2`, ...)
- Urgência (baixa/normal/alta/urgente) e justificativa
- Prazo de cotação (`quoteDeadline`) opcional
- Fluxo de status guiado (transições válidas controladas no backend):
  `aguardando_aprovacao → aprovado/reprovado → em_cotacao → pedido_enviado → aguardando_entrega | aguardando_retirada → recebido` (ou `cancelado` em qualquer etapa intermediária)
- Timeline visual (stepper) do progresso do pedido
- Histórico de status completo (auditoria de quem mudou o quê e quando)
- Exclusão de pedido (com restrições de status/permissão)
- **Geração de PDF do pedido de compra**, no layout de tabela com bordas (paisagem, A4), pronto pra enviar ao fornecedor — inclui dados da empresa (com logo, se configurada), itens, cotação vencedora, condição de pagamento e observações

### 2.2 Aprovação
- Regras de aprovação configuráveis por setor e faixa de valor (`minValue`/`maxValue`), com múltiplos níveis (`stepOrder`)
- Motor de aprovação: gera as etapas do pedido a partir das regras vigentes no momento da criação (cópia congelada, não muda retroativamente se a regra for editada depois)
- Aprovar/reprovar com comentário
- Registro de **quem de fato decidiu** cada etapa (pode ser diferente do aprovador designado, quando um admin decide no lugar dele) — mostrado na timeline e no detalhe do pedido

### 2.3 Cotações
- Cadastro de múltiplas cotações por pedido (fornecedor, valor total, frete, prazo de entrega, observações)
- Autocomplete de fornecedor a partir do catálogo já cadastrado
- Cálculo automático do valor total (produto + frete) e destaque da **cotação de menor valor**
- Seleção manual da cotação vencedora pelo comprador (o sistema sugere, mas não decide sozinho)
- Campo de condição de pagamento como lista (à vista / a prazo)
- Anexos por cotação (print de orçamento, PDF de proposta) — upload, download e exclusão

### 2.4 Fornecedores
- Catálogo de fornecedores por empresa (nome, CNPJ, telefone, e-mail, avaliação 1–5, observações)
- Máscara de digitação para CNPJ e telefone
- Página de detalhe do fornecedor com estatísticas: total de cotações, cotações vencidas, prazo médio de entrega, preço médio, produtos fornecidos

### 2.5 Histórico de preços
- Base de dados por **evento de compra real** (item + data + fornecedor da cotação vencedora), não só estimativa
- Tabela com último preço, preço médio, menor, maior, última compra e último fornecedor por item
- Busca por nome do item e filtros por ano, fornecedor e setor
- Selo de situação do preço (🟢 abaixo da média / 🟡 dentro da média / 🔴 acima da média)
- Indicador de economia/aumento entre a primeira e a última compra do item
- Modal por item com gráfico de evolução do preço médio mês a mês e histórico completo de compras por fornecedor

### 2.6 Dashboard e indicadores
- Dashboard adaptado por papel (solicitante vê só o que é dele; admin/comprador vê a empresa toda)
- KPIs do mês: pedidos criados, aguardando aprovação, em cotação, compras realizadas (qtde + valor), economia obtida
- Gráfico de compras por mês (últimos 6 meses)
- Indicadores gerenciais: gasto por setor, top fornecedores, quem mais solicita, tempo médio de aprovação, tempo médio de compra, economia em negociações, pedidos atrasados
- Seção de **Insights**: observações automáticas geradas a partir dos dados do período (ex: setor que mais gasta, fornecedor mais usado, % de economia)
- Centro de notificações (sino no header) com pendências do usuário

### 2.7 Administração da empresa (papel admin)
- Dados da empresa: razão social, CNPJ, endereço, contato
- Upload/remoção de **logo da empresa** (armazenada no banco, sobrevive a redeploy), usada no PDF do pedido
- Gestão de setores (departamentos)
- Gestão de usuários: criar, **editar (nome, cargo, setor)**, remover
- Limite de usuários por empresa, quando configurado pelo admin da plataforma
- Regras de aprovação configuráveis

### 2.8 Contas e segurança
- Login com e-mail e senha (JWT, expira em 8h)
- Papéis: admin, comprador, solicitante, aprovador — cada um com acesso restrito às telas cabíveis
- **Troca de senha obrigatória no primeiro acesso** (usuário criado pelo admin recebe senha provisória)
- **Recuperação de senha por e-mail** (token com hash, expira em 1h, sem revelar se o e-mail existe)
- E-mails transacionais reais via Resend (boas-vindas com senha inicial, redefinição de senha), com domínio próprio verificado (`supplyor.com.br`)
- Empresa pode ser **ativada/desativada** pelo admin da plataforma (login bloqueado quando desativada)

### 2.9 Feedback interno
- Botão "💡 Feedback" no menu lateral, disponível a qualquer usuário logado
- Envio de sugestão ou reporte de problema, direto pro painel do admin da plataforma (não pro admin do cliente)

### 2.10 Bot de WhatsApp (intake de pedidos)
- Integração com WhatsApp Cloud API (Meta), por empresa (`whatsappPhoneNumberId` próprio)
- Conversa guiada (máquina de estados) pra criar um pedido de compra direto pelo WhatsApp, sem abrir o sistema
- Isolamento multi-tenant reforçado (mesmo telefone pode existir em empresas diferentes)
- Modo stub em desenvolvimento (loga no console em vez de enviar de verdade), sem precisar de conta da Meta pra testar

### 2.11 Painel do admin da plataforma (você, Weslei)
Protegido por chave compartilhada (`x-admin-key`), fora do login normal das empresas clientes:
- **Lista de espera**: pedidos de acesso de quem preenche o formulário público, sem criar empresa automaticamente
- **Criar empresa**: cadastro manual de empresa + admin inicial (com envio de e-mail de boas-vindas)
- **Gestão de empresas**: ativar/desativar, definir limite de usuários
- **Sugestões e problemas**: feed do que os usuários reportaram, com link pra empresa/usuário de origem

### 2.12 Site público
- Landing page de alta conversão (`supplyor.com.br`), com CTA de "Solicitar acesso" (waitlist, não auto-cadastro)
- Botão flutuante de WhatsApp
- Domínio próprio configurado no Cloudflare (frontend + backend + e-mail)

---

## 3. Limitações conhecidas (vale ter em mente)

- **Preço por item é a estimativa do solicitante**, não o preço negociado por item na cotação — a cotação é fechada por pedido inteiro (não item a item). O histórico de preços já usa o fornecedor real da cotação vencedora, mas o valor ainda é a estimativa.
- Anexos de cotação ficam em disco no Railway, que é **efêmero** (apagado a cada redeploy) — diferente da logo da empresa, que já foi migrada pra ficar no banco.
- Não existem campos de categoria de item nem centro de custo no cadastro — os filtros do histórico de preços hoje cobrem só ano, fornecedor e setor.
- O campo `plan` da empresa (trial/básico/pro) existe no banco mas ainda não trava nenhuma funcionalidade — não há cobrança nem diferenciação de plano implementada.

---

## 4. Roadmap

### Curto prazo (evolução natural do que já existe)
- **Inteligência de Compra no momento do pedido**: ao digitar um item no formulário de novo pedido, mostrar um painel lateral com o histórico daquele item (última compra, menor preço em 12 meses, melhor fornecedor, se o preço atual está acima/abaixo da média) — ideia do Weslei, transforma o histórico de consulta passiva em apoio à decisão na hora de comprar.
- **Exportar histórico de preços e indicadores** em CSV/Excel, pra levar pra negociação ou pra planilha de gestão.
- **Categoria de item e centro de custo** no cadastro de item, com filtro correspondente no histórico de preços e nos indicadores.
- **Preço por item na cotação** (hoje é só o total do pedido): permitiria comparação de preço real item a item entre fornecedores, não só a estimativa.

### Médio prazo
- **Anexos em storage externo** (S3-compatible) pra não depender do disco efêmero do Railway.
- **Planos e cobrança**: usar o campo `plan` de verdade — limites diferentes por plano (usuários, pedidos/mês, recursos), integração com um gateway de pagamento.
- **Notificações por e-mail** além das transacionais atuais (ex: resumo diário/semanal de pendências, pedido parado há X dias).
- **App/PWA mobile** ou uma versão mobile-first do fluxo de aprovação, pra aprovador aprovar direto do celular sem abrir o site inteiro.
- **Central de auditoria** por empresa: log de quem viu/alterou o quê, além do histórico de status já existente.

### Longo prazo
- **Integração com sistemas contábeis/ERP** (exportação ou API) pra evitar redigitação de nota fiscal e lançamento financeiro.
- **Cotação assistida por WhatsApp com o fornecedor**: hoje o bot só ajuda o solicitante a abrir pedido; a ideia é estender pro lado do fornecedor responder cotação também por WhatsApp.
- **Scorecard de fornecedor** mais robusto: pontualidade, variação de preço ao longo do tempo, taxa de resposta — pra apoiar decisão de homologação/desqualificação.
- **Multiempresa/multi-filial** dentro do mesmo tenant, pra clientes maiores com mais de uma unidade.

---

## 5. Ideias avaliadas e conscientemente deixadas de fora (por ora)

- **Página de item "estilo Mercado Livre"** no histórico de preços — redundante com a tabela + modal atuais, que já resolvem o objetivo de escanear rápido.
- **Filtros de categoria/centro de custo** no histórico — dependem de campos que ainda não existem no cadastro de item (ver seção de curto prazo).
