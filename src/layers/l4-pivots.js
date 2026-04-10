// ── L4 PIVOTS ─────────────────────────────────────────────────────────────────
// Valida señal contra niveles de Pivot Points.
// Lógica extraída de calcPivotPoints / isTooCloseToResistance de index.html.

const state = require('../engine/state');

function calcPivotPoints() {
  const prices = state.get('candleBuffer').map(c => c.close);
  if(prices.length < 10) return null;
  var n   = Math.min(prices.length, 100);
  var sl  = prices.slice(-n);
  var hi  = Math.max.apply(null, sl);
  var lo  = Math.min.apply(null, sl);
  var cl  = sl[sl.length - 1];
  var pp  = (hi + lo + cl) / 3;
  var r1  = 2 * pp - lo;
  var r2  = pp + (hi - lo);
  var s1  = 2 * pp - hi;
  var s2  = pp - (hi - lo);
  return { pp, r1, r2, s1, s2 };
}

function isTooCloseToResistance(price, pivots, pct) {
  if(!pivots || !price) return false;
  pct = pct || 0.002;
  var tooCloseR1 = Math.abs(price - pivots.r1) / price < pct;
  var tooCloseR2 = Math.abs(price - pivots.r2) / price < pct;
  var tooClosePP = Math.abs(price - pivots.pp) / price < (pct * 0.5);
  return tooCloseR1 || tooCloseR2 || tooClosePP;
}

function isTooCloseToSupport(price, pivots, pct) {
  if(!pivots || !price) return false;
  pct = pct || 0.002;
  var tooCloseS1 = Math.abs(price - pivots.s1) / price < pct;
  var tooCloseS2 = Math.abs(price - pivots.s2) / price < pct;
  return tooCloseS1 || tooCloseS2;
}

function validate(signal) {
  if (signal.side === 'NONE') return signal;

  const currentPrice = state.get('price.current');
  const pivots = calcPivotPoints();

  if (!pivots || !currentPrice) return signal;

  if (signal.side === 'BUY' && isTooCloseToResistance(currentPrice, pivots)) {
    return { ...signal, side: 'NONE', reason: 'TOO_CLOSE_RESISTANCE' };
  }
  if (signal.side === 'SELL' && isTooCloseToSupport(currentPrice, pivots)) {
    return { ...signal, side: 'NONE', reason: 'TOO_CLOSE_SUPPORT' };
  }

  return { ...signal, pivots };
}

module.exports = { validate, calcPivotPoints };
