// ── TICK MANAGER — ORDEN SAGRADO DEL TICK ────────────────────────────────────
// El orden NO se cambia. Cada capa depende del resultado de la anterior.

const fs           = require('fs');
const path         = require('path');
const state        = require('./state');
const l2Indicators = require('../layers/l2-indicators');
const l1Regime     = require('../layers/l1-regime');
const l3Threshold  = require('../layers/l3-threshold');
const l4Pivots     = require('../layers/l4-pivots');
const l5PvtSmoothed = require('../layers/l5-pvt-smoothed');
const l6Position   = require('../layers/l6-position');
const killSwitch   = require('../systems/kill-switch');
const shadow       = require('../systems/shadow');

const ERROR_LOG = path.join(__dirname, '../../data/errors.log');

function logError(err) {
  const line = `[${new Date().toISOString()}] ${err.stack || err.message}\n`;
  fs.appendFile(ERROR_LOG, line, () => {});
}

function onTick(tick) {
  try {
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

  // 6.5. Abrir posición si hay señal y no hay posición abierta
  if ((finalSignal.side === 'BUY' || finalSignal.side === 'SELL') && state.get('openPosition') === null) {
    const price = state.get('price.current');
    const sl = finalSignal.side === 'BUY' ? price * 0.99 : price * 1.01;
    const tp = finalSignal.side === 'BUY' ? price * 1.02 : price * 0.98;
    const timestamp = Date.now();
    state.update('openPosition', {
      direction: finalSignal.side,
      entryPrice: price,
      sl, tp,
      pipMul: 1,
      beApplied: false,
      status: 'OPEN',
      timestamp
    });
    shadow.recordOpen({
      side:       finalSignal.side,
      entryPrice: price,
      sl, tp,
      timestamp,
      regime:     regime.label,
      adx:        indicators.adx,
      rsi:        indicators.rsi
    });
    console.log('[OPEN]', finalSignal.side, 'entry:', price, 'sl:', sl.toFixed(2), 'tp:', tp.toFixed(2));
  }

  // 7. Gestionar posiciones abiertas (trailing, BE, TP/SL)
  l6Position.manage(state.get('openPosition'));

  // 8. Verificar kill switch
  killSwitch.check();

  console.log('[threshold]', state.get('signal.threshold'));
  return { indicators, regime, signal: finalSignal };
  } catch (err) {
    console.error('[onTick] ERROR:', err);
    logError(err);
    try {
      const { notify } = require('../adapters/telegram-bot');
      notify(`⚠️ <b>Error en onTick</b>\n<code>${err.message}</code>`);
    } catch (_) {}
  }
}

module.exports = { onTick };
