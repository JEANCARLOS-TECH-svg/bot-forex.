// ── KILL SWITCH ───────────────────────────────────────────────────────────────
// Detiene operaciones si el drawdown diario supera el límite.

const state = require('../engine/state');

let triggered = false;
let dailyPnL  = 0;

function reset() {
  triggered = false;
  dailyPnL  = 0;
}

function registerPnL(pnl) {
  dailyPnL += pnl;
}

function check() {
  if (triggered) return true;
  const capital          = state.get('settings.capital')        || 100;
  const limit            = state.get('settings.killSwitchLimit') || 5;
  const DAILY_LOSS_LIMIT = -(capital * limit / 100);
  if (dailyPnL <= DAILY_LOSS_LIMIT) {
    triggered = true;
    console.warn('[KillSwitch] ACTIVADO — dailyPnL:', dailyPnL, '/ límite:', DAILY_LOSS_LIMIT);
    return true;
  }
  return false;
}

function isTriggered() {
  return triggered;
}

module.exports = { check, reset, registerPnL, isTriggered };
