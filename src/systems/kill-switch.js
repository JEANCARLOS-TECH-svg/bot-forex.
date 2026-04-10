// ── KILL SWITCH ───────────────────────────────────────────────────────────────
// Detiene operaciones si el drawdown diario supera el límite.

let triggered = false;
let dailyPnL  = 0;
const DAILY_LOSS_LIMIT = -200; // USD — configurable

function reset() {
  triggered = false;
  dailyPnL  = 0;
}

function registerPnL(pnl) {
  dailyPnL += pnl;
}

function check() {
  if (triggered) return true;
  if (dailyPnL <= DAILY_LOSS_LIMIT) {
    triggered = true;
    console.warn('[KillSwitch] ACTIVADO — dailyPnL:', dailyPnL);
    return true;
  }
  return false;
}

function isTriggered() {
  return triggered;
}

module.exports = { check, reset, registerPnL, isTriggered };
