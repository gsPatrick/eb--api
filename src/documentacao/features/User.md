# Feature: User

Gestão de usuários e autenticação. Suporta os três pilares: **admin**, **client**, **provider**.

## Rotas

| Método | Rota | Auth | Role | Descrição |
|--------|------|------|------|-----------|
| POST | `/api/v1/users/register` | Não | — | Cadastro público (client ou provider) |
| POST | `/api/v1/users/login` | Não | — | Login (retorna JWT) |
| GET | `/api/v1/users/me` | Bearer | Qualquer ativo | Perfil do usuário autenticado |
| PATCH | `/api/v1/users/me` | Bearer | Qualquer ativo | Atualizar nome, telefone, locale |
| PATCH | `/api/v1/users/me/avatar` | Bearer | Qualquer ativo | Upload de avatar |
| POST | `/api/v1/users/admin` | Bearer | `admin` | Criar novo administrador |
| GET | `/api/v1/users` | Bearer | `admin` | Listar usuários (paginado) |
| GET | `/api/v1/users/:id` | Bearer | `admin` | Detalhe de usuário |
| PATCH | `/api/v1/users/:id/status` | Bearer | `admin` | Ativar/desativar usuário |
| PATCH | `/api/v1/users/:id/role` | Bearer | `admin` | Alterar role |
| GET | `/api/v1/users/:id/average-rating` | Bearer | `admin` | Média de avaliações do prestador |

## Payloads

### Register (público)

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "password": "SenhaSegura123",
  "role": "client",
  "phone": "+5511999999999",
  "locale": "pt"
}
```

| Campo | Obrigatório | Valores |
|-------|-------------|---------|
| `name` | Sim | string |
| `email` | Sim | e-mail válido |
| `password` | Sim | string |
| `role` | Não | `client` ou `provider` (default: `client`). **`admin` é ignorado** |
| `phone` | Não | string |
| `locale` | Não | `pt`, `en` |

Novos usuários são criados com `active: false`. Login só é permitido após um admin ativar a conta.

### Login

```json
{
  "email": "maria@example.com",
  "password": "SenhaSegura123"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "user": {
      "id": "uuid",
      "name": "Maria Silva",
      "email": "maria@example.com",
      "role": "client",
      "active": true,
      "locale": "pt"
    }
  }
}
```

### Criar admin (admin)

```http
POST /api/v1/users/admin
Authorization: Bearer <token-admin>
```

```json
{
  "name": "Thalita Admin",
  "email": "admin@eb.com",
  "password": "SenhaSegura123",
  "phone": "+5511999999999",
  "locale": "pt"
}
```

### Desativar usuário (admin)

```http
PATCH /api/v1/users/:id/status
Authorization: Bearer <token-admin>
```

```json
{ "active": false }
```

- Desconecta sockets imediatamente (`force_logout`)
- Próximas requests HTTP falham no middleware `authenticate`
- Admin não pode desativar a si mesmo
- Não permite desativar o último admin ativo

### Alterar role (admin)

```http
PATCH /api/v1/users/:id/role
Authorization: Bearer <token-admin>
```

```json
{ "role": "provider" }
```

Valores: `admin`, `client`, `provider`. Protege o último admin ativo.

### List (admin)

Query params: `page`, `limit`, `role`, `active`

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/users?page=1&limit=20&role=provider&active=true"
```

### Média de prestador (admin)

```bash
curl -H "Authorization: Bearer <token-admin>" \
  "http://localhost:3000/api/v1/users/{providerId}/average-rating"
```

## Headers de idioma

```
Accept-Language: pt-BR
```

ou

```
X-Locale: en
```

## Erros comuns

| HTTP | Code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Campos obrigatórios ausentes |
| 400 | `USER_CANNOT_DEACTIVATE_SELF` | Admin tentou desativar a própria conta |
| 400 | `USER_LAST_ADMIN` | Operação removeria o último admin ativo |
| 401 | `INVALID_CREDENTIALS` | E-mail ou senha incorretos |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou usuário inativo |
| 403 | `FORBIDDEN` | Sem permissão ou usuário não ativo no login |
| 409 | `EMAIL_ALREADY_EXISTS` | E-mail já cadastrado |
| 404 | `USER_NOT_FOUND` | Usuário não encontrado |

## Ativar usuário (dev / admin)

```sql
UPDATE users SET active = true WHERE email = 'maria@example.com';
```

Ou via API: `PATCH /api/v1/users/:id/status` com `{ "active": true }`.
