# Feature: Reviews

Controle de qualidade — avaliações pós-serviço.

## Rotas — `/api/v1/reviews`

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| GET | `/` | admin, client | Listar avaliações |
| GET | `/:id` | admin, client | Detalhe |
| POST | `/` | client | Criar avaliação |
| PUT | `/:id` | admin | Moderar avaliação |
| DELETE | `/:id` | admin | Remover |

## Criar avaliação (client)

```json
POST /api/v1/reviews
{
  "serviceOrderId": "uuid-da-os",
  "rating": 5,
  "comment": "Excelente limpeza!"
}
```

### Regras

- OS deve estar com status `completed`
- Cliente deve ser dono da propriedade da OS
- `reviewed_id` = prestador da OS (automático)
- Uma avaliação por OS por cliente (constraint única)

## Média do prestador

```bash
GET /api/v1/users/:providerId/average-rating
```

Resposta:

```json
{
  "success": true,
  "data": {
    "providerId": "uuid",
    "providerName": "João Silva",
    "averageRating": 4.75,
    "totalReviews": 12
  }
}
```

## Mensagens i18n

- `REVIEW_CREATED_SUCCESS`
- `REVIEW_ALREADY_EXISTS`
- `REVIEW_ORDER_NOT_COMPLETED`
