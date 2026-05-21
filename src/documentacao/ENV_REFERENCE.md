# Referência de Variáveis de Ambiente

Todas as variáveis usadas pela API. Copie `.env.example` para `.env` e ajuste conforme o ambiente.

## Servidor

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `NODE_ENV` | Não | `development` | Ambiente: `development`, `test`, `production` |
| `PORT` | Não | `3000` | Porta HTTP do servidor |
| `APP_API_PREFIX` | Não | `/api` | Prefixo base das rotas (ex.: `/api/v1/...`) |

## Banco de Dados (PostgreSQL)

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `DB_HOST` | Não | `localhost` | Host do PostgreSQL |
| `DB_PORT` | Não | `5432` | Porta do PostgreSQL |
| `DB_NAME` | Não | `eb_services` | Nome do banco |
| `DB_USER` | Não | `postgres` | Usuário do banco |
| `DB_PASSWORD` | Não | `postgres` | Senha do banco |
| `DB_SSL` | Não | `false` | `true` para conexão SSL (produção/cloud) |

## Autenticação

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `JWT_SECRET` | **Sim** (prod) | — | Chave secreta para assinar tokens JWT |
| `JWT_EXPIRES_IN` | Não | `7d` | Expiração do token (formato jsonwebtoken) |

## Internacionalização

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `DEFAULT_LOCALE` | Não | `pt` | Locale padrão (`pt` ou `en`) |

## Segurança

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `CORS_ORIGINS` | Não | `http://localhost:5173,...` | Origens permitidas, separadas por vírgula. Use `*` para permitir todas (apenas dev) |
| `RATE_LIMIT_WINDOW_MS` | Não | `900000` | Janela do rate limit em ms (15 min) |
| `RATE_LIMIT_MAX` | Não | `100` | Máximo de requests por janela por IP |

## Sincronização iCal

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `ICAL_SYNC_ENABLED` | Não | `true` | `false` desativa o cron de sync automático |
| `ICAL_SYNC_CRON` | Não | `0 * * * *` | Expressão cron (padrão: a cada hora) |
| `ICAL_FETCH_TIMEOUT_MS` | Não | `15000` | Timeout em ms ao baixar feed iCal |

## E-mail

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `MAIL_ENABLED` | Não | `true` | `false` desativa envio |
| `MAIL_DRIVER` | Não | `console` | `console` simula no stdout; futuro: `smtp`, `sendgrid` |
| `MAIL_FROM` | Não | `noreply@ebservices.local` | Remetente |

## WebSocket (Socket.io)

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `SOCKET_PATH` | Não | `/socket.io` | Path do Socket.io |

## Exemplo `.env` (desenvolvimento)

```env
NODE_ENV=development
PORT=3000
APP_API_PREFIX=/api

DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_services
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

JWT_SECRET=dev-secret-use-long-random-string-in-production
JWT_EXPIRES_IN=7d

DEFAULT_LOCALE=pt
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

ICAL_SYNC_ENABLED=true
ICAL_SYNC_CRON=0 * * * *
ICAL_FETCH_TIMEOUT_MS=15000

MAIL_ENABLED=true
MAIL_DRIVER=console
MAIL_FROM=noreply@ebservices.local

SOCKET_PATH=/socket.io
```

> **Nunca** commite `.env` com segredos reais. Use `.env.example` apenas com placeholders.
