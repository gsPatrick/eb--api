const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../models');
const config = require('../config');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const META_TABLE = 'SequelizeMeta';

function hasMetaTable(tables) {
  return tables.some((table) => String(table).toLowerCase() === META_TABLE.toLowerCase());
}

async function ensureMetaTable(queryInterface) {
  const tables = await queryInterface.showAllTables();

  if (hasMetaTable(tables)) {
    return;
  }

  await queryInterface.createTable(META_TABLE, {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
  });
}

async function getAppliedMigrationNames() {
  const [rows] = await sequelize.query(`SELECT name FROM "${META_TABLE}" ORDER BY name`);
  return new Set(rows.map((row) => row.name));
}

async function runMigrations() {
  if (!config.db.migrateOnStart) {
    console.log('[migrate] Skipped (DB_MIGRATE_ON_START=false)');
    return;
  }

  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable(queryInterface);

  const applied = await getAppliedMigrationNames();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();

  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log('[migrate] Database schema is up to date');
    return;
  }

  console.log(`[migrate] Applying ${pending.length} migration(s)...`);

  for (const file of pending) {
    const migrationPath = path.join(MIGRATIONS_DIR, file);
    delete require.cache[require.resolve(migrationPath)];
    const migration = require(migrationPath);

    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${file} has no up() function`);
    }

    await migration.up(queryInterface, Sequelize);
    await sequelize.query(`INSERT INTO "${META_TABLE}" (name) VALUES (:name)`, {
      replacements: { name: file },
    });
    console.log(`[migrate] Applied ${file}`);
  }

  console.log('[migrate] All migrations applied');
}

module.exports = {
  runMigrations,
};
