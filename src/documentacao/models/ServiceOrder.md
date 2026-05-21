# Model: ServiceOrder

Tabela `service_orders` — ordens de serviço com GPS, fotos e financeiro.

## Campos

| Campo (DB) | Tipo | Null | Default | Descrição |
|------------|------|------|---------|-----------|
| `id` | UUID | Não | UUIDV4 | PK |
| `property_id` | UUID | Não | — | FK → properties |
| `provider_id` | UUID | Sim | — | FK → users (provider) |
| `status` | ENUM | Não | `pending` | Ver statuses |
| `scheduled_date` | DATE | Não | — | Data agendada |
| `started_at` | TIMESTAMP | Sim | — | Início execução |
| `finished_at` | TIMESTAMP | Sim | — | Fim execução |
| `checkin_lat` / `checkin_long` | DECIMAL(10,7) | Sim | — | GPS check-in |
| `checkout_lat` / `checkout_long` | DECIMAL(10,7) | Sim | — | GPS check-out |
| `before_photos` | JSONB | Não | `[]` | Fotos antes |
| `after_photos` | JSONB | Não | `[]` | Fotos depois |
| `base_price` | DECIMAL(10,2) | Não | `0` | Preço base |
| `extras_total_price` | DECIMAL(10,2) | Não | `0` | Total extras |
| `total_price` | DECIMAL(10,2) | Não | `0` | Total |
| `created_at` / `updated_at` | TIMESTAMP | Não | NOW | Auditoria |

## Status

`pending`, `in_progress`, `completed`, `canceled`, `billed`

## Constraints

UNIQUE (`property_id`, `scheduled_date`)

## Associações

- `belongsTo` Property, User (provider)
- `hasMany` ServiceOrderExtra, Review

## Migration

`migrations/20260520000004-create-service-orders.js`
