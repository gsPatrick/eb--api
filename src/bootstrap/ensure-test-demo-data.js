const bcrypt = require('bcryptjs');
const {
  User,
  Property,
  ServiceOrder,
  InventoryItem,
} = require('../models');
const {
  USER_ROLES,
  PROPERTY_STATUSES,
  SERVICE_ORDER_STATUSES,
  INVENTORY_UNITS,
} = require('../config/constants');
const config = require('../config');

const SALT_ROUNDS = 12;
const DEMO_PROPERTY_NAME = 'Casa Demo EB — Teste Mobile';
const DEMO_CLIENT_EMAIL = 'demo.client@ebservices.local';

async function ensureDemoClient() {
  const normalizedEmail = DEMO_CLIENT_EMAIL;
  const existing = await User.findOne({ where: { email: normalizedEmail } });

  if (existing) {
    if (existing.role !== USER_ROLES.CLIENT || !existing.active) {
      await existing.update({
        role: USER_ROLES.CLIENT,
        active: true,
        name: existing.name || 'Cliente Demo EB',
        locale: 'pt',
      });
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash('DemoClient2026', SALT_ROUNDS);

  return User.create({
    name: 'Cliente Demo EB',
    email: normalizedEmail,
    passwordHash,
    role: USER_ROLES.CLIENT,
    locale: 'pt',
    active: true,
  });
}

async function ensureDemoProperty(clientId) {
  let property = await Property.findOne({ where: { name: DEMO_PROPERTY_NAME } });

  if (property) {
    await property.update({
      clientId,
      status: PROPERTY_STATUSES.ACTIVE,
      address: 'Av. Paulista, 1000 — São Paulo, SP',
      latitude: -23.561684,
      longitude: -46.655981,
      defaultCleaningPrice: 180,
    });
    return property;
  }

  return Property.create({
    name: DEMO_PROPERTY_NAME,
    address: 'Av. Paulista, 1000 — São Paulo, SP',
    description: 'Propriedade de demonstração para testes do app prestador.',
    clientId,
    status: PROPERTY_STATUSES.ACTIVE,
    latitude: -23.561684,
    longitude: -46.655981,
    defaultCleaningPrice: 180,
    metadata: {},
  });
}

async function ensureDemoInventory(propertyId) {
  const items = [
    {
      name: 'Detergente multiuso',
      currentQuantity: 2,
      criticalLevel: 3,
      unit: INVENTORY_UNITS.UNIDADE,
    },
    {
      name: 'Luvas descartáveis',
      currentQuantity: 1,
      criticalLevel: 2,
      unit: INVENTORY_UNITS.UNIDADE,
    },
    {
      name: 'Desinfetante',
      currentQuantity: 0.5,
      criticalLevel: 1,
      unit: INVENTORY_UNITS.LITRO,
    },
  ];

  for (const item of items) {
    const existing = await InventoryItem.findOne({
      where: { propertyId, name: item.name },
    });

    if (existing) {
      await existing.update(item);
    } else {
      await InventoryItem.create({ ...item, propertyId });
    }
  }
}

async function ensureDemoOrder(propertyId, providerId) {
  const today = new Date().toISOString().slice(0, 10);
  let order = await ServiceOrder.findOne({
    where: { propertyId, scheduledDate: today },
  });

  if (order) {
    await order.update({
      providerId,
      status: SERVICE_ORDER_STATUSES.PENDING,
    });
    return order;
  }

  return ServiceOrder.create({
    propertyId,
    providerId,
    scheduledDate: today,
    status: SERVICE_ORDER_STATUSES.PENDING,
    beforePhotos: [],
    afterPhotos: [],
    basePrice: 180,
    extrasTotalPrice: 0,
    totalPrice: 180,
  });
}

async function ensureTestDemoData() {
  if (!config.testDemoBootstrap.enabled) {
    return;
  }

  const providerEmail = (config.testProviderBootstrap.email || '').toLowerCase();
  const provider = await User.findOne({
    where: { email: providerEmail, role: USER_ROLES.PROVIDER, active: true },
  });

  if (!provider) {
    console.log('[bootstrap] Demo data skipped — test provider not found/active');
    return;
  }

  const client = await ensureDemoClient();
  const property = await ensureDemoProperty(client.id);
  await ensureDemoInventory(property.id);
  const order = await ensureDemoOrder(property.id, provider.id);

  console.log('[bootstrap] Demo data ready for mobile QA');
  console.log(`[bootstrap] Property: ${property.name}`);
  console.log(`[bootstrap] Order today: ${order.id} → ${provider.email}`);
}

module.exports = {
  ensureTestDemoData,
};
