# Status — Correções RBAC e Admin (Thalita)

Documento gerado após a implementação das correções solicitadas com base no `RBAC_AUDIT.md`.

**Data:** 2026-05-20  
**Escopo:** segurança de registro, gestão admin de usuários, contratos, média de prestadores.

---

## Resumo executivo

| Área | Status | Observação |
|------|--------|------------|
| 1. Escalonamento de role no register | ✅ Feito | Admin bloqueado no body; rota protegida para criar admin |
| 2. Desativar usuário (`PATCH .../status`) | ✅ Feito | Com logout forçado via socket |
| 3. Alterar role (`PATCH .../role`) | ✅ Feito | Protege último admin ativo |
| 4. Contratos — validação por role | ✅ Feito | Client/provider restritos; admin não aceita |
| 5. Contratos — auditoria admin | ✅ Feito | `GET /contracts/acceptances` |
| 6. Average rating — admin only | ✅ Feito | `authorize(ADMIN)` na rota |
| 7. Documentação | ⚠️ Pendente | `RBAC_AUDIT.md`, `User.md`, `contract.md` desatualizados |
| 8. Testes automatizados | ⚠️ Pendente | Nenhum teste E2E/unitário adicionado |

---

## 1. Segurança crítica — escalonamento de role

### O que foi feito

**Arquivo:** `src/features/user/user.service.js`

- `registerUser()` usa `resolvePublicRegisterRole()`:
  - Aceita no body apenas `client` ou `provider`
  - Qualquer outro valor (incluindo `admin`) → **ignorado**, default `client`
- `createAdminUser()` cria usuário com `role: admin` e `active: true`

**Rota nova:**

```http
POST /api/v1/users/admin
Authorization: Bearer <token-admin>
Content-Type: application/json

{
  "name": "Nome",
  "email": "admin@eb.com",
  "password": "SenhaSegura123",
  "phone": "+5511999999999",
  "locale": "pt"
}
```

- Middleware: `authenticate` + `authorize(USER_ROLES.ADMIN)`
- Arquivo de rotas: `src/features/user/user.routes.js` (linha 34)

### Decisão em aberto (baixa prioridade)

O pedido original dizia *"ignorar qualquer campo role"*. A implementação atual **ainda permite** escolher `provider` no register público (útil para cadastro de prestadores). Se quiser **sempre** `client` no register, basta trocar `resolvePublicRegisterRole` para retornar fixo `USER_ROLES.CLIENT`.

---

## 2. Funcionalidades administrativas de usuários

### Desativar / reativar usuário

```http
PATCH /api/v1/users/:id/status
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "active": false }
```

**Regras implementadas:**

| Regra | Implementação |
|-------|---------------|
| Só admin | `authorize(ADMIN)` na rota |
| Não desativar a si mesmo | `USER_CANNOT_DEACTIVATE_SELF` |
| Não desativar último admin | `USER_LAST_ADMIN` |
| Logout imediato | `notificationProvider.forceLogoutUser(userId)` |
| Próximas requests HTTP | `authenticate` recarrega user do banco e bloqueia se `active = false` |

**Arquivos:** `user.service.js` → `updateUserStatus`, `notification.provider.js` → `forceLogoutUser`

### Alterar role

```http
PATCH /api/v1/users/:id/role
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "role": "provider" }
```

Valores: `admin`, `client`, `provider`

**Regras:**

- Não rebaixar/remover o último admin ativo (inclui auto-rebaixamento)
- Mensagem: `USER_LAST_ADMIN`

**Arquivo:** `user.service.js` → `updateUserRole`

### Rotas admin existentes (já estavam no projeto)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/users` | Listar usuários (filtros: `role`, `active`, `page`, `limit`) |
| GET | `/api/v1/users/:id` | Detalhe de usuário |

---

## 3. Auditoria de contratos

### Validação no aceite

**Arquivo:** `src/features/contract/contract.service.js` → `acceptContract`

| Role | Pode aceitar |
|------|--------------|
| `client` | Apenas contratos `client_eb` |
| `provider` | Apenas contratos `provider_eb` |
| `admin` | **Não pode aceitar** (`CONTRACT_ADMIN_CANNOT_ACCEPT`) |

### Listagem de todos os aceites (admin)

```http
GET /api/v1/contracts/acceptances?page=1&limit=20&userId=&contractId=
Authorization: Bearer <token-admin>
```

Retorna aceites paginados com includes de `contract` e `user` (id, name, email, role).

**Arquivos:**

- `contract.service.js` → `listAllAcceptances`
- `contract.controller.js` → `listAcceptances`
- `contract.routes.js` → rota **antes** de `/:id` para não conflitar

---

## 4. Dashboard de médias (average rating)

```http
GET /api/v1/users/:id/average-rating
Authorization: Bearer <token-admin>
```

- Antes: qualquer usuário autenticado
- Agora: `authenticate` + `authorize(USER_ROLES.ADMIN)` em `user.routes.js`

---

## 5. Mensagens i18n adicionadas

**Arquivo:** `src/utils/i18n.js` (pt + en)

| Chave | Uso |
|-------|-----|
| `USER_STATUS_UPDATED_SUCCESS` | PATCH status |
| `USER_ROLE_UPDATED_SUCCESS` | PATCH role |
| `USER_CANNOT_DEACTIVATE_SELF` | Auto-desativação |
| `USER_LAST_ADMIN` | Proteção do último admin |
| `CONTRACT_ADMIN_CANNOT_ACCEPT` | Admin tentando aceitar contrato |

---

## 6. Mapa de arquivos alterados

```
src/features/user/
  user.service.js      ← register, createAdmin, updateStatus, updateRole
  user.controller.js   ← handlers admin
  user.routes.js       ← novas rotas + average-rating protegido

src/features/contract/
  contract.service.js  ← validação role + listAllAcceptances
  contract.controller.js
  contract.routes.js   ← GET /acceptances

src/providers/notification/
  notification.provider.js  ← forceLogoutUser

src/utils/i18n.js      ← novas mensagens
```

---

## 7. O que ainda falta

### Documentação (recomendado antes do frontend)

- [ ] **`RBAC_AUDIT.md`** — Seção 6 ainda lista os gaps #1–#4 como abertos; conclusão (§8) pede correção do register. Atualizar tabela de riscos e matriz de rotas de user/contract.
- [ ] **`features/User.md`** — Desatualizado:
  - Ainda menciona `status: pending/active` (modelo atual usa `active: boolean`)
  - Não documenta `POST /admin`, `PATCH /:id/status`, `PATCH /:id/role`
  - Register ainda diz que aceita `admin` no body
  - Falta `GET /:id/average-rating` (admin only)
- [ ] **`features/contract.md`** — Falta `GET /acceptances` (admin) e regra `CONTRACT_ADMIN_CANNOT_ACCEPT`
- [ ] **`features/review.md`** — Menciona average-rating sem indicar restrição admin

### Produto / operação

- [ ] **Fluxo de ativação no register** — Novos usuários via `/register` são criados com `active: false`. Confirmar se existe outro fluxo (admin ativa manualmente ou e-mail) documentado para a Thalita.
- [ ] **Testes** — Nenhum teste automatizado cobrindo:
  - Tentativa de register com `role: admin`
  - PATCH status/role e proteção do último admin
  - Aceite de contrato por role errada
  - `GET /acceptances` só para admin

### Opcional / arquitetural (fora do escopo atual)

- [ ] RBAC granular por permissão (item #5 do audit — informativo)
- [ ] Endpoint de delete físico de usuário (audit mencionava “desativar”; soft delete via `active` já cobre o caso)
- [ ] Forçar register público **sempre** como `client` (sem opção `provider` no body)

---

## 8. Checklist rápido para a Thalita (frontend)

```bash
# 1. Criar admin (primeiro admin precisa existir no banco/migration/seed)
POST /api/v1/users/admin

# 2. Listar equipe
GET /api/v1/users?role=provider&active=true

# 3. Desativar prestador
PATCH /api/v1/users/{id}/status  →  { "active": false }

# 4. Promover a admin
PATCH /api/v1/users/{id}/role  →  { "role": "admin" }

# 5. Ver aceites de contratos (compliance)
GET /api/v1/contracts/acceptances

# 6. Ver média de avaliação de prestador
GET /api/v1/users/{providerId}/average-rating
```

---

## 9. Referência cruzada

| Documento | Situação |
|-----------|----------|
| `RBAC_AUDIT.md` | Audit original — **precisa atualização pós-fix** |
| `RBAC_FIXES_STATUS.md` | Este arquivo — status pós-implementação |
| `features/User.md` | **Desatualizado** |
| `features/contract.md` | **Parcialmente desatualizado** |
