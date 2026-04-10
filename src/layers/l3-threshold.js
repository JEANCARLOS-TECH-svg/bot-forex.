// ── L3 THRESHOLD ──────────────────────────────────────────────────────────────
// Evalúa votos de indicadores y decide si hay señal BUY / SELL / NONE.
// Umbral dinámico según ADX y BB width (calcularUmbralDinamico de index.html).

function calcularUmbralDinamico(adxActual, regimeLabel) {
  if (regimeLabel === 'LATERAL_EXTREMO') return 70;
  if (regimeLabel === 'LATERAL')         return 65;
  // TENDENCIAL
  if (adxActual > 40)  return 55;
  if (adxActual >= 25) return 60;
  return 60;
}

function checkSignal(indicators, regime) {
  const { rsi, macd, bb, emaFast, emaSlow, stoch, adx } = indicators;
  const currentPrice = require('../engine/state').get('price.current');

  if (!currentPrice) return { side: 'NONE', score: 0 };

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

  const umbral = calcularUmbralDinamico(adx, regime.label);
  const totalBuy  = buyScore;
  const totalSell = sellScore;
  const maxScore  = adx > 30 ? 86 : 98;

  const buyPct  = (totalBuy  / maxScore) * 100;
  const sellPct = (totalSell / maxScore) * 100;

  if (buyPct >= umbral && buyPct > sellPct)  return { side: 'BUY',  score: buyPct,  umbral };
  if (sellPct >= umbral && sellPct > buyPct) return { side: 'SELL', score: sellPct, umbral };
  return { side: 'NONE', score: Math.max(buyPct, sellPct), umbral };
}

module.exports = { checkSignal };
