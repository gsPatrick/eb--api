# Backend Handover Report — EB Services API

**Documento:** Entrega Técnica e Prontidão (Handover)  
**Projeto:** EB Services and Solutions — Backend API  
**Versão:** 1.0.0  
**Data:** 20/05/2026  
**Público-alvo:** Deploy (Hostinger/VPS), Frontend Web, App Mobile (Prestador)  
**Base URL (produção):** `https://api.ebservices.com/api/v1` *(ajustar conforme domínio)*  
**WebSocket:** `wss://api.ebservices.com` — path `/socket.io`

---

## Sumário

1. [Status Final dos Requisitos Críticos](#1-status-final-dos-requisitos-críticos-pós-ajustes)
2. [Mapa de Endpoints por Perfil](#2-mapa-de-endpoints-por-perfil-resumo-de-integração)
3. [Especificações de Tempo Real (Socket.io)](#3-especificações-de-tempo-real-socketio)
4. [Guia de Deploy (Hostinger/VPS)](#4-guia-de-deploy-hostingervps)
5. [Garantia de Isolamento (Multi-tenant)](#5-garantia-de-isolamento-multi-tenant)
6. [Veredito de Conclusão](#6-veredito-de-conclusão)

**Documentos relacionados:**

| Arquivo | Conteúdo |
|---------|----------|
| `RELATORIO_FINAL_CONFORMIDADE_BACKEND.md` | Conformidade 9/9 requisitos |
| `RBAC_AUDIT.md` | Auditoria de permissões |
| `ONBOARDING.md` | Setup local + Nginx/PM2 detalhado |
| `DATA_ARCHITECTURE.md` | Schema do banco |
| `features/*.md` | Docs por domínio |

---

## 1. Status Final dos Requisitos Críticos (Pós-Ajustes)

### 1.1 Geofence (GPS no local)

**Status:** ✅ Implementado e em produção no código v1.0.

#### Campos adicionados em Property

Migration: `migrations/20260520000011-add-latitude-longitude-to-properties.js`

| Campo DB | Campo API | Tipo | Obrigatório |
|----------|-----------|------|-------------|
| `latitude` | `latitude` | DECIMAL(10,7) | Não no cadastro, **sim para geofence funcionar** |
| `longitude` | `longitude` | DECIMAL(10,7) | Não no cadastro, **sim para geofence funcionar** |

O **admin** define coordenadas ao criar/editar imóvel:

```http
PUT /api/v1/properties/:id
Authorization: Bearer <admin-token>

{
  "latitude": -23.5505199,
  "longitude": -46.6333094
}
```

Regra: se informar um, deve informar o outro (validação pareada).

#### Como a API valida proximidade

Arquivo: `src/features/service-order/service-order.service.js`

1. Prestador envia `lat` e `long` no check-in ou check-out.
2. API valida formato (-90..90 / -180..180).
3. Função `checkProximity(propertyCoords, userCoords, maxDistanceMeters, locale)` calcula distância via **Haversine**.
4. Compara com `GEOFENCE_MAX_DISTANCE_METERS` (default **200 m**).
5. Se distância > raio → `400 OUT_OF_PROXIMITY`.
6. Se imóvel sem coordenadas → `400 PROPERTY_GEO_NOT_CONFIGURED`.

```javascript
// Config: src/config/index.js
geofence: {
  maxDistanceMeters: Number(process.env.GEOFENCE_MAX_DISTANCE_METERS) || 200,
}
```

**Regra de negócio final:** prestador **só consegue** iniciar ou encerrar OS se estiver a ≤ 200 m do imóvel (ou valor configurado no `.env`).

---

### 1.2 Fluxo de Fotos (Prova Visual)

**Status:** ✅ Implementado.

| Operação | Rota | Campo DB | Obrigatório | Upload |
|----------|------|----------|-------------|--------|
| **Check-in** | `POST /service-orders/:id/check-in` | `before_photos` | **Sim** — mín. 1 foto | `multipart/form-data` — campo `photos[]` |
| **Check-out** | `POST /service-orders/:id/check-out` | `after_photos` | **Sim** — mín. 1 foto | `multipart/form-data` — campo `photos[]` |

**Formato alternativo:** JSON array via body (`before_photos` / `after_photos`) — URLs já existentes. Upload + JSON podem ser combinados.

**Armazenamento:** disco local `public/uploads/os/{uuid}.jpg` → URL pública `/uploads/os/{uuid}.jpg`.

**Limites:** até 20 imagens, 10 MB cada, MIME `image/*`.

**Erros:**

| Code | Quando |
|------|--------|
| `SERVICE_ORDER_BEFORE_PHOTOS_REQUIRED` | Check-in sem fotos |
| `SERVICE_ORDER_PHOTOS_REQUIRED` | Check-out sem fotos |
| `UPLOAD_FILE_TOO_LARGE` | Arquivo > 10 MB |
| `UPLOAD_INVALID_FILE_TYPE` | Não é imagem |

---

### 1.3 Segurança — Register blindado

**Status:** ✅ Implementado.

Arquivo: `src/features/user/user.service.js` → `resolvePublicRegisterRole()`

| Cenário | Comportamento |
|---------|---------------|
| `POST /register` sem `role` | Cria user com `role: client` |
| `role: "client"` ou `"provider"` | Aceito |
| `role: "admin"` no body | **Ignorado** → vira `client` |
| Novo usuário | `active: false` — não loga até admin ativar |
| Criar admin | **Somente** `POST /api/v1/users/admin` com token admin |

**Regra de negócio final:** não existe caminho público para escalonamento de privilégio admin.

---

## 2. Mapa de Endpoints por Perfil (Resumo de Integração)

**Autenticação:** `Authorization: Bearer <JWT>` em todas as rotas protegidas.  
**Prefixo:** `/api/v1`

Legenda: 🔓 = público

---

### 2.1 Admin — Gestão, faturamento e auditoria

| Método | Rota | Descrição |
|--------|------|-----------|
| 🔓 POST | `/users/login` | Login |
| GET | `/users/me` | Perfil |
| GET | `/users` | Listar usuários (`?role=&active=&page=&limit=`) |
| GET | `/users/:id` | Detalhe de usuário |
| POST | `/users/admin` | Criar novo admin |
| PATCH | `/users/:id/status` | Ativar/desativar (`{ "active": false }`) |
| PATCH | `/users/:id/role` | Alterar role |
| GET | `/users/:id/average-rating` | Média de avaliações do prestador |
| GET | `/properties` | Todas as propriedades |
| GET | `/properties/:id` | Detalhe |
| POST | `/properties` | Criar imóvel (+ lat/long para geofence) |
| PUT | `/properties/:id` | Editar imóvel |
| DELETE | `/properties/:id` | Remover imóvel |
| POST | `/properties/:id/sync-calendar` | Sync iCal Airbnb |
| GET | `/service-orders` | Todas as OS (`?status=`) |
| PATCH | `/service-orders/:id/assign` | Atribuir prestador |
| POST/PUT/DELETE | `/service-extras` | CRUD catálogo de extras |
| GET | `/service-extras` | Listar extras |
| POST/PUT/DELETE | `/inventory` | CRUD estoque |
| GET | `/inventory` | Listar estoque (todos) |
| POST/PUT/DELETE | `/contracts` | CRUD modelos de contrato |
| GET | `/contracts/acceptances` | **Auditoria** — todos os aceites |
| GET | `/reports/billing` | Faturamento (`?start_date=&end_date=&client_id=`) |
| GET | `/reviews` | Todas as avaliações |
| PUT/DELETE | `/reviews/:id` | Editar/remover review |

---

### 2.2 Client — Visualização, inventário e contratos

| Método | Rota | Descrição |
|--------|------|-----------|
| 🔓 POST | `/users/register` | Cadastro (`role: client` default) |
| 🔓 POST | `/users/login` | Login |
| GET | `/users/me` | Perfil |
| PATCH | `/users/me` | Atualizar nome, telefone, locale |
| PATCH | `/users/me/avatar` | Upload avatar |
| GET | `/properties` | **Só seus imóveis** |
| GET | `/properties/:id` | Detalhe (só se for seu) |
| GET | `/service-orders` | OS dos seus imóveis |
| GET | `/service-extras` | Catálogo de extras (leitura) |
| GET | `/inventory` | Estoque dos seus imóveis |
| GET | `/inventory/:id` | Detalhe item |
| GET | `/contracts` | Listar contratos |
| GET | `/contracts/:id` | Detalhe contrato |
| GET | `/contracts/acceptances/me` | Meus aceites |
| POST | `/contracts/:id/accept` | Aceitar contrato `client_eb` |
| GET | `/reviews` | **Só reviews que você escreveu** |
| GET | `/reviews/:id` | Detalhe (só suas) |
| POST | `/reviews` | Avaliar OS concluída do seu imóvel |

**Socket.io (ouvir):** `ORDER_COMPLETED`, `INVENTORY_CRITICAL` (do seu imóvel).

---

### 2.3 Provider — Execução de OS, fotos e estoque

| Método | Rota | Descrição |
|--------|------|-----------|
| 🔓 POST | `/users/register` | Cadastro (`role: provider` permitido) |
| 🔓 POST | `/users/login` | Login |
| GET | `/users/me` | Perfil |
| PATCH | `/users/me` | Atualizar perfil |
| PATCH | `/users/me/avatar` | Upload avatar |
| GET | `/service-orders` | **Só OS atribuídas a você** (pending/in_progress) |
| POST | `/service-orders/:id/check-in` | Check-in + GPS + **fotos antes** |
| POST | `/service-orders/:id/extras` | Adicionar extra (`{ "extraId": "uuid" }`) |
| POST | `/service-orders/:id/check-out` | Check-out + GPS + **fotos depois** |
| GET | `/service-extras` | Catálogo (leitura) |
| PATCH | `/inventory/:id/quantity` | Atualizar qty (OS in_progress no imóvel) |
| GET | `/contracts` | Listar contratos |
| POST | `/contracts/:id/accept` | Aceitar contrato `provider_eb` |

**Check-in (multipart exemplo):**

```http
POST /api/v1/service-orders/{id}/check-in
Authorization: Bearer <provider-token>
Content-Type: multipart/form-data

lat=-23.5505199
long=-46.6333094
photos=@foto1.jpg
photos=@foto2.jpg
```

**Check-out:** mesmo formato, campo `photos` → salva em `after_photos`.

---

### 2.4 Rotas públicas / health

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/ping` | Ping rápido |
| GET | `/health` | Health check completo |
| POST | `/users/register` | Cadastro |
| POST | `/users/login` | Login |

---

## 3. Especificações de Tempo Real (Socket.io)

### 3.1 Conexão

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.ebservices.com', {
  auth: { token: jwtToken },
  // ou: extraHeaders: { Authorization: `Bearer ${jwtToken}` }
});

socket.on('connected', (data) => {
  // { userId, role }
});

socket.on('notification', (payload) => {
  // Atualizar UI sem refresh
});

socket.on('force_logout', (payload) => {
  // { reason, message } — limpar token e redirecionar login
});
```

**Requisitos:** JWT válido + user `active: true`. Path fixo: `/socket.io`.

### 3.2 Eventos que o Frontend deve ouvir

Todos chegam no canal `notification`, exceto `force_logout`.

| `type` | Quem recebe | Quando | Ação sugerida na UI |
|--------|-------------|--------|---------------------|
| `ORDER_CHECKIN` | **Admin** | Prestador fez check-in | Atualizar dashboard OS / badge "em andamento" |
| `ORDER_COMPLETED` | **Client** (dono do imóvel) | Check-out concluído | Notificar limpeza finalizada; liberar tela de review |
| `INVENTORY_CRITICAL` | **Admin** + **Client** (dono) | Estoque ≤ nível crítico | Alerta vermelho no inventário |
| `force_logout` | **User desativado** | Admin desativou conta | Logout imediato + mensagem |

### 3.3 Payload padrão (`notification`)

```json
{
  "type": "ORDER_CHECKIN",
  "title": "Check-in realizado",
  "message": "João iniciou limpeza em Apartamento Copacabana.",
  "data": {
    "serviceOrderId": "uuid",
    "propertyId": "uuid",
    "providerId": "uuid"
  },
  "timestamp": "2026-05-20T14:30:00.000Z"
}
```

**`INVENTORY_CRITICAL` — data extra:**

```json
{
  "inventoryItemId": "uuid",
  "propertyId": "uuid",
  "currentQuantity": 2,
  "criticalLevel": 5
}
```

**`ORDER_COMPLETED` — data extra:**

```json
{
  "serviceOrderId": "uuid",
  "propertyId": "uuid",
  "finishedAt": "2026-05-20T16:00:00.000Z"
}
```

---

## 4. Guia de Deploy (Hostinger/VPS)

Referência completa: `src/documentacao/ONBOARDING.md`.

### 4.1 Pré-requisitos no servidor

- Ubuntu/Debian (ou similar)
- **Node.js ≥ 18**
- **PostgreSQL ≥ 14**
- **Nginx** (reverse proxy + HTTPS + WebSocket)
- **PM2** (process manager)

### 4.2 Variáveis de ambiente essenciais (`.env`)

Copiar `.env.example` → `.env` e ajustar **todos** os valores marcados:

```env
# ── Servidor ──
NODE_ENV=production
PORT=3000
APP_API_PREFIX=/api

# ── PostgreSQL ──
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eb_services
DB_USER=eb_api
DB_PASSWORD=<senha-forte>
DB_SSL=false

# ── Auth (OBRIGATÓRIO trocar) ──
JWT_SECRET=<string-aleatoria-64+-caracteres>
JWT_EXPIRES_IN=7d

# ── i18n ──
DEFAULT_LOCALE=pt

# ── Rate limit ──
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ── CORS (domínios reais do painel e app) ──
CORS_ORIGINS=https://app.ebservices.com,https://admin.ebservices.com

# ── iCal (Airbnb) ──
ICAL_SYNC_ENABLED=true
ICAL_SYNC_CRON=0 * * * *
ICAL_FETCH_TIMEOUT_MS=15000

# ── E-mail ──
MAIL_ENABLED=true
MAIL_DRIVER=smtp
MAIL_FROM=noreply@ebservices.com

# ── WebSocket ──
SOCKET_PATH=/socket.io

# ── Geofence ──
GEOFENCE_MAX_DISTANCE_METERS=200
```

### 4.3 Migrations e Seeds (produção)

```bash
cd /var/www/eb-api/eb--api

# Instalar dependências (sem dev)
npm ci --omit=dev

# Criar/atualizar schema (11 migrations)
npm run migrate

# Primeira vez apenas — admin inicial
npm run seed
```

**Admin seed padrão:**

| Campo | Valor |
|-------|-------|
| E-mail | `admin@ebservices.local` |
| Senha | `Admin@EB2026` |

⚠️ **Trocar senha imediatamente após primeiro login em produção.**

**Ordem de migrations relevantes (últimas):**

| Migration | Conteúdo |
|-----------|----------|
| `20260520000010` | `default_cleaning_price` em properties |
| `20260520000011` | `latitude` / `longitude` em properties *(geofence)* |

### 4.4 PM2

```bash
npm install -g pm2
pm2 start app.js --name eb-api
pm2 save
pm2 startup
pm2 logs eb-api
```

### 4.5 Nginx — HTTP + WebSocket

```nginx
server {
    listen 443 ssl;
    server_name api.ebservices.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

HTTPS via Certbot: `sudo certbot --nginx -d api.ebservices.com`

### 4.6 Permissões de pastas (uploads)

```bash
mkdir -p public/uploads/os public/uploads/avatars logs
chown -R <user-app>:<group-app> public/uploads logs
chmod -R 755 public/uploads
```

| Pasta | Uso |
|-------|-----|
| `public/uploads/os/` | Fotos check-in/check-out |
| `public/uploads/avatars/` | Avatars |
| `logs/` | `error.log` (falhas sync iCal) |

Sem permissão de escrita → uploads falham com `UPLOAD_FAILED`.

### 4.7 Checklist pós-deploy

- [ ] `GET /api/v1/health` → 200
- [ ] Login admin funciona
- [ ] Socket.io conecta com JWT
- [ ] Upload avatar + fotos OS
- [ ] Imóvel cadastrado **com latitude/longitude**
- [ ] Check-in prestador dentro de 200 m funciona
- [ ] Cron iCal nos logs PM2
- [ ] CORS apontando para domínios reais
- [ ] `JWT_SECRET` único e forte

---

## 5. Garantia de Isolamento (Multi-tenant)

A EB Services opera com **3 roles** (`admin`, `client`, `provider`). O isolamento entre clientes usa **duas camadas**:

### Camada 1 — Rota (`authorize`)

Cada endpoint declara quais roles podem acessar. Ex.: client **não** acessa `/reports/billing`; provider **não** acessa `GET /properties`.

### Camada 2 — Service (escopo de dados)

Mesmo autenticado, o service filtra registros pelo `actor.id`:

| Recurso | Mecanismo | Efeito |
|---------|-----------|--------|
| **Properties** | `buildAccessFilter` → `{ clientId: actor.id }` | Client A só vê imóveis onde `client_id = seu id` |
| **Service Orders** | Join `property.clientId = actor.id` na listagem | Client A só vê OS dos seus imóveis |
| **Inventory** | `assertItemReadable` + filtro por `property.clientId` | Client A só vê estoque dos seus imóveis |
| **Reviews** | `where.reviewerId = actor.id` | Client A só vê avaliações que ele escreveu |
| **Provider OS** | `where.providerId = actor.id` + `assertProviderOwnership` | Prestador X não opera OS do prestador Y |

**Fotos:** URLs de upload (`/uploads/os/...`) são paths opacos (UUID). Clientes **não listam OS de terceiros** via API — não obtêm URLs de fotos alheias por endpoints autenticados. Admin vê tudo (por design operacional).

**Contratos e billing:** rotas admin-only ou filtradas por usuário logado.

**Resultado:** Cliente A **nunca** acessa via API autenticada propriedades, estoque, ordens ou reviews do Cliente B. Tentativa de acessar UUID de outro tenant retorna **404** (properties) ou lista vazia — sem vazamento de existência.

---

## 6. Veredito de Conclusão

### Declaração de entrega

A **API EB Services v1.0** está **estável, segura e pronta** para suportar:

- **Painel Web Admin** — gestão de equipe, imóveis, faturamento, auditoria de contratos e monitoramento em tempo real.
- **Portal/App Cliente** — visualização de imóveis, inventário, aceite de contratos, reviews e notificações de OS concluída.
- **App Mobile Prestador** — execução de ordens de serviço com geofence GPS, prova visual (fotos antes/depois), extras e atualização de estoque.

### Conformidade final

| Área | Status |
|------|--------|
| 9 requisitos funcionais contratuais | ✅ 9/9 |
| Geofence 200 m (Haversine) | ✅ |
| Fotos antes (check-in) + depois (check-out) | ✅ |
| Register blindado contra admin | ✅ |
| RBAC rota + service | ✅ |
| Isolamento multi-tenant | ✅ |
| Socket.io tempo real | ✅ |
| Documentação técnica | ✅ |

### Pendências exclusivas de operação (não bloqueiam integração)

- Configurar SMTP real em produção
- Backup automatizado PostgreSQL
- Migrar uploads para S3 (opcional v2)
- Trocar credenciais seed admin após deploy

---

**Fase Backend encerrada.**  
Próximo passo: deploy staging na Hostinger → smoke test → integração Frontend/Mobile.

---

*Gerado em 20/05/2026 — EB Services and Solutions — Backend API v1.0.0*
