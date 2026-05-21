# Feature: Health

Endpoints de probe para orquestração (Kubernetes, load balancers) e monitoramento.

## Rotas

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/v1/ping` | Não | Resposta mínima (liveness) |
| GET | `/api/v1/health` | Não | Status detalhado da API |

## Exemplos

### Ping

```bash
curl http://localhost:3000/api/v1/ping
```

```json
{
  "success": true,
  "data": {
    "pong": true,
    "timestamp": "2026-05-20T12:00:00.000Z"
  }
}
```

### Health

```bash
curl http://localhost:3000/api/v1/health
```

```json
{
  "success": true,
  "message": "API operacional.",
  "data": {
    "status": "ok",
    "service": "eb-api",
    "version": "1.0.0",
    "timestamp": "2026-05-20T12:00:00.000Z"
  }
}
```

## Erros comuns

| Código | Situação |
|--------|----------|
| 404 | Prefixo da API incorreto — verifique `APP_API_PREFIX` |

## Notas

- Estes endpoints **não** verificam conectividade com PostgreSQL (apenas o processo HTTP).
- Para readiness com DB, uma rota `/health/ready` pode ser adicionada futuramente.
