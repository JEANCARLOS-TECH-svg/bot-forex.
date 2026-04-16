// ── L3 THRESHOLD ──────────────────────────────────────────────────────────────
// Evalúa votos de indicadores y decide si hay señal BUY / SELL / NONE.
// Umbral dinámico según ADX y BB width (calcularUmbralDinamico de index.html).

function calcularUmbralDinamico(adxActual, regimeLabel) {
  if (regimeLabel === 'LATERAL_EXTREMO') return 70;
  if (regimeLabel === 'LATERAL')         return 65;
  // TENDENCIAL
  if (adxActual > 40)  return 55;
  if (adxActual >= 25) return 55;
  return 55;
}

function checkSignal(indicators, regime) {
  const { rsi, macd, bb, emaFast, emaSlow, stoch, adx } = indicators;
  const state = require('../engine/state');
  const currentPrice = state.get('price.current');

  if (!currentPrice) return { side: 'NONE', score: 0 };

  // Filtro apertura NY: 13:15–13:45 UTC — alta volatilidad, no operar
  const now     = new Date();
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (utcMins >= 795 && utcMins < 825) {  // 13:15 = 795 min, 13:45 = 825 min
    console.log('[NY-FILTER] Bloqueado — apertura NY');
    return { side: 'NONE', score: 0, umbral: 0 };
  }

  // Votos simples — cada indicador vota BUY(+1), SELL(-1) o NEUTRAL(0)
  let buyVotes = 0, sellVotes = 0;
  let buyScore = 0, sellScore = 0;

  // RSI
  if (rsi < 35) { buyVotes++;  buyScore  += 20; }
  if (rsi > 65) { sellVotes++; sellScore += 20; }

  // MACD histograma
  if (macd.hist > 0 && macd.macd > macd.signal) { buyVotes++;  buyScore  += 22; }
  if (macd.hist < 0 && macd.macd < macd.signal) { sellVotes++; sellScore += 22; }

  // EMA cross
  if (emaFast > emaSlow) { buyVotes++;  buyScore  += 22; }
  if (emaFast < emaSlow) { sellVotes++; sellScore += 22; }

  // Bollinger
  if (currentPrice <= bb.lower) { buyVotes++;  buyScore  += 22; }
  if (currentPrice >= bb.upper) { sellVotes++; sellScore += 22; }

  // StochRSI (ajustado por régimen)
  if (adx <= 30) {
    if (stoch.k < 20) { buyVotes++;  buyScore  += 12; }
    if (stoch.k > 80) { sellVotes++; sellScore += 12; }
  }

  let umbral = calcularUmbralDinamico(adx, regime.label);

  // ── CASTIGO por pérdidas consecutivas ─────────────────────────────────────
  const losses = state.get('session.consecutiveLoss');
  if (losses >= 5)      umbral = Math.min(umbral + 15, 85);
  else if (losses >= 3) umbral = Math.min(umbral + 10, 80);
  else if (losses >= 1) umbral = Math.min(umbral +  5, 75);

  const totalBuy  = buyScore;
  const totalSell = sellScore;
  const maxScore  = adx > 30 ? 86 : 98;

  const buyPct  = (totalBuy  / maxScore) * 100;
  const sellPct = (totalSell / maxScore) * 100;

  state.update('signal.threshold', umbral);

  // ── DEBUG DETALLADO ──
  const votes = {
    RSI:   rsi < 35 ? 'BUY' : rsi > 65 ? 'SELL' : '—',
    MACD:  macd.hist > 0 && macd.macd > macd.signal ? 'BUY' : macd.hist < 0 && macd.macd < macd.signal ? 'SELL' : '—',
    EMA:   emaFast > emaSlow ? 'BUY' : emaFast < emaSlow ? 'SELL' : '—',
    BB:    currentPrice <= bb.lower ? 'BUY' : currentPrice >= bb.upper ? 'SELL' : '—',
    STOCH: adx <= 30 ? (stoch.k < 20 ? 'BUY' : stoch.k > 80 ? 'SELL' : '—') : 'skip(ADX>30)',
  };
  console.log(`[L3-DETAIL] buy=${buyPct.toFixed(1)}% sell=${sellPct.toFixed(1)}% umbral=${umbral} maxScore=${maxScore}`, votes);

  if (buyPct >= umbral && buyPct > sellPct)  return { side: 'BUY',  score: buyPct,  umbral };
  if (sellPct >= umbral && sellPct > buyPct) return { side: 'SELL', score: sellPct, umbral };
  return { side: 'NONE', score: Math.max(buyPct, sellPct), umbral };
}

module.exports = { checkSignal };
