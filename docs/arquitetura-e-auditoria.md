# Arquitetura e auditoria do projeto

## Visão geral
Este repositório é um monorepo composto por duas camadas:
- `backend/`: aplicação Django + DRF + Channels + Celery
- `frontend/`: aplicação React + TanStack Router + TanStack Query

A lógica de negócio principal é um sistema de leilões de jogadores e campanhas de mercado, com saldo interno, gestão de times e competições.

## Stack

### Backend
- Python 3.x
- Django 6.0.7
- DRF 3.17.1
- SimpleJWT
- PostgreSQL em produção, SQLite em desenvolvimento/testes
- Celery + Redis + Channels

### Frontend
- React 19
- Vite
- TanStack Start + Router + Query
- Tailwind
- Fetch nativo em `frontend/src/lib/api.ts`

## Apps do backend
- `auction`: leilões, lances, fechamento e mensagens em tempo real
- `products`: catálogo de produtos/jogadores e imagens
- `user`: autenticação, perfil, cadastro, senha
- `team`: times, elencos, formações, listagens de porta
- `payment`: transações e saldo
- `campaigns`: campanhas de mercado e transferências
- `competitions`: competições, partidas e notificação de status
- `social`: comunidade / chat
- `fifa_data`: dados de jogadores e atributos
- `common`: utilitários, validações e logs

## Fluxo principal
1. Usuário realiza cadastro em `user/views.py` e `UserSerializer`.
2. Login em `/login/` gera access + refresh JWT.
3. Frontend usa `AuthProvider` para restaurar sessão na inicialização.
4. `AuctionViewSet` e `CampaignListView` expõem listagens públicas.
5. `AuctionBidsView` aceita POST autenticado para registrar lances.
6. `payment.services.pay_for_auction()` processa a quitação de leilão.
7. `team` e `campaigns` realizam transferências e ajustes de saldo.

## Modelo de dados principal
- `User`: custom user com `email`, `cpf`, `balance`, `lance_credits`, `birth_date` e dados pessoais.
- `Auction`: leilão, product, vendedor, time_starting, time_ending, status, winner.
- `Bid`: lances por usuário e leilão.
- `Campaign`: campanha, orçamento inicial, regras de transferências, tamanho do elenco.
- `MarketWindow`: espelho de janela de mercado.
- `MarketListing`: listagem ativa de venda direta ou leilão.
- `Transaction`: histórico financeiro do usuário.
- `Team` / `RosterEntry`: time e jogadores do usuário.

## Segurança em foco
### 1. Tokens em localStorage
O cliente persiste tokens em `localStorage` (`frontend/src/lib/api.ts`). Isso aumenta a superfície de roubo em caso de XSS. O fluxo recomendado é armazenar apenas em cookies HttpOnly com SameSite e CSRF-aware.

### 2. Fallback inseguro de secret key
`backend/core/settings/base.py` usa fallback público quando `SECRET_KEY` não existe. Isso é aceitável apenas em desenvolvimento; em produção, deve falhar ao iniciar.

### 3. Logging de dados pessoais
`common/services.py` grava `REMOTE_ADDR` junto a acessos pessoais. Isso pode violar políticas de retenção e minimização de dados se não houver regras definidas.

## Observações finais
O código é funcional e bem organizado, com domínio granular e transações em áreas críticas. A principal correção de segurança é a autenticação no navegador; o restante do código está em um bom nível de engenharia para uma aplicação monolítica Django + React.
