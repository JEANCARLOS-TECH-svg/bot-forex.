// ── TICK MANAGER — ORDEN SAGRADO DEL TICK ────────────────────────────────────
// El orden NO se cambia. Cada capa depende del resultado de la anterior.

const state        = require('./state');
const l2Indicators = require('../layers/l2-indicators');
const l1Regime     = require('../layers/l1-regime');
const l3Threshold  = require('../layers/l3-threshold');
const l4Pivots     = require('../layers/l4-pivots');
const l5PvtSmoothed = require('../layers/l5-pvt-smoothed');
const l6Position   = require('../layers/l6-position');
const killSwitch   = require('../systems/kill-switch');

function onTick(tick) {
  // 1. Actualizar precio en state
  state.update('price.current', tick.close);
  state.update('price.high', tick.high);
  state.update('price.low', tick.low);
  state.update('market.lastCandle', tick);

  // 2. Calcular todos los indicadores técnicos
  const indicators = l2Indicators.calculateAll();

  // 3. Evaluar régimen de mercado (trending / lateral)
  const regime = l1Regime.evaluate(indicators);
  state.update('market.regime', regime.label);

  // 4. Verificar si hay señal según umbral dinámico
  const signal = l3Threshold.checkSignal(indicators, regime);
  console.log('[L3]', signal);

  // 5. Validar señal contra Pivot Points
  const signalAfterPivots = l4Pivots.validate(signal);
  console.log('[L4]', signalAfterPivots);

  // 6. Validar señal contra PVT suavizado
  const finalSignal = l5PvtSmoothed.validate(signalAfterPivots, indicators);
  console.log('[L5]', finalSignal);

  // 7. Gestionar posiciones abiertas (trailing, BE, TP/SL)
  l6Position.manage(state.get('openPosition'));

  // 8. Verificar kill switch
  killSwitch.check();

  return { indicators, regime, signal: finalSignal };
}

module.exports = { onTick };
