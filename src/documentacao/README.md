# EB Services API — Documentação

Backend da plataforma **EB Services and Solutions**: intermediação e gestão de serviços de limpeza e manutenção para clientes residenciais, comerciais, governamentais e propriedades de temporada (Airbnb).

## Visão geral

| Pilar | Role (`users.role`) | Descrição |
|-------|----------------------|-----------|
| **Admin** (EB Services) | `admin` | Controle total, faturamento, localização da equipe, relatórios |
| **Cliente** (Proprietários/Airbnb) | `client` | Fotos antes/depois, estoque de insumos, contratos digitais |
| **Prestador** (Equipe de Campo) | `provider` | Check-in/out GPS, checklist, fotos, alertas offline |

## Stack

- **Node.js** + **Express**
- **PostgreSQL** + **Sequelize**
- API versionada em `/api/v1/...`

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [ONBOARDING.md](./ONBOARDING.md) | Como rodar local, migrar DB, primeiro usuário |
| [ENV_REFERENCE.md](./ENV_REFERENCE.md) | Variáveis de ambiente |
| [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) | **Schema completo — tabelas, campos, relações** |
| [features/Health.md](./features/Health.md) | Probes e health check |
| [features/User.md](./features/User.md) | Autenticação e gestão de usuários |
| [features/properties.md](./features/properties.md) | Propriedades e sync iCal (Airbnb) |
| [features/inventory.md](./features/inventory.md) | Estoque por propriedade |
| [features/contract.md](./features/contract.md) | Contratos e aceite digital |
| [features/report.md](./features/report.md) | Relatório de faturamento |
| [features/review.md](./features/review.md) | Avaliações de qualidade |
| [features/notifications.md](./features/notifications.md) | Socket.io e eventos |
| [models/User.md](./models/User.md) | Contrato do model User |
| [models/Property.md](./models/Property.md) | Contrato do model Property |
| [models/ServiceOrder.md](./models/ServiceOrder.md) | Contrato do model ServiceOrder |

## Estrutura do código

```
eb--api/
├── app.js                    # Entrada Express
├── migrations/               # Migrations Sequelize
├── scripts/                    # Utilitários (smoke test)
└── src/
    ├── config/                 # DB, constants, env agrupado
    ├── models/                 # Sequelize models + associações
    ├── features/               # Domínios (health, user, ...)
    ├── routes/index.js         # Agregador único de rotas v1
    ├── middlewares/            # Auth, locale, erro
    ├── providers/              # Clientes HTTP externos (iCal, email...)
    └── documentacao/           # Esta pasta
```

## Fluxo por request

```
routes → controller → service → (provider / model)
```

## Roadmap de domínios (próximas features)

- ~~`properties` — propriedades e integração iCal (Airbnb)~~ ✅
- ~~`inventory` — estoque crítico por propriedade~~ ✅
- ~~`service-orders` — execução com GPS e fotos~~ ✅
- ~~`contracts` — contratos digitais~~ ✅
- ~~`reports` — relatório de faturamento~~ ✅

## Idiomas

Respostas de erro e mensagens do sistema suportam **Português (`pt`)** e **Inglês (`en`)** via header `Accept-Language` ou `X-Locale`.
