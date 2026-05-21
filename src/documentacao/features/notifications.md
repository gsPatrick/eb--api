# Notificações em Tempo Real (Socket.io)

Provider em `src/providers/notification/notification.provider.js`.

## Conexão WebSocket

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: '<JWT>' },
  transports: ['websocket'],
});

socket.on('connected', (data) => console.log('Connected', data));

socket.on('notification', (payload) => {
  console.log(payload.type, payload.message, payload.data);
});
```

## Eventos emitidos

| Tipo | Destinatários | Gatilho |
|------|---------------|---------|
| `ORDER_CHECKIN` | Admins | Prestador faz check-in |
| `ORDER_ASSIGNED` | **Provider** (atribuído) | Admin atribui OS a prestador |
| `INVENTORY_CRITICAL` | Admin + Client (dono) | Item atinge nível crítico |
| `ORDER_COMPLETED` | Client (dono) | OS finalizada (check-out) |

## Payload padrão

```json
{
  "type": "ORDER_CHECKIN",
  "title": "Check-in realizado",
  "message": "João iniciou limpeza em Apartamento 402.",
  "data": { "serviceOrderId": "uuid" },
  "timestamp": "2026-05-20T12:00:00.000Z"
}
```

## Autenticação

Conexões são autenticadas via JWT (`auth.token` ou header `Authorization`).

Usuários inativos não conectam.

## Path

`/socket.io` (configurável via `SOCKET_PATH` no `.env`).
