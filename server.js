require('dotenv').config();
const state   = require('./src/engine/state');
const ui      = require('./src/ui/server');
const telegram = require('./src/adapters/telegram-bot');
const binance  = require('./src/adapters/binance-connector');

async function main() {
  await state.init();
  ui.start();
  telegram.start();
  binance.connect('BTCUSDT');
}

function shutdown() {
  binance.disconnect();
  console.log('Bot detenido limpiamente');
  process.exit(0);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

main().catch(err => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});
