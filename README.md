# FIFA Auction Hub

Monorepo Django + React (TanStack Start) para **leilão global** de jogadores FIFA — arremate, monte seu time e participe da comunidade.

## Produto

- **Leilão global** — lances em jogadores, pagamento com saldo interno
- **Meu time** — escalação dos jogadores arrematados
- **Comunidade** — amigos e chat direto
- **Admin** — criar e gerenciar leilões

(Campanhas, mercado P2P e competições foram removidos do produto.)

## Estrutura

```
/
├── backend/          # Django 6 + DRF + Channels + Celery
├── frontend/         # React 19 + Vite 8 + TanStack Start
├── nginx/            # proxy edge (Docker)
├── setups/           # deploy, backup, generate-env
├── install.sh        # entrypoint de ops
├── docker-compose.yml
├── .env              # config única (backend + frontend)
└── version.json
```

## Configuração

Um único `.env` na **raiz** do monorepo:

```sh
cp .env.example .env
```

- **Django** lê via `django-environ` (`backend/core/settings/base.py`)
- **Vite** lê da mesma raiz (`envDir` no `vite.config.ts`)

Em dev local, o Vite faz proxy de `/api`, `/ws`, `/login`, `/admin` e `/media` para `http://127.0.0.1:8000`. Não é necessário `frontend/.env`.

## Desenvolvimento local

### Backend

```sh
cd backend
python -m venv .venv   # ou use o .venv na raiz do monorepo
# Windows: .venv\Scripts\activate  (ou ..\.venv\Scripts\activate)
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API em `http://localhost:8000/api/v1/`.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

App em `http://localhost:5173` — chamadas à API passam pelo proxy do Vite para o backend na porta 8000.

### Otimizar imagens (WebP + remover duplicatas)

```sh
cd backend
python manage.py optimize_media --dry-run   # simular
python manage.py optimize_media               # converter PNG → WebP e apagar órfãos
```

## Deploy com Docker

Antes do **primeiro** deploy, exporte jogadores e fotos do ambiente local:

```sh
./install.sh export-seed
```

Isso gera `setups/seed/fifa_data.json.gz` e `setups/seed/media/` (não versionados no git).

Depois:

```sh
./install.sh generate-env   # cria .env na raiz
./install.sh deploy
```

No startup, o backend importa automaticamente:
- **10 usuários de teste** (`setups/test-users.txt`, senha `Test@1234`)
- **jogadores** e **fotos** de `setups/seed/` (somente se o banco estiver vazio)

Acesse `http://localhost:8080` (ou `NGINX_PORT` no `.env`).

Outros comandos:

```sh
./install.sh backup
./install.sh restore backups/db_YYYYMMDD_HHMMSS.sql.gz
```

## Settings Django

| Ambiente | Módulo |
|----------|--------|
| Local | `core.settings.development` |
| Produção / Docker | `core.settings.production` |
| Testes | `core.settings.test` |

## Fase 2 (opcional — mudanças de API)

- `BaseModel` com UUID público em todos os models
- Rotas por audiência (`auth/`, `public/`, `customer/`, …)
- JWT em cookies HttpOnly + CSRF
- Migrar ViewSets para views finas
