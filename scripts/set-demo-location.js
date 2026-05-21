/**
 * Atualiza latitude/longitude da propriedade demo LOCAL (não altera a Casa Demo da Paulista).
 *
 * Uso:
 *   node scripts/set-demo-location.js
 *   node scripts/set-demo-location.js --lat -12.975894 --lng -38.490747
 *   DEMO_LOCAL_PROPERTY_LAT=-12.97 DEMO_LOCAL_PROPERTY_LNG=-38.49 node scripts/set-demo-location.js
 */

require('dotenv').config();

const { Property } = require('../src/models');
const config = require('../src/config');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];

    if (key === '--lat' && value) {
      parsed.lat = Number(value);
      index += 1;
    } else if (key === '--lng' && value) {
      parsed.lng = Number(value);
      index += 1;
    } else if (key === '--address' && value) {
      parsed.address = value;
      index += 1;
    } else if (key === '--name' && value) {
      parsed.name = value;
      index += 1;
    }
  }

  return parsed;
}

async function run() {
  const args = parseArgs();
  const { localProperty } = config.testDemoBootstrap;
  const lat = args.lat ?? localProperty.latitude;
  const lng = args.lng ?? localProperty.longitude;
  const address = args.address ?? localProperty.address;
  const name = args.name ?? localProperty.name;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Latitude e longitude válidas são obrigatórias (--lat / --lng).');
  }

  const property = await Property.findOne({ where: { name } });

  if (!property) {
    throw new Error(
      `Propriedade "${name}" não encontrada. Reinicie a API para o bootstrap criar a demo local.`
    );
  }

  await property.update({ latitude: lat, longitude: lng, address });

  console.log('[set-demo-location] OK');
  console.log(`[set-demo-location] Property: ${property.name} (${property.id})`);
  console.log(`[set-demo-location] Address: ${address}`);
  console.log(`[set-demo-location] Coords: ${lat}, ${lng}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[set-demo-location] FAILED:', error.message);
    process.exit(1);
  });
