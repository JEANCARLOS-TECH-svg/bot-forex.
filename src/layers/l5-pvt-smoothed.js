// ── L5 PVT SMOOTHED ───────────────────────────────────────────────────────────
// Confirma señal con dirección de PVT (Price Volume Trend).
// Si PVT contradice la señal → penalización / bloqueo.

function validate(signal, indicators) {
  if (signal.side === 'NONE') return signal;

  const pvt = indicators.pvt;

  // PVT debe confirmar la dirección — si contradice, bloquea
  if (signal.side === 'BUY'  && pvt.bearish) {
    return { ...signal, side: 'NONE', reason: 'PVT_BEARISH_CONTRADICTS_BUY' };
  }
  if (signal.side === 'SELL' && pvt.bullish) {
    return { ...signal, side: 'NONE', reason: 'PVT_BULLISH_CONTRADICTS_SELL' };
  }

  return { ...signal, pvtSlope: pvt.slope };
}

module.exports = { validate };
