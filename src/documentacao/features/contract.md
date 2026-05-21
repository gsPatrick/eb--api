# Feature: Contracts

Modelos de contrato e aceite digital com validade jurídica.

## Rotas — `/api/v1/contracts`

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/` | autenticado | Listar contratos |
| GET | `/acceptances/me` | autenticado | Meus aceites |
| GET | `/acceptances` | admin | Auditoria de todos os aceites (paginado) |
| GET | `/:id` | autenticado | Detalhe do contrato |
| POST | `/` | admin | Criar modelo |
| PUT | `/:id` | admin | Atualizar modelo |
| DELETE | `/:id` | admin | Remover modelo |
| POST | `/:id/accept` | client / provider | Aceitar contrato (admin bloqueado) |

## Criar contrato (admin)

```json
{
  "title": "Termos de Prestador V1",
  "content": "<h1>Termos...</h1><p>Conteúdo HTML ou texto.</p>",
  "type": "provider_eb",
  "version": 1
}
```

Tipos: `client_eb`, `provider_eb`.

## Aceite digital

```bash
POST /api/v1/contracts/:id/accept
Authorization: Bearer <token>
```

Registra em `contract_acceptances`:

| Campo | Origem |
|-------|--------|
| `user_id` | Usuário logado |
| `contract_id` | Parâmetro da URL |
| `accepted_at` | Timestamp atual |
| `ip_address` | `req.ip` (com `trust proxy`) |
| `user_agent` | Header `User-Agent` |

Resposta:

```json
{
  "success": true,
  "message": "Contrato aceito com sucesso.",
  "data": {
    "acceptance": { "...": "..." },
    "contract": { "...": "..." }
  }
}
```

## Auditoria de aceites (admin)

```bash
GET /api/v1/contracts/acceptances?page=1&limit=20&userId=&contractId=
Authorization: Bearer <token-admin>
```

Retorna aceites paginados com dados do contrato e do usuário (id, name, email, role).

## Regras

- Um usuário só pode aceitar cada contrato uma vez (`409 CONTRACT_ALREADY_ACCEPTED`).
- Contratos `client_eb` → apenas role `client`.
- Contratos `provider_eb` → apenas role `provider`.
- **Administradores não podem aceitar contratos** (`403 CONTRACT_ADMIN_CANNOT_ACCEPT`).

## Mensagens i18n

- `CONTRACT_ACCEPTED_SUCCESS` — Contrato aceito com sucesso
- `CONTRACT_ALREADY_ACCEPTED` — Aceite duplicado
- `CONTRACT_NOT_FOUND` — Contrato não encontrado
- `CONTRACT_WRONG_ROLE` — Contrato não se aplica ao perfil
- `CONTRACT_ADMIN_CANNOT_ACCEPT` — Admin não pode aceitar contratos
