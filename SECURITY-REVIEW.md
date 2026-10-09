# Relatório de arquitetura e auditoria de segurança

## 1) Stack detectada

### Backend
- Linguagem: Python
- Framework: Django 6.0.7
- API: Django REST Framework 3.17.1
- Autenticação: JWT via djangorestframework-simplejwt
- Autorização: permissões DRF (`IsAuthenticated`, `IsAdminUser`, `AllowAny`) combinadas com validações de domínio no service layer
- Sessões: JWT stateless; refresh token renovado pelo endpoint `/login/refresh/`
- ORM: Django ORM
- Banco: PostgreSQL em produção (via `DATABASE_URL`), SQLite em desenvolvimento/testes
- Arquitetura: app-based monolith; apps por domínio (`auction`, `products`, `user`, `team`, `payment`, `campaigns`, `competitions`, `social`, `fifa_data`, `common`)
- Jobs/background tasks: Celery + django-celery-beat + Redis
- Webhooks: não identificados no código principal; o projeto usa Channels/Redis para eventos em tempo real
- Storage: media filesystem (`MEDIA_ROOT`) + PostgreSQL
- Cache: Redis
- Filas: Celery broker no Redis
- Logs: Django logging e registros de acesso a dados pessoais em `common.models` / `common.services`

### Frontend
- Framework: React 19 + Vite + TanStack Start
- Gerenciamento de estado: TanStack React Query
- Roteamento: TanStack Router
- Autenticação: tokens JWT lidos/guardados no cliente
- Permissões: `useAuth()` + `isStaff` e `isAuthenticated`
- Consumo de API: `fetch` + cliente em `frontend/src/lib/api.ts`
- Build: Vite 8, Tailwind CSS

### Infraestrutura
- Docker / docker-compose: sim
- Banco: PostgreSQL container
- Redis: container
- Nginx: proxy reverso
- Deploy: via `docker-compose.yml` + `install.sh`
- Variáveis de ambiente: `.env` na raiz, lidas por `django-environ`
- Health checks: `/api/v1/system/health/`

## 2) Mapa da arquitetura

```
Frontend (React + Vite)
   ↓
Nginx / Vite dev proxy
   ↓
Django REST API
   ├─ user: cadastro, auth, perfil, alteração de senha
   ├─ auction: leilões, lances, encerramento
   ├─ products: catálogo e imagens
   ├─ team: elenco, rosters, formações
   ├─ payment: saldo, transações, pagamentos
   ├─ campaigns: campanhas, mercado, transferências
   ├─ competitions: competições, matches, ranking
   ├─ social: comunidade / chat
   └─ fifa_data: base de jogadores, atributos, fotos
   ↓
PostgreSQL / SQLite
   ↓
Redis / Celery / Channels websocket
```

Fluxo principal de autenticação:
1. `POST /login/` emite `access` + `refresh` JWT.
2. Frontend salva os tokens em `localStorage` via `frontend/src/lib/api.ts`.
3. `AuthProvider` restaura o perfil em `/api/v1/users/me/`.
4. `Authorization: Bearer <token>` é enviado em cada requisição.

Fluxos de dados sensíveis:
- Cadastro de usuário: `user/views.py`
- Alteração de senha: `user/views.py`
- Pagamentos/auction: `payment/services.py`, `auction/services.py`
- Saldo e campanhas: `campaigns/services.py`
- Registro de acessos pessoais: `common/services.py`

## 3) Resumo da auditoria

### O que o projeto faz bem
- Usa Django ORM com transações atômicas em operações financeiras.
- Tem validadores de senha e check de maioridade para cadastro.
- Faz uso de `select_for_update()` em pontos sensíveis de saldo e leilões para reduzir race conditions.
- Configura cookies seguros e HSTS em produção (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, etc.).
- Define `X_FRAME_OPTIONS = "DENY"` e `SECURE_CONTENT_TYPE_NOSNIFF = True`.

### Achados relevantes
1. Tokens JWT persistidos em `localStorage` no navegador, em vez de cookies HttpOnly com SameSite e CSRF adequados.
2. `SECRET_KEY` possui fallback público e inseguro em produção (`django-insecure-dev-only-change-in-production`) caso a variável não esteja configurada.
3. O sistema registra o endereço IP em acessos a dados pessoais sem política explícita de retenção ou mascaramento.

## 4) Achados de segurança

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | frontend/src/lib/api.ts | 29-67 | Tokens de acesso/refresh persistidos em localStorage; um XSS permite roubo imediato da sessão. | 9/10 |
| 2 | 🟡 MEDIUM | backend/core/settings/base.py | 16-20 | `SECRET_KEY` tem fallback público (`django-insecure-dev-only-change-in-production`), permitindo que a aplicação inicie com segredo fraco em ambientes mal configurados. | 8/10 |
| 3 | 🟡 MEDIUM | backend/common/services.py | 1-10 | Registro de IP em logs de acesso a dados pessoais sem filtro/retention/redaction. | 7/10 |

## 5) Observações gerais sobre autorização

- Não há multi-tenancy real no código atual; o isolamento é por usuário, não por tenant/organização/scoped tenant.
- A camada de autorização principal está no backend com `IsAuthenticated`/`IsAdminUser`; o frontend só apresenta ou oculta elementos visuais.
- Não há evidência de “admin check no navegador” como única barreira de segurança.

## 6) Lista de issues prontas para GitHub

### Issue 1 — Migração de sessão JWT para cookies HttpOnly
**Título**: Migrate JWT storage from localStorage to secure HttpOnly cookies
**Resumo**: Tokens JWT são persistidos em `localStorage`, permitindo roubo por XSS. A correção deve mover a sessão para cookies HttpOnly + SameSite + CSRF-aware flow.

### Issue 2 — Remover fallback inseguro do SECRET_KEY
**Título**: Require explicit SECRET_KEY in production and remove insecure default
**Resumo**: `base.py` usa um valor padrão conhecido. Em produção, o sistema deve falhar ao iniciar quando `SECRET_KEY` não for configurada.

### Issue 3 — Redigir e minimizar registros de dados pessoais
**Título**: Anonymize and retain personal data access logs
**Resumo**: O projeto registra `REMOTE_ADDR` e eventos sensíveis em `PersonalDataAccessLog`. A revisão deve definir retenção, mascaramento e política de acessos.

### Issue 4 — Validar uploads de mídia por tamanho e conteúdo
**Título**: Add stricter media validation for product uploads
**Resumo**: `ImageField` não substitui uma política explicitada de validação de tamanho, tipo e otimização de arquivo; recomenda-se limitar formatos e dimensionar antes de persistir.

## 7) Conclusão

O projeto está bem estruturado e usa padrões modernos de Django + React, com transações e testes em áreas críticas como leilões e pagamentos. O principal risco identificado é a gestão de tokens no cliente, que pode ser resolvido com uma abordagem mais segura de sessão HTTP. A segunda prioridade é reforçar as variáveis de ambiente e reduzir a exposição de dados pessoais em logs.
