// ── L6 POSITION ───────────────────────────────────────────────────────────────
// Gestiona posiciones abiertas: trailing stop, breakeven, cierre por TP/SL.

const state = require('../engine/state');

function manage(openPositions) {
  const currentPrice = state.get('price.current');
  if (!currentPrice || !openPositions || openPositions.length === 0) return;

  openPositions.forEach(function(pos) {
    // Actualizar highSinceEntry / lowSinceEntry
    if (pos.side === 'BUY') {
      if (currentPrice > (pos.highSinceEntry || pos.entryPrice)) {
        pos.highSinceEntry = currentPrice;
      }
    } else {
      if (currentPrice < (pos.lowSinceEntry || pos.entryPrice)) {
        pos.lowSinceEntry = currentPrice;
      }
    }

    // Marcar para cierre si toca SL o TP
    if (pos.side === 'BUY') {
      if (currentPrice <= pos.sl) pos.status = 'CLOSE_SL';
      if (currentPrice >= pos.tp) pos.status = 'CLOSE_TP';
    } else {
      if (currentPrice >= pos.sl) pos.status = 'CLOSE_SL';
      if (currentPrice <= pos.tp) pos.status = 'CLOSE_TP';
    }
  });
}

module.exports = { manage };
