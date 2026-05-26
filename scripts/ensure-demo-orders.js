/**
 * Cria/atualiza propriedades demo + OS de hoje para o prestador de teste.
 *
 * Uso (na pasta eb--api, com .env apontando para o banco):
 *   npm run demo:orders
 *
 * Variáveis úteis (.env):
 *   TEST_PROVIDER_EMAIL=patrickprestador@gmail.com
 *   TEST_DEMO_BOOTSTRAP=true
 */

require('dotenv').config();

const { sequelize } = require('../src/models');
const { ensureTestDemoData } = require('../src/bootstrap/ensure-test-demo-data');
const config = require('../src/config');

async function run() {
  if (!config.testDemoBootstrap.enabled) {
    throw new Error('TEST_DEMO_BOOTSTRAP está desabilitado. Defina TEST_DEMO_BOOTSTRAP=true no .env');
  }

  await sequelize.authenticate();
  console.log('[demo:orders] Conectado ao banco');

  await ensureTestDemoData();

  console.log('[demo:orders] OK — OS de hoje sincronizadas para', config.testProviderBootstrap.email);
}

run()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[demo:orders] FAILED:', error.message);
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
