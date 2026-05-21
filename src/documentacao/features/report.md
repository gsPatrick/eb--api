# Feature: Reports

Relatórios administrativos para faturamento.

## Rotas — `/api/v1/reports`

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/billing` | admin | Relatório de faturamento |

## Billing report

```bash
GET /api/v1/reports/billing?start_date=2026-05-01&end_date=2026-05-31&client_id=uuid
Authorization: Bearer <admin-token>
```

### Query params

| Param | Obrigatório | Descrição |
|-------|-------------|-----------|
| `start_date` | Sim | Início do período (YYYY-MM-DD) |
| `end_date` | Sim | Fim do período (YYYY-MM-DD) |
| `client_id` | Não | Filtrar por cliente (owner da propriedade) |

### Critérios

- Apenas `ServiceOrders` com `status = completed`
- Filtradas por `finished_at` dentro do período
- Soma de todos os `total_price`

### Resposta

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-05-01",
      "endDate": "2026-05-31"
    },
    "clientId": "uuid-or-null",
    "totalAmount": 1250.00,
    "orderCount": 8,
    "serviceOrders": [
      {
        "id": "uuid",
        "scheduledDate": "2026-05-15",
        "finishedAt": "2026-05-15T14:30:00.000Z",
        "basePrice": "180.00",
        "extrasTotalPrice": "45.00",
        "totalPrice": "225.00",
        "beforePhotos": [],
        "afterPhotos": ["/uploads/os/..."],
        "property": {
          "id": "uuid",
          "name": "Apartamento 402",
          "client": { "id": "uuid", "name": "Maria", "email": "..." }
        },
        "provider": { "id": "uuid", "name": "João" },
        "extras": [
          {
            "priceAtTime": "45.00",
            "serviceExtra": { "name": "Limpeza de Geladeira" }
          }
        ]
      }
    ]
  }
}
```

Base pronta para geração de Invoice pela Thalita (admin).

## Erros

| HTTP | Code | Descrição |
|------|------|-----------|
| 400 | `REPORT_INVALID_DATE_RANGE` | Datas ausentes ou inválidas |
