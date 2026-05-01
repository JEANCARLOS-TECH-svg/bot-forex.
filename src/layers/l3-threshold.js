// ── L3 THRESHOLD ──────────────────────────────────────────────────────────────
// Evalúa votos de indicadores y decide si hay señal BUY / SELL / NONE.
// Umbral dinámico según ADX y BB width (calcularUmbralDinamico de index.html).

let _lastBlockedNotify = 0;
const BLOCKED_NOTIFY_INTERVAL = 5 * 60 * 1000; // max 1 notify cada 5 min

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

  // Pesos adaptativos por régimen
  const WEIGHTS = {
    TENDENCIAL:      { ema: 30, macd: 28, rsi: 15, bb: 15, stoch: 12 },
    LATERAL:         { ema:  8, macd:  5, rsi: 25, bb: 40, stoch: 22 },
    LATERAL_EXTREMO: { ema:  0, macd:  0, rsi: 35, bb: 50, stoch: 15 },
  };
  const w = WEIGHTS[regime.label] || WEIGHTS.LATERAL;

  let buyVotes = 0, sellVotes = 0;
  let buyScore = 0, sellScore = 0;

  // RSI
  if (rsi < 35) { buyVotes++;  buyScore  += w.rsi; }
  if (rsi > 65) { sellVotes++; sellScore += w.rsi; }

  // MACD histograma
  if (macd.hist > 0 && macd.macd > macd.signal) { buyVotes++;  buyScore  += w.macd; }
  if (macd.hist < 0 && macd.macd < macd.signal) { sellVotes++; sellScore += w.macd; }

  // EMA cross
  if (emaFast > emaSlow) { buyVotes++;  buyScore  += w.ema; }
  if (emaFast < emaSlow) { sellVotes++; sellScore += w.ema; }

  // Bollinger
  if (currentPrice <= bb.lower) { buyVotes++;  buyScore  += w.bb; }
  if (currentPrice >= bb.upper) { sellVotes++; sellScore += w.bb; }

  // StochRSI (solo si ADX ≤ 30)
  const stochActive = adx <= 30;
  if (stochActive) {
    if (stoch.k < 20) { buyVotes++;  buyScore  += w.stoch; }
    if (stoch.k > 80) { sellVotes++; sellScore += w.stoch; }
  }

  let umbral = calcularUmbralDinamico(adx, regime.label);

  // ── CASTIGO por pérdidas consecutivas ─────────────────────────────────────
  const losses = state.get('session.consecutiveLoss');
  if (losses >= 5)      umbral = Math.min(umbral + 15, 85);
  else if (losses >= 3) umbral = Math.min(umbral + 10, 80);
  else if (losses >= 1) umbral = Math.min(umbral +  5, 75);

  // ── AJUSTE por perfil de riesgo ────────────────────────────────────────────
  const riskProfile = state.get('settings.riskProfile') || 2;
  if (riskProfile === 1) {
    // Grumete: base -5 y castigo -5 (floor = base - 5)
    const base = calcularUmbralDinamico(adx, regime.label);
    umbral = Math.max(base - 5, umbral - 10);
  } else if (riskProfile === 3) umbral = Math.min(umbral + 3, 85);
  else if   (riskProfile === 4) umbral = Math.min(umbral + 6, 85);
  else if   (riskProfile === 5) umbral = Math.min(umbral + 9, 85);

  const totalBuy  = buyScore;
  const totalSell = sellScore;
  const maxScore = w.ema + w.macd + w.rsi + w.bb + (stochActive ? w.stoch : 0);

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

  if (Math.max(buyPct, sellPct) > 0) {
    const now = Date.now();
    if (now - _lastBlockedNotify >= BLOCKED_NOTIFY_INTERVAL) {
      _lastBlockedNotify = now;
      const { notify } = require('../adapters/telegram-bot');
      notify(`🔕 <b>Señal bloqueada</b>\nScore: ${Math.max(buyPct, sellPct).toFixed(1)} / Umbral: ${umbral}\nBUY: ${buyPct.toFixed(1)}% · SELL: ${sellPct.toFixed(1)}%`);
    }
  }

  return { side: 'NONE', score: Math.max(buyPct, sellPct), umbral };
}

module.exports = { checkSignal };
