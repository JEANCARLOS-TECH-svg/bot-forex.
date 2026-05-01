const TelegramBot = require('node-telegram-bot-api');
const state     = require('../engine/state');
const binance   = require('./binance-connector');
const shadow    = require('../systems/shadow');

const TOKEN   = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let bot = null;

function notify(msg) {
  if (!bot || !CHAT_ID) return;
  bot.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(err => {
    console.error('[Telegram] notify error:', err.message);
  });
}

function start() {
  if (!TOKEN) {
    console.error('[Telegram] TELEGRAM_TOKEN no definido — bot desactivado');
    return;
  }

  bot = new TelegramBot(TOKEN, {
    polling: { interval: 1000, params: { timeout: 10 } }
  });
  console.log('[Telegram] Bot iniciado');
  notify('✅ <b>ForexBot v26.3</b> conectado. Escribe /help para ver los comandos.');

  bot.onText(/\/status/, (msg) => {
    const regime     = state.get('market.regime');
    const consLoss   = state.get('session.consecutiveLoss');
    const shadowMode = state.get('session.isShadowMode');
    const warmup     = state.get('warmupComplete');
    const ss         = shadow.getStats();

    const pnlStr = ss.total > 0
      ? (ss.pnlPips >= 0 ? '+' : '') + ss.pnlPips + ' pips'
      : 'sin datos';

    const text =
      `<b>ForexBot v26.3 — Status</b>\n` +
      `Régimen: <code>${regime}</code>\n` +
      `Losses consecutivos: <code>${consLoss}</code>\n` +
      `Shadow mode: <code>${shadowMode}</code>\n` +
      `Warmup completo: <code>${warmup}</code>\n` +
      `\n<b>Shadow trades:</b> ${ss.total} ops · ${ss.total > 0 ? ss.winRate + '% win rate' : '—'} · ${pnlStr}`;

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
  });

  bot.onText(/\/stop/, (msg) => {
    binance.disconnect();
    bot.sendMessage(msg.chat.id, '⛔ Binance desconectado.');
  });

  bot.onText(/\/shadow/, (msg) => {
    const current = state.get('session.isShadowMode');
    state.update('session.isShadowMode', !current);
    const status = !current ? 'activado' : 'desactivado';
    bot.sendMessage(msg.chat.id, `👻 Shadow mode ${status}.`);
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
      '<b>ForexBot v26.3 — Comandos disponibles:</b>\n' +
      '/status — estado actual del bot\n' +
      '/shadow — activar/desactivar shadow mode\n' +
      '/stop — desconectar Binance\n' +
      '/help — mostrar esta ayuda',
      { parse_mode: 'HTML' }
    );
  });

  bot.on('polling_error', (err) => {
    console.error('[Telegram] polling error:', err.message);
  });
}

module.exports = { notify, start };
