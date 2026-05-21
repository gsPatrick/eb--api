# Feature: Inventory

Gestão de insumos por propriedade (papel higiênico, toalhas, kits de limpeza).

## Rotas — `/api/v1/inventory`

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/` | admin, client | Listar itens |
| GET | `/:id` | admin, client | Detalhe do item |
| POST | `/` | admin | Criar item |
| PUT | `/:id` | admin | Atualizar item |
| DELETE | `/:id` | admin | Remover item |
| PATCH | `/:id/quantity` | provider | Atualizar quantidade durante limpeza |

## Flag de estoque crítico

Na listagem e detalhe, cada item inclui:

```json
{
  "id": "uuid",
  "name": "Papel higiênico",
  "currentQuantity": "2.00",
  "criticalLevel": "5.00",
  "unit": "rolo",
  "is_critical": true
}
```

`is_critical: true` quando `current_quantity <= critical_level`.

## Payloads

### Criar (admin)

```json
{
  "propertyId": "uuid-propriedade",
  "name": "Papel higiênico",
  "currentQuantity": 10,
  "criticalLevel": 5,
  "unit": "rolo"
}
```

Unidades: `unidade`, `rolo`, `litro`.

### Atualizar quantidade (provider)

```json
PATCH /api/v1/inventory/:id/quantity
{ "currentQuantity": 3 }
```

O prestador só pode atualizar se tiver uma OS `in_progress` na propriedade do item.

## Filtros

```
GET /api/v1/inventory?propertyId=uuid&page=1&limit=50
```

Cliente vê automaticamente apenas itens das suas propriedades.

## Mensagens i18n

- `INVENTORY_UPDATED_SUCCESS` — Estoque atualizado com sucesso
- `INVENTORY_QUANTITY_UPDATED_SUCCESS` — Quantidade atualizada
- `INVENTORY_ITEM_NOT_FOUND` — Item não encontrado
