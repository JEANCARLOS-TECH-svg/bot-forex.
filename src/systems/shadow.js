// ── SHADOW TRADING ────────────────────────────────────────────────────────────
// Registra operaciones simuladas en data/shadow-history.json y calcula stats.

const fs   = require('fs');
const path = require('path');

const FILE = path.join('./data', 'shadow-history.json');

let history = [];

function _load() {
  try {
    history = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    history = [];
  }
}

function _save() {
  fs.writeFile(FILE, JSON.stringify(history, null, 2), err => {
    if (err) console.error('[Shadow] Error al guardar:', err.message);
  });
}

function recordOpen(entry) {
  history.push({ ...entry, status: 'OPEN' });
  _save();
  console.log('[Shadow] OPEN registrado — side:', entry.side, 'entry:', entry.entryPrice);
}

function recordClose(timestamp, exitPrice, result, pnlPips) {
  const idx = history.findIndex(e => e.timestamp === timestamp && e.status === 'OPEN');
  if (idx === -1) {
    console.warn('[Shadow] recordClose: no se encontró entrada con timestamp', timestamp);
    return;
  }
  const entryPrice     = history[idx].entryPrice;
  // Comisión y slippage en unidades de precio (misma unidad que pnlPips)
  // 0.1% entrada + 0.1% salida = 0.2% del precio de entrada (aprox)
  const commissionPips = +(entryPrice * 0.002).toFixed(4);
  const slippagePips   = +(entryPrice * 0.0005).toFixed(4);
  const pnlNet         = +(pnlPips - commissionPips - slippagePips).toFixed(4);
  history[idx] = { ...history[idx], exitPrice, result, pnlPips, commissionPips, slippagePips, pnlNet, status: 'CLOSED' };
  _save();
  console.log('[Shadow] CLOSE registrado —', result, 'pnl:', pnlPips, 'net:', pnlNet);
}

function getStats() {
  const closed = history.filter(e => e.status === 'CLOSED');
  const wins   = closed.filter(e => e.result === 'WIN').length;
  const pnlPips = closed.reduce((sum, e) => sum + (e.pnlPips || 0), 0);
  return {
    total:   closed.length,
    wins,
    winRate: closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0,
    pnlPips: +pnlPips.toFixed(2)
  };
}

// Carga inicial al requerir el módulo
_load();

function getHistory() {
  return history
    .filter(e => e.status === 'CLOSED')
    .map(e => ({
      timestamp:  e.timestamp,
      side:       e.side,
      entryPrice: e.entryPrice,
      exitPrice:  e.exitPrice,
      sl:         e.sl,
      tp:         e.tp,
      pnl:        e.pnlNet ?? e.pnlPips ?? 0,
      result:     e.result,
    }));
}

function clearHistory() {
  history = [];
  _save();
  console.log('[Shadow] Historial limpiado');
}

module.exports = { recordOpen, recordClose, getStats, getHistory, clearHistory };
