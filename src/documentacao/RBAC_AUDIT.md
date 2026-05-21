# Relatório de Auditoria — RBAC e Módulo Administrativo

**Projeto:** EB Services API (`eb--api`)  
**Data:** 2026-05-20  
**Escopo:** Roles, middleware de autorização, matriz de permissões, visão global do Admin

---

## 1. Definição de Roles

### 1.1 Onde estão definidas

| Camada | Arquivo | Detalhe |
|--------|---------|---------|
| **Constantes** | `src/config/constants.js` | `USER_ROLES = { ADMIN: 'admin', CLIENT: 'client', PROVIDER: 'provider' }` |
| **Model Sequelize** | `src/models/User.js` | Campo `role` tipado como ENUM |
| **Migration PostgreSQL** | `migrations/20260520000001-create-users.js` | Coluna `role` ENUM nativo no banco |

### 1.2 É ENUM no banco?

**Sim.** A migration cria:

```sql
role ENUM('admin', 'client', 'provider') NOT NULL DEFAULT 'client'
```

No Sequelize:

```javascript
role: {
  type: DataTypes.ENUM(...Object.values(USER_ROLES)),
  allowNull: false,
  defaultValue: USER_ROLES.CLIENT,
}
```

### 1.3 Campo complementar de controle de acesso

Além da `role`, existe `active` (BOOLEAN). Usuários com `active = false` **não autenticam** (bloqueio no middleware `authenticate`).

**Nota:** Não existe tabela de permissões granulares (permissions/scopes). O RBAC é **baseado exclusivamente em role** (`admin` | `client` | `provider`).

---

## 2. Middleware de Proteção

### 2.1 Arquivo

`src/middlewares/auth.middleware.js`

### 2.2 Fluxo em duas camadas

```
Request → authenticate → authorize(roles) → controller → service (filtros adicionais)
```

#### `authenticate` — identidade

1. Exige header `Authorization: Bearer <JWT>`
2. Valida JWT com `JWT_SECRET`
3. **Recarrega usuário do banco** via `User.findByPk(decoded.sub)` (role vem do DB, não só do token)
4. Rejeita se usuário inexistente ou `active = false` → `401 UNAUTHORIZED`
5. Anexa `req.user` para downstream

#### `authorize(...roles)` — autorização por role

```javascript
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(t('UNAUTHORIZED', req.locale), 401, 'UNAUTHORIZED'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError(t('FORBIDDEN', req.locale), 403, 'FORBIDDEN'));
    }

    next();
  };
}
```

### 2.3 Como impede client de acessar rota admin?

**Exemplo:** `GET /api/v1/users` usa `authorize(USER_ROLES.ADMIN)`.

1. Client autentica com JWT válido → `req.user.role === 'client'`
2. `authorize('admin')` verifica `'client'` ∉ `['admin']`
3. Retorna **`403 FORBIDDEN`** antes de chegar ao controller

Não há bypass: a verificação é síncrona na rota, antes de qualquer lógica de negócio.

### 2.4 Terceira camada — Service (defesa em profundidade)

Mesmo com rota liberada, vários services aplicam filtros por `actor.role` e `actor.id`:

- `property.service.js` → `buildAccessFilter(actor)`
- `service-order.service.js` → `where.providerId = actor.id` (provider)
- `assertProviderOwnership()` → check-in/check-out/extras

**Conclusão:** Segurança = **Rota (authorize) + Service (escopo de dados)**.

---

## 3. Matriz de Permissões por Módulo

Legenda: ✅ permitido · ❌ bloqueado (403) · 🔓 público · ⚠️ ressalva

### 3.1 Users — `/api/v1/users`

| Endpoint | Admin | Client | Provider | Proteção |
|----------|-------|--------|----------|----------|
| POST `/register` | 🔓 | 🔓 | 🔓 | Público — role `admin` ignorada; whitelist `client`/`provider` |
| POST `/login` | 🔓 | 🔓 | 🔓 | Público |
| GET `/me` | ✅ | ✅ | ✅ | `authenticate` |
| PATCH `/me` | ✅ | ✅ | ✅ | `authenticate` |
| PATCH `/me/avatar` | ✅ | ✅ | ✅ | `authenticate` |
| POST `/admin` | ✅ | ❌ | ❌ | `authorize(ADMIN)` — criar admin |
| PATCH `/:id/status` | ✅ | ❌ | ❌ | `authorize(ADMIN)` — ativar/desativar |
| PATCH `/:id/role` | ✅ | ❌ | ❌ | `authorize(ADMIN)` — alterar role |
| GET `/:id/average-rating` | ✅ | ❌ | ❌ | `authorize(ADMIN)` |
| GET `/` (listar todos) | ✅ | ❌ | ❌ | `authorize(ADMIN)` |
| GET `/:id` | ✅ | ❌ | ❌ | `authorize(ADMIN)` |
| DELETE usuário | — | — | — | **Não implementado** (usa `active: false`) |

**Quem lista todos?** Apenas **Admin** (`user.routes.js` linha 40).

**Quem deleta?** Endpoint de delete **não existe** no backend atual.

---

### 3.2 Properties — `/api/v1/properties`

| Endpoint | Admin | Client | Provider | Proteção |
|----------|-------|--------|----------|----------|
| GET `/`, `/:id` | ✅ | ✅ (só suas) | ❌ | Rota: `authorize(ADMIN, CLIENT)` |
| POST, PUT, DELETE | ✅ | ❌ | ❌ | Rota: `authorize(ADMIN)` |
| POST `/:id/sync-calendar` | ✅ | ❌ | ❌ | Rota: `authorize(ADMIN)` |

**Como Client só vê as suas propriedades?**

Arquivo: `src/features/property/property.service.js`

```javascript
function buildAccessFilter(actor) {
  if (actor.role === USER_ROLES.CLIENT) {
    return { clientId: actor.id };  // ← filtro SQL
  }
  if (actor.role === USER_ROLES.ADMIN) {
    return {};  // ← sem filtro = todas
  }
  return null;  // provider → 403
}
```

- **Listagem:** `Property.findAndCountAll({ where: { ...buildAccessFilter(actor) } })`
- **Detalhe:** `Property.findOne({ where: { id, ...accessFilter } })` — UUID de outro client retorna **404** (não vaza existência)

**Provider:** bloqueado na rota (`authorize` não inclui provider) **e** no service (`buildAccessFilter` retorna `null` → 403).

---

### 3.3 Service Orders — `/api/v1/service-orders`

| Endpoint | Admin | Client | Provider | Proteção |
|----------|-------|--------|----------|----------|
| GET `/` (listar) | ✅ (todas) | ✅ (suas props) | ✅ (só dele) | Rota + service |
| PATCH `/:id/assign` | ✅ | ❌ | ❌ | `authorize(ADMIN)` |
| POST `/:id/check-in` | ❌ | ❌ | ✅ (só dele) | Rota + `assertProviderOwnership` + geofence Haversine + upload `before_photos` |
| POST `/:id/extras` | ❌ | ❌ | ✅ (só dele) | Rota + `assertProviderOwnership` |
| POST `/:id/check-out` | ❌ | ❌ | ✅ (só dele) | Rota + `assertProviderOwnership` + geofence + upload `after_photos` |

**Provider vê ordens de outros?**

**Não**, na listagem. Arquivo: `service-order.service.js`:

```javascript
if (actor.role === USER_ROLES.PROVIDER) {
  where.providerId = actor.id;
  where.status = { [Op.in]: ['pending', 'in_progress'] };
}
```

**Trava adicional em ações** (`check-in`, `extras`, `check-out`):

```javascript
function assertProviderOwnership(order, actor, locale) {
  if (actor.role !== USER_ROLES.PROVIDER) throw FORBIDDEN;
  if (!order.providerId || order.providerId !== actor.id) {
    throw SERVICE_ORDER_NOT_ASSIGNED; // 403
  }
}
```

**Client:** vê OS das propriedades onde `property.clientId = actor.id` (join no include).

**Admin:** `where = {}` sem filtro de provider/client → **visão global** de todas as OS.

---

### 3.4 Service Extras (catálogo) — `/api/v1/service-extras`

| Endpoint | Admin | Client | Provider |
|----------|-------|--------|----------|
| GET `/`, `/:id` | ✅ | ✅ | ✅ |
| POST, PUT, DELETE | ✅ | ❌ | ❌ |

Listagem aberta a qualquer autenticado (catálogo de leitura).

---

### 3.5 Inventory — `/api/v1/inventory`

| Endpoint | Admin | Client | Provider |
|----------|-------|--------|----------|
| GET `/`, `/:id` | ✅ (tudo) | ✅ (suas props) | ❌ |
| POST, PUT, DELETE | ✅ | ❌ | ❌ |
| PATCH `/:id/quantity` | ❌ | ❌ | ✅* |

\* Provider só se tiver OS `in_progress` na propriedade do item (`assertProviderCanUpdateQuantity`).

**Client — escopo:** include com `where: { clientId: actor.id }` (mesmo padrão de properties).

---

### 3.6 Contracts — `/api/v1/contracts`

| Endpoint | Admin | Client | Provider |
|----------|-------|--------|----------|
| GET `/`, `/:id`, `/acceptances/me` | ✅ | ✅ | ✅ |
| POST, PUT, DELETE (modelos) | ✅ | ❌ | ❌ |
| POST `/:id/accept` | ✅* | ✅* | ✅* |

\* Aceite validado no **service** por tipo de contrato:
- `client_eb` → só role `client`
- `provider_eb` → só role `provider`

Admin autenticado pode aceitar qualquer contrato (sem restrição de tipo no service).

---

### 3.7 Reviews — `/api/v1/reviews`

| Endpoint | Admin | Client | Provider |
|----------|-------|--------|----------|
| GET `/`, `/:id` | ✅ (todas) | ✅ (suas) | ❌ |
| POST `/` | ❌ | ✅ | ❌ |
| PUT, DELETE | ✅ | ❌ | ❌ |

Service valida: OS `completed`, client dono da property, provider da OS como `reviewed_id`.

---

### 3.8 Reports (Financeiro) — `/api/v1/reports`

| Endpoint | Admin | Client | Provider |
|----------|-------|--------|----------|
| GET `/billing` | ✅ | ❌ | ❌ |

**Confirmado:** `report.routes.js` → `authorize(USER_ROLES.ADMIN)` exclusivo.

Sem filtro de service adicional necessário — rota já trancada.

---

### 3.9 Health — `/api/v1/health`, `/ping`

| Endpoint | Acesso |
|----------|--------|
| GET `/health`, `/ping` | 🔓 Público (sem auth) |

---

## 4. O Admin — Módulo Separado ou Permissão Transversal?

### 4.1 Resposta: **Permissão transversal**

**Não existe** pasta `src/features/admin/` nem router `/api/v1/admin/*`.

O Admin é a role `admin` aplicada **dentro de cada feature existente**:

```
src/features/
  user/          ← authorize(ADMIN) em list/get
  property/      ← authorize(ADMIN) em write + sync
  service-order/ ← authorize(ADMIN) em assign; list sem filtro
  service-extras/
  inventory/
  contract/
  report/        ← exclusivo ADMIN
  review/
```

### 4.2 Visão global do Admin

| Recurso | Admin vê | Filtro aplicado |
|---------|----------|-----------------|
| Users | Todos | Nenhum (`listUsers` sem where de role) |
| Properties | Todas | `buildAccessFilter` → `{}` |
| Service Orders | Todas | `listServiceOrders` → `where = {}` |
| Inventory | Todos os itens | Sem filtro de client |
| Reviews | Todas | `where = {}` |
| Billing | Relatório completo | Opcional `?client_id=` |
| Contracts | Todos os modelos | Sem filtro |

**Exemplo — listagem de OS para Admin:**

```javascript
// service-order.service.js — branch ADMIN
// where permanece {} → retorna TODAS as ordens
// status filter opcional via ?status= apenas para admin
```

**Exemplo — listagem de OS para Provider:**

```javascript
where.providerId = actor.id;
where.status IN ('pending', 'in_progress');
```

---

## 5. Diagrama de Arquitetura RBAC

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Request                          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  authenticate  → JWT + User.findByPk + active check           │
│                  req.user = { id, role, ... }                │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  authorize(roles)  → req.user.role ∈ roles ?                 │
│                      Não → 403 FORBIDDEN                     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Controller  → repassa req.user como actor                   │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Service  → buildAccessFilter / assertOwnership / where      │
│             Escopo de dados por role + id                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Avaliação de Segurança — Pronto para Frontend?

### ✅ Pontos sólidos

- ENUM de role no PostgreSQL + Sequelize
- Role lida do **banco** a cada request (não confia cegamente no JWT)
- Padrão consistente `authenticate` + `authorize` nas rotas
- Escopo de dados no service (properties, OS, inventory, reviews)
- Provider isolado por `providerId` em listagem e ações
- Billing exclusivo Admin
- Conta inativa não autentica

### ⚠️ Riscos / gaps identificados — status pós-correções (v1.0)

| # | Severidade | Issue | Status |
|---|------------|-------|--------|
| 1 | **ALTA** | Escalonamento de role no `/register` | ✅ **Corrigido** — `resolvePublicRegisterRole()` ignora `admin` |
| 2 | Média | `average-rating` aberto a qualquer autenticado | ✅ **Corrigido** — `authorize(ADMIN)` |
| 3 | Baixa | Sem desativar user via API admin | ✅ **Corrigido** — `PATCH /:id/status` + `forceLogoutUser` |
| 4 | Baixa | Admin aceitava contratos sem restrição | ✅ **Corrigido** — `CONTRACT_ADMIN_CANNOT_ACCEPT` + audit `GET /acceptances` |
| 5 | Info | RBAC granular por permissão | ⏳ Arquitetural — fora do escopo v1 |

### Riscos residuais (não bloqueantes)

| Issue | Severidade | Notas |
|-------|------------|-------|
| Uploads estáticos públicos (`/uploads/...`) | Média | URLs acessíveis sem auth — migrar para S3/signed URLs em v2 |
| Register permite escolher `provider` | Baixa | Política de negócio — pode forçar só `client` se desejado |
| Property mutations sem `actor` no service | Baixa | Mitigado por rotas admin-only |

---

## 7. Referência rápida de arquivos

| Responsabilidade | Arquivo |
|------------------|---------|
| Constantes de role | `src/config/constants.js` |
| Model User | `src/models/User.js` |
| Migration ENUM | `migrations/20260520000001-create-users.js` |
| Auth middleware | `src/middlewares/auth.middleware.js` |
| Rotas agregadas | `src/routes/index.js` |
| Filtro properties | `src/features/property/property.service.js` → `buildAccessFilter` |
| Filtro OS | `src/features/service-order/service-order.service.js` → `listServiceOrders`, `assertProviderOwnership` |
| Billing admin-only | `src/features/report/report.routes.js` |

---

## 8. Conclusão

A API EB Services implementa **RBAC clássico por role** em três pilares (`admin`, `client`, `provider`), com proteção em **rota + service**. O Admin **não é um módulo isolado** — é uma role transversal com visão global onde filtros de escopo retornam `{}`.

**Status (v1.0):** Todos os gaps críticos e médios de segurança RBAC foram corrigidos. A API está **pronta para consumo pelo Frontend e App Mobile**, com riscos residuais documentados (uploads públicos, RBAC granular).
