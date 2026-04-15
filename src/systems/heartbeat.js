// ── HEARTBEAT ─────────────────────────────────────────────────────────────────
// Envía señales de vida a Telegram cada 5 minutos.
// El silencio es la alerta: si deja de llegar, el proceso se congeló.

const state = require('../engine/state');

const INTERVAL_MS = 5 * 60 * 1000;

let _notify = null;
let _timer  = null;

function _buildMessage() {
  const price   = state.get('price.current');
  const regime  = state.get('market.regime') || '—';
  const pos     = state.get('openPosition');

  let msg = `💓 <b>Bot activo</b> — ${regime} | $${price ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}`;

  if (pos && pos.status === 'OPEN') {
    const pnl = pos.direction === 'BUY'
      ? +(price - pos.entryPrice).toFixed(2)
      : +(pos.entryPrice - price).toFixed(2);
    msg += `\n📊 Posición: <b>${pos.direction}</b> | PnL: <code>${pnl >= 0 ? '+' : ''}${pnl}</code>`;
  }

  return msg;
}

function start(notifyFn) {
  _notify = notifyFn;
  _notify('✅ <b>ForexBot v25.14 iniciado</b>');

  _timer = setInterval(() => {
    try {
      _notify(_buildMessage());
    } catch (err) {
      console.error('[Heartbeat] Error al enviar:', err.message);
    }
  }, INTERVAL_MS);

  _timer.unref(); // no bloquea el cierre limpio del proceso
  console.log('[Heartbeat] Iniciado — pulso cada 5 min');
}

function stop() {
  if (_timer) clearInterval(_timer);
}

module.exports = { start, stop };
