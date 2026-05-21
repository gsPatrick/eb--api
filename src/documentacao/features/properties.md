# Feature: Properties

Gestão de propriedades (Airbnb, residencial, comercial) e sincronização automática de calendário via **iCal**.

## Rotas

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| GET | `/api/v1/properties` | Bearer | `admin`, `client` | Listar propriedades |
| GET | `/api/v1/properties/:id` | Bearer | `admin`, `client`* | Detalhe da propriedade |
| POST | `/api/v1/properties` | Bearer | `admin` | Criar propriedade |
| PUT | `/api/v1/properties/:id` | Bearer | `admin` | Atualizar propriedade |
| DELETE | `/api/v1/properties/:id` | Bearer | `admin` | Remover propriedade |
| POST | `/api/v1/properties/:id/sync-calendar` | Bearer | `admin` | Sincronizar iCal manualmente |

\* Cliente só acessa propriedades onde `client_id` = seu usuário (filtro automático no Service).

## Regras de acesso

- **Admin**: CRUD completo + sync manual; vê todas as propriedades.
- **Client**: apenas `GET` (lista e detalhe); vê somente propriedades vinculadas a ele.
- **Provider**: sem acesso nesta feature (fase atual).

## Payloads

### Criar propriedade (admin)

```json
{
  "name": "Apartamento Copacabana 402",
  "address": "Av. Atlântica, 1200 - Copacabana, Rio de Janeiro",
  "description": "Studio para temporada — checkout às 11h",
  "icalUrl": "https://www.airbnb.com/calendar/ical/XXXXX.ics?s=SECRET",
  "clientId": "uuid-do-cliente",
  "status": "active"
}
```

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `name` | Sim | Nome da propriedade |
| `address` | Sim | Endereço completo |
| `description` | Não | Notas internas |
| `icalUrl` | Não | Link iCal exportado do Airbnb |
| `clientId` | Sim | UUID de usuário com role `client` |
| `status` | Não | `active` (default) ou `inactive` |

### Atualizar propriedade (admin)

```json
{
  "name": "Apartamento Copacabana 402 — Renovado",
  "icalUrl": "https://www.airbnb.com/calendar/ical/NOVO_LINK.ics?s=SECRET",
  "status": "active"
}
```

Todos os campos são opcionais no PUT (partial update).

### Listar (admin ou client)

```bash
# Admin — todas, com filtros opcionais
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/properties?page=1&limit=20&status=active&clientId=<uuid>"

# Client — apenas as suas (clientId ignorado se enviado)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/properties"
```

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Apartamento Copacabana 402",
      "address": "Av. Atlântica, 1200",
      "description": "...",
      "icalUrl": "https://...",
      "clientId": "uuid",
      "status": "active",
      "client": {
        "id": "uuid",
        "name": "Maria Silva",
        "email": "maria@example.com",
        "role": "client"
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Sincronizar calendário (admin)

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/properties/<property-id>/sync-calendar
```

Resposta:

```json
{
  "success": true,
  "data": {
    "propertyId": "uuid",
    "totalEvents": 5,
    "created": 2,
    "skipped": 3,
    "orders": [
      {
        "id": "uuid",
        "propertyId": "uuid",
        "scheduledDate": "2026-05-25",
        "status": "pending",
        "source": "ical",
        "icalUid": "airbnb-event-uid",
        "notes": "iCal: Reserved"
      }
    ]
  }
}
```

## Sincronização iCal — lógica de negócio

Fluxo `syncCalendar(propertyId)`:

1. Valida propriedade `active` com `icalUrl` configurada.
2. Chama `providers/ical/ical.provider.fetchAndParse(url)`.
3. Filtra eventos **VEVENT** (reservas Airbnb).
4. Usa a data de **check-out** (`event.end`) como `scheduled_date` da ordem de serviço.
5. Antes de criar, verifica se já existe `ServiceOrder` para `(property_id, scheduled_date)`.
6. Cria ordem apenas quando não existir (evita duplicidade em syncs repetidos).

## Sincronização automática (cron)

Arquivo: `src/features/property/property-sync.service.js`

- Roda a cada **1 hora** (`0 * * * *`) por padrão.
- Busca propriedades `active` com `icalUrl` preenchido.
- Executa `syncCalendar` para cada uma.
- Falhas individuais são logadas sem interromper o lote.

Variáveis: ver [ENV_REFERENCE.md](../ENV_REFERENCE.md) (`ICAL_SYNC_*`).

## Erros comuns

| HTTP | Code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Campos obrigatórios ausentes |
| 400 | `PROPERTY_INVALID_CLIENT` | `clientId` não é usuário `client` |
| 400 | `PROPERTY_INACTIVE` | Sync em propriedade inativa |
| 400 | `PROPERTY_NO_ICAL_URL` | Sync sem URL iCal |
| 400 | `ICAL_INVALID_URL` | URL iCal malformada |
| 401 | `UNAUTHORIZED` | Token ausente/inválido |
| 403 | `FORBIDDEN` | Sem permissão (ex.: client em POST) |
| 404 | `PROPERTY_NOT_FOUND` | Propriedade inexistente ou fora do escopo do client |
| 502 | `ICAL_FETCH_FAILED` | Feed iCal indisponível |
| 504 | `ICAL_FETCH_TIMEOUT` | Timeout ao baixar feed |
| 422 | `ICAL_PARSE_FAILED` | Feed vazio ou ICS inválido |

## Arquitetura

```
property.routes.js → property.controller.js → property.service.js
                                                    ↓
                                          ical.provider.js (HTTP + parse)
                                                    ↓
                                          ServiceOrder (model)

property-sync.service.js → property.service.syncCalendar (cron horário)
```
