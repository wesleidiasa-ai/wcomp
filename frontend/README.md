# Painel de Pedidos de Compra (frontend)

SPA em React + Vite + TypeScript + Tailwind que consome a API em [`../backend`](../backend).

## Rodando localmente

Pré-requisitos: a API do backend rodando (ver `backend/README.md`).

```bash
cd frontend
npm install
cp .env.example .env   # ajuste VITE_API_URL se a API não estiver em localhost:3000
npm run dev
```

Abre em `http://localhost:5173`. Use os usuários criados pelo `npm run seed` do backend
(todos com senha `senha123`):

- `admin@fazendamodelo.com` — admin (Setores, Usuários, Regras de aprovação)
- `bruno@fazendamodelo.com` — aprovador
- `carla@fazendamodelo.com` — comprador (avança status pós-aprovação)
- `diego@fazendamodelo.com` — solicitante (Agrícola)

## Estrutura

- `src/lib/api.ts` — cliente fetch fino com injeção do token JWT e parsing de erro.
- `src/lib/auth.tsx` — `AuthProvider`/`useAuth`, persiste sessão em `localStorage`.
- `src/components/ProtectedRoute.tsx` — bloqueia rotas sem sessão ou sem o papel exigido.
- `src/pages/` — uma página por tela: login, registro de empresa, lista/detalhe/criação de
  pedidos, e os 3 CRUDs de admin (setores, usuários, regras de aprovação).

Não há gerenciador de estado além do `useState`/`useEffect` — o volume de dados e telas não
justifica uma lib de data-fetching ainda.
