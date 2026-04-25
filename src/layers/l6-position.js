// ── L6 POSITION ───────────────────────────────────────────────────────────────
// Gestiona la posición abierta: TP/SL, cierre y registro shadow.

const state      = require('../engine/state');
const shadow     = require('../systems/shadow');
const killSwitch = require('../systems/kill-switch');

function manage(pos) {
  const currentPrice = state.get('price.current');
  if (!currentPrice || !pos || pos.status !== 'OPEN') return;

  // Verificar SL / TP
  if (pos.direction === 'BUY') {
    if (currentPrice <= pos.sl) pos.status = 'CLOSE_SL';
    else if (currentPrice >= pos.tp) pos.status = 'CLOSE_TP';
  } else {
    if (currentPrice >= pos.sl) pos.status = 'CLOSE_SL';
    else if (currentPrice <= pos.tp) pos.status = 'CLOSE_TP';
  }

  if (pos.status === 'CLOSE_TP' || pos.status === 'CLOSE_SL') {
    const result   = pos.status === 'CLOSE_TP' ? 'WIN' : 'LOSS';
    const pnlPips  = pos.direction === 'BUY'
      ? +(currentPrice - pos.entryPrice).toFixed(2)
      : +(pos.entryPrice - currentPrice).toFixed(2);

    console.log('[CLOSE]', result, 'exit:', currentPrice, 'pnl:', pnlPips);
    shadow.recordClose(pos.timestamp, currentPrice, result, pnlPips);
    killSwitch.registerPnL(pnlPips);
    state.update('openPosition', null);
  }
}

module.exports = { manage };
