# Model: User

Tabela `users` — identidade, autenticação e autorização.

## Campos

| Campo (DB) | Tipo | Null | Default | Descrição |
|------------|------|------|---------|-----------|
| `id` | UUID | Não | UUIDV4 | PK |
| `name` | VARCHAR(150) | Não | — | Nome completo |
| `email` | VARCHAR(255) | Não | — | E-mail único |
| `password_hash` | VARCHAR(255) | Não | — | Hash bcrypt |
| `role` | ENUM | Não | `client` | `admin`, `client`, `provider` |
| `phone` | VARCHAR(30) | Sim | — | Telefone |
| `locale` | ENUM | Não | `pt` | `pt`, `en` |
| `avatar_url` | VARCHAR(2048) | Sim | — | URL do avatar |
| `active` | BOOLEAN | Não | `false` | Conta ativa |
| `last_login_at` | TIMESTAMP | Sim | — | Último login |
| `created_at` / `updated_at` | TIMESTAMP | Não | NOW | Auditoria |

## Associações

- `hasMany` Property (como client)
- `hasMany` ServiceOrder (como provider)
- `hasMany` ContractAcceptance
- `hasMany` Review (reviewer e reviewed)

## Migration

`migrations/20260520000001-create-users.js`
