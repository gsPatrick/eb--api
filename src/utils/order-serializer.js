const { USER_ROLES } = require('../config/constants');

const PROPERTY_BASE_ATTRS = [
  'id',
  'name',
  'address',
  'clientId',
  'status',
  'latitude',
  'longitude',
  'description',
  'entryInstructions',
  'gateCode',
  'doorCode',
  'lockboxCode',
];

function buildOrderIncludes(models, actor) {
  const isProvider = actor?.role === USER_ROLES.PROVIDER;
  const { Property, User, ServiceOrderExtra, ServiceExtra } = models;

  return [
    {
      model: Property,
      as: 'property',
      attributes: PROPERTY_BASE_ATTRS,
      include: isProvider
        ? []
        : [
            {
              model: User,
              as: 'client',
              attributes: ['id', 'name', 'email', 'phone', 'role'],
            },
          ],
    },
    {
      model: User,
      as: 'provider',
      attributes: ['id', 'name', 'email', 'phone', 'role'],
    },
    {
      model: ServiceOrderExtra,
      as: 'extras',
      include: [
        {
          model: ServiceExtra,
          as: 'serviceExtra',
          attributes: ['id', 'name', 'defaultPrice', 'estimatedTime'],
        },
      ],
    },
  ];
}

function sanitizeOrderForActor(order, actor) {
  if (!order) return order;

  const plain = order.toJSON ? order.toJSON() : { ...order };

  if (actor?.role === USER_ROLES.PROVIDER && plain.property) {
    delete plain.property.client;
    delete plain.property.clientId;
  }

  return plain;
}

function sanitizeOrdersForActor(orders, actor) {
  return orders.map((order) => sanitizeOrderForActor(order, actor));
}

module.exports = {
  buildOrderIncludes,
  sanitizeOrderForActor,
  sanitizeOrdersForActor,
  PROPERTY_BASE_ATTRS,
};
