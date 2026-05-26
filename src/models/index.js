'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const dbConfig = require('../config/database.js')[env];

const db = {};

let sequelize;

if (dbConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

const modelsPath = __dirname;
fs.readdirSync(modelsPath)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
  )
  .forEach((file) => {
    const model = require(path.join(modelsPath, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

const {
  User,
  Property,
  ServiceOrder,
  ServiceExtra,
  ServiceOrderExtra,
  InventoryItem,
  Contract,
  ContractAcceptance,
  Review,
  InboxMessage,
  FieldReport,
  RecurringSchedule,
} = db;

// --- Users ---
User.hasMany(Property, { as: 'properties', foreignKey: 'clientId' });
User.hasMany(ServiceOrder, { as: 'assignedOrders', foreignKey: 'providerId' });
User.hasMany(ContractAcceptance, { as: 'contractAcceptances', foreignKey: 'userId' });
User.hasMany(Review, { as: 'reviewsGiven', foreignKey: 'reviewerId' });
User.hasMany(Review, { as: 'reviewsReceived', foreignKey: 'reviewedId' });

// --- Properties ---
Property.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
Property.hasMany(ServiceOrder, { as: 'serviceOrders', foreignKey: 'propertyId' });
Property.hasMany(InventoryItem, { as: 'inventoryItems', foreignKey: 'propertyId' });

// --- Service Orders ---
ServiceOrder.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
ServiceOrder.belongsTo(User, { as: 'provider', foreignKey: 'providerId' });
ServiceOrder.hasMany(ServiceOrderExtra, { as: 'extras', foreignKey: 'serviceOrderId' });
ServiceOrder.hasMany(Review, { as: 'reviews', foreignKey: 'serviceOrderId' });

// --- Service Extras (master) ---
ServiceExtra.hasMany(ServiceOrderExtra, { as: 'orderExtras', foreignKey: 'serviceExtraId' });

// --- Service Order Extras (pivot) ---
ServiceOrderExtra.belongsTo(ServiceOrder, { as: 'serviceOrder', foreignKey: 'serviceOrderId' });
ServiceOrderExtra.belongsTo(ServiceExtra, { as: 'serviceExtra', foreignKey: 'serviceExtraId' });

// --- Inventory ---
InventoryItem.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });

// --- Contracts ---
Contract.hasMany(ContractAcceptance, { as: 'acceptances', foreignKey: 'contractId' });

// --- Contract Acceptances ---
ContractAcceptance.belongsTo(User, { as: 'user', foreignKey: 'userId' });
ContractAcceptance.belongsTo(Contract, { as: 'contract', foreignKey: 'contractId' });

// --- Reviews ---
Review.belongsTo(ServiceOrder, { as: 'serviceOrder', foreignKey: 'serviceOrderId' });
Review.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewerId' });
Review.belongsTo(User, { as: 'reviewed', foreignKey: 'reviewedId' });

// --- Inbox Messages ---
InboxMessage.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
InboxMessage.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });
InboxMessage.belongsTo(ServiceOrder, { as: 'serviceOrder', foreignKey: 'serviceOrderId' });
InboxMessage.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
User.hasMany(InboxMessage, { as: 'sentMessages', foreignKey: 'senderId' });
User.hasMany(InboxMessage, { as: 'receivedMessages', foreignKey: 'recipientId' });

// --- Field Reports ---
FieldReport.belongsTo(ServiceOrder, { as: 'serviceOrder', foreignKey: 'serviceOrderId' });
FieldReport.belongsTo(User, { as: 'provider', foreignKey: 'providerId' });
FieldReport.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
FieldReport.belongsTo(User, { as: 'resolvedBy', foreignKey: 'resolvedById' });
ServiceOrder.hasMany(FieldReport, { as: 'fieldReports', foreignKey: 'serviceOrderId' });
Property.hasMany(FieldReport, { as: 'fieldReports', foreignKey: 'propertyId' });

// --- Recurring Schedules ---
RecurringSchedule.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
RecurringSchedule.belongsTo(User, { as: 'provider', foreignKey: 'providerId' });
Property.hasMany(RecurringSchedule, { as: 'recurringSchedules', foreignKey: 'propertyId' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
