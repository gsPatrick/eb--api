const USER_ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
  PROVIDER: 'provider',
};

const SUPPORTED_LOCALES = ['pt', 'en'];

const DEFAULT_LOCALE = 'en';

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

const CLEANING_TYPES = {
  DEEP: 'deep',
  REGULAR: 'regular',
  POST_CONSTRUCTION: 'post_construction',
  MOVE_IN: 'move_in',
  MOVE_OUT: 'move_out',
  REGULAR_AIRBNB: 'regular_airbnb',
};

const SERVICE_ORDER_EXTRA_SOURCES = {
  CLIENT_REQUEST: 'client_request',
  PROVIDER_FIELD: 'provider_field',
};

const CLIENT_EXTRA_REQUEST_HOURS = 24;

const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
};

const EB_COMMISSION_RATE = Number(process.env.EB_COMMISSION_RATE || 0.33);

const FIELD_REPORT_TYPES = {
  DAMAGE: 'damage',
  FOUND: 'found',
  LOST: 'lost',
};

const FIELD_REPORT_STATUSES = {
  OPEN: 'open',
  RESOLVED: 'resolved',
};

const RECURRENCE_FREQUENCIES = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
};

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
  CLEANING_TYPES,
  SERVICE_ORDER_EXTRA_SOURCES,
  CLIENT_EXTRA_REQUEST_HOURS,
  PAYMENT_STATUSES,
  EB_COMMISSION_RATE,
  FIELD_REPORT_TYPES,
  FIELD_REPORT_STATUSES,
  RECURRENCE_FREQUENCIES,
};
