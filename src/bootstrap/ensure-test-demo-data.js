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

const LEGACY_DEMO_CLIENT_EMAIL = 'demo.client@ebservices.local';

async function resolveDemoClient() {
  const clientEmail = (config.testClientBootstrap.email || '').toLowerCase();
  const client = await User.findOne({
    where: { email: clientEmail, role: USER_ROLES.CLIENT, active: true },
  });

  if (!client) {
    return null;
  }

  const legacyClient = await User.findOne({ where: { email: LEGACY_DEMO_CLIENT_EMAIL } });
  if (legacyClient && legacyClient.id !== client.id) {
    await Property.update({ clientId: client.id }, { where: { clientId: legacyClient.id } });
    await legacyClient.update({ active: false });
    console.log('[bootstrap] Demo property migrated to test client');
  }

  return client;
}

async function ensureDemoProperty(clientId, spec, { syncCoordinates = false } = {}) {
  let property = await Property.findOne({ where: { name: spec.name } });

  if (property) {
    const updates = {
      clientId,
      status: PROPERTY_STATUSES.ACTIVE,
      defaultCleaningPrice: 180,
    };

    if (syncCoordinates) {
      updates.address = spec.address;
      updates.latitude = spec.latitude;
      updates.longitude = spec.longitude;
    }

    await property.update(updates);
    return property;
  }

  return Property.create({
    name: spec.name,
    address: spec.address,
    description: spec.description || 'Propriedade de demonstração para testes do app prestador.',
    clientId,
    status: PROPERTY_STATUSES.ACTIVE,
    latitude: spec.latitude,
    longitude: spec.longitude,
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

async function ensurePropertyBundle(clientId, providerId, spec, options = {}) {
  const property = await ensureDemoProperty(clientId, spec, options);
  await ensureDemoInventory(property.id);
  const order = await ensureDemoOrder(property.id, providerId);

  return { property, order };
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

  const client = await resolveDemoClient();
  if (!client) {
    console.log('[bootstrap] Demo data skipped — test client not found/active');
    return;
  }

  const { primaryProperty, localProperty } = config.testDemoBootstrap;

  const primary = await ensurePropertyBundle(client.id, provider.id, primaryProperty, {
    syncCoordinates: false,
  });

  console.log('[bootstrap] Demo data ready for mobile QA');
  console.log(`[bootstrap] Client: ${client.email}`);
  console.log(`[bootstrap] Property: ${primary.property.name}`);
  console.log(`[bootstrap] Order today: ${primary.order.id} → ${provider.email}`);

  if (!localProperty.enabled) {
    return;
  }

  const local = await ensurePropertyBundle(
    client.id,
    provider.id,
    {
      ...localProperty,
      description: 'Segunda propriedade demo para testes de geofence na sua localização.',
    },
    { syncCoordinates: true }
  );

  console.log(`[bootstrap] Local demo property: ${local.property.name}`);
  console.log(`[bootstrap] Local order today: ${local.order.id} → ${provider.email}`);
}

module.exports = {
  ensureTestDemoData,
};
