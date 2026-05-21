# Onboarding — EB Services API

Guia para rodar o backend localmente e implantar em produção.

## Pré-requisitos

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **npm** ou **yarn**

## 1. Instalar dependências

```bash
cd eb--api
npm install
```

## 2. Configurar ambiente

```bash
cp .env.example .env
```

Edite `.env` com credenciais do PostgreSQL local, `JWT_SECRET` seguro e origens CORS.

## 3. Criar banco de dados

```bash
createdb eb_services
```

## 4. Rodar migrations

```bash
npm run migrate
```

Tabelas: `users`, `properties`, `service_orders`, `inventory_items`, `contracts`, `reviews`, etc.

Schema completo: [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md).

## 5. (Opcional) Seed do admin

```bash
npm run seed
```

Credenciais padrão: `admin@ebservices.local` / `Admin@EB2026`

## 6. Iniciar servidor

```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm start
```

- API REST: `http://localhost:3000/api/v1/...`
- WebSocket: `http://localhost:3000` (path `/socket.io`)
- Uploads estáticos: `http://localhost:3000/uploads/...`

## 7. Socket.io — teste rápido

Com o servidor rodando e um JWT válido:

```javascript
// No console do browser ou app mobile
const socket = io('http://localhost:3000', {
  auth: { token: 'SEU_JWT' },
});
socket.on('notification', console.log);
```

Eventos: check-in de prestador, estoque crítico, OS concluída. Ver [notifications.md](./features/notifications.md).

## 8. Verificar saúde

```bash
curl http://localhost:3000/api/v1/ping
curl http://localhost:3000/api/v1/health
npm run smoke:test
```

## Logs

| Destino | Conteúdo |
|---------|----------|
| **stdout** | Erros operacionais, mail simulado |
| **`logs/error.log`** | Falhas críticas de sync iCal (JSON por linha) |

## Fluxo de Produção (VPS)

### 1. Preparar servidor

```bash
# Ubuntu/Debian — exemplo
sudo apt update && sudo apt install -y nodejs npm postgresql nginx
sudo -u postgres createdb eb_services
sudo -u postgres createuser eb_api --pwprompt
```

### 2. Clonar e configurar

```bash
git clone <repo> /var/www/eb-api
cd /var/www/eb-api/eb--api
npm ci --omit=dev
cp .env.example .env
nano .env
```

Variáveis críticas em produção:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<string-longa-aleatoria>
DB_HOST=localhost
DB_NAME=eb_services
DB_USER=eb_api
DB_PASSWORD=<senha>
DB_SSL=false
CORS_ORIGINS=https://app.ebservices.com,https://admin.ebservices.com
MAIL_DRIVER=console
MAIL_ENABLED=true
ICAL_SYNC_ENABLED=true
```

### 3. Migrar banco

```bash
npm run migrate
npm run seed   # apenas primeira vez
```

### 4. PM2 — process manager

```bash
npm install -g pm2
pm2 start app.js --name eb-api
pm2 save
pm2 startup   # auto-start no boot
```

Comandos úteis:

```bash
pm2 logs eb-api
pm2 restart eb-api
pm2 status
```

### 5. Nginx reverse proxy (HTTP + WebSocket)

```nginx
server {
    listen 80;
    server_name api.ebservices.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Reinicie Nginx: `sudo systemctl reload nginx`

### 6. HTTPS (recomendado)

Use Certbot/Let's Encrypt:

```bash
sudo certbot --nginx -d api.ebservices.com
```

### 7. Pastas persistentes

Garanta permissão de escrita em:

- `public/uploads/` (fotos OS e avatars)
- `logs/` (error.log do iCal)

### 8. Checklist pós-deploy

- [ ] `GET /api/v1/health` retorna 200
- [ ] Login admin funciona
- [ ] Socket.io conecta com JWT
- [ ] Upload de avatar e fotos de check-out
- [ ] Cron iCal registrado nos logs PM2
- [ ] `logs/error.log` criado após falha simulada de iCal

## Próximos passos (dev)

1. `POST /api/v1/users/register` → ativar `active = true` no DB
2. `POST /api/v1/users/login` → obter JWT
3. Conectar Socket.io com o token
4. `GET /api/v1/users/me` — perfil
5. `PATCH /api/v1/users/me` — atualizar nome/telefone/idioma

## Estrutura de desenvolvimento

Nova feature = pasta em `src/features/<nome>/` + registro em `src/routes/index.js` + doc em `src/documentacao/features/`.
