const USER_ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  PROVIDER: 'provider',
};

const SUPPORTED_LOCALES = ['pt', 'en'];

const DEFAULT_LOCALE = 'pt';

const PROPERTY_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const SERVICE_ORDER_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  BILLED: 'billed',
};

const INVENTORY_UNITS = {
  UNIDADE: 'unidade',
  ROLO: 'rolo',
  LITRO: 'litro',
};

const CONTRACT_TYPES = {
  CLIENT_EB: 'client_eb',
  PROVIDER_EB: 'provider_eb',
};

const REVIEW_RATING_MIN = 1;
const REVIEW_RATING_MAX = 5;

module.exports = {
  USER_ROLES,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  PROPERTY_STATUSES,
  SERVICE_ORDER_STATUSES,
  INVENTORY_UNITS,
  CONTRACT_TYPES,
  REVIEW_RATING_MIN,
  REVIEW_RATING_MAX,
};
