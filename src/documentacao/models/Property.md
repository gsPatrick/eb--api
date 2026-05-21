# Model: Property

Tabela `properties` — propriedades atendidas pela EB Services.

## Campos

| Campo (DB) | Tipo | Null | Default | Descrição |
|------------|------|------|---------|-----------|
| `id` | UUID | Não | UUIDV4 | PK |
| `name` | VARCHAR(200) | Não | — | Nome |
| `address` | VARCHAR(500) | Não | — | Endereço |
| `description` | TEXT | Sim | — | Descrição |
| `ical_url` | VARCHAR(2048) | Sim | — | URL iCal (Airbnb) |
| `client_id` | UUID | Não | — | FK → users (role client) |
| `status` | ENUM | Não | `active` | `active`, `inactive` |
| `metadata` | JSONB | Não | `{}` | Configurações da casa |
| `created_at` / `updated_at` | TIMESTAMP | Não | NOW | Auditoria |

## Associações

- `belongsTo` User (client)
- `hasMany` ServiceOrder
- `hasMany` InventoryItem

## Migration

`migrations/20260520000002-create-properties.js`
