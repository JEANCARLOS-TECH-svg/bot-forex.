// ── L2 INDICATORS ────────────────────────────────────────────────────────────
// Funciones extraídas TAL CUAL de index.html — no modificar.
// Las que usan globales (calcADX, calcStochRSI, calcPVTSmoothed, etc.)
// leen las mismas referencias de arrays que gestiona state.js.

const state = require('../engine/state');

// ── calcRSI ───────────────────────────────────────────────────────────────────
function calcRSI(p,period){
  if(p.length<period+1)return 50;
  let g=0,l=0;
  for(let i=p.length-period;i<p.length;i++){const d=p[i]-p[i-1];if(d>0)g+=d;else l+=Math.abs(d);}
  return 100-(100/(1+(g/(l||0.0001))));
}

// ── calcEMA ───────────────────────────────────────────────────────────────────
function calcEMA(p,period){
  if(p.length<period)return p[p.length-1];
  const k=2/(period+1);let ema=p.slice(0,period).reduce(function(a,b) { return a+b; },0)/period;
  for(let i=period;i<p.length;i++)ema=p[i]*k+ema*(1-k);
  return ema;
}

// ── calcEMAValue ──────────────────────────────────────────────────────────────
function calcEMAValue(prices, period) {
  return calcEMA(prices, period);
}

// ── calcMACD ──────────────────────────────────────────────────────────────────
function calcMACD(p,fast,slow,sig){
  if(p.length<slow+sig)return{macd:0,signal:0,hist:0};
  const arr=[];
  for(let i=slow;i<p.length;i++)arr.push(calcEMA(p.slice(0,i+1),fast)-calcEMA(p.slice(0,i+1),slow));
  return{macd:arr[arr.length-1],signal:calcEMA(arr,sig),hist:arr[arr.length-1]-calcEMA(arr,sig)};
}

// ── calcBollinger ─────────────────────────────────────────────────────────────
function calcBollinger(prices, period, multiplier) { if(!period)period=20; if(!multiplier)multiplier=2;
  if(prices.length < period) return { upper: prices[prices.length-1], mid: prices[prices.length-1], lower: prices[prices.length-1] };
  const slice = prices.slice(-period);
  const mid = slice.reduce(function(a,b) { return a+b; },0)/period;
  const variance = slice.reduce(function(s,p){return s+Math.pow(p-mid,2);},0)/period;
  const std = Math.sqrt(variance);
  return { upper: mid + multiplier*std, mid, lower: mid - multiplier*std };
}

// ── calcStochRSI ──────────────────────────────────────────────────────────────
function calcStochRSI(prices, period, smoothK, smoothD) {
  if(!period) period=14; if(!smoothK) smoothK=3; if(!smoothD) smoothD=3;
  var needed = period * 2 + smoothK + smoothD;
  if(prices.length < needed) return { k:50, d:50 };

  // Build RSI history — need enough points to compute smoothK+smoothD smooth-K values
  var rsiArr = [];
  for(var _sri=period; _sri<=prices.length; _sri++) {
    rsiArr.push(calcRSI(prices.slice(0,_sri), period));
  }
  var minRsiNeeded = period + smoothK + smoothD - 1;
  if(rsiArr.length < minRsiNeeded) return { k:50, d:50 };

  // rawK(i): %K at position i in rsiArr using a rolling window of 'period' RSI values
  function rawKAt(i) {
    var sl = rsiArr.slice(Math.max(0, i-period+1), i+1);
    var mn = Math.min.apply(null, sl), mx = Math.max.apply(null, sl);
    return mx === mn ? 50 : ((rsiArr[i] - mn) / (mx - mn)) * 100;
  }

  // Build smoothed %K array: SMA(smoothK) of rawK — need smoothK+smoothD-1 values for %D
  var smoothKArr = [];
  var startSK = rsiArr.length - (smoothK + smoothD - 1) - smoothK + 1;
  for(var _ski = startSK; _ski <= rsiArr.length - smoothK; _ski++) {
    var sum = 0;
    for(var _sj = _ski; _sj < _ski + smoothK; _sj++) sum += rawKAt(_sj);
    smoothKArr.push(sum / smoothK);
  }
  if(smoothKArr.length === 0) return { k:50, d:50 };

  var k = smoothKArr[smoothKArr.length - 1];

  // %D = SMA(smoothD) of smoothed %K
  var dSlice = smoothKArr.slice(-smoothD);
  var d = dSlice.reduce(function(a,b){ return a+b; }, 0) / dSlice.length;

  return { k: Math.min(100, Math.max(0, k)), d: Math.min(100, Math.max(0, d)) };
}

// ── calcADX ───────────────────────────────────────────────────────────────────
function calcADX(prices, highs, lows, period) {
  if(!period) period = 14;
  if(prices.length < period * 2) return 0;
  var n = period * 2;
  var sliceC = prices.slice(-n);
  // Usar High/Low reales si están disponibles (crypto live), si no usar close como fallback
  var hasHL = highs.length >= n && lows.length >= n;
  var sliceH = hasHL ? highs.slice(-n) : sliceC;
  var sliceL = hasHL ? lows.slice(-n)  : sliceC;
  var trueRanges = [], plusDM = [], minusDM = [];
  for(var i = 1; i < sliceC.length; i++) {
    var hi  = sliceH[i], lo = sliceL[i], prevC = sliceC[i-1];
    var prevH = sliceH[i-1], prevL = sliceL[i-1];
    // True Range según Wilder: max(H-L, |H-prevC|, |L-prevC|)
    var tr = Math.max(hi - lo, Math.abs(hi - prevC), Math.abs(lo - prevC));
    // Directional Movement
    var pdm = Math.max(hi - prevH, 0);
    var mdm = Math.max(prevL - lo, 0);
    if(pdm > mdm) { plusDM.push(pdm); minusDM.push(0); }
    else if(mdm > pdm) { plusDM.push(0); minusDM.push(mdm); }
    else { plusDM.push(0); minusDM.push(0); }
    trueRanges.push(tr);
  }
  var atr14 = trueRanges.slice(-period).reduce(function(a,b){return a+b;},0) / period || 1;
  var pdi = (plusDM.slice(-period).reduce(function(a,b){return a+b;},0) / period) / atr14 * 100;
  var mdi = (minusDM.slice(-period).reduce(function(a,b){return a+b;},0) / period) / atr14 * 100;
  var dx = Math.abs(pdi - mdi) / (pdi + mdi || 1) * 100;
  return Math.min(100, Math.round(dx));
}

// ── calcATR ───────────────────────────────────────────────────────────────────
function calcATR(highs, lows, closes, period) {
  if (!period) period = 14;
  if (closes.length < period + 1) return null;
  const trueRanges = [];
  for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
    const tr = Math.max(
      highs[i + 1] - lows[i + 1],
      Math.abs(highs[i + 1] - closes[i]),
      Math.abs(lows[i + 1] - closes[i])
    );
    trueRanges.push(tr);
  }
  return trueRanges.reduce((a, b) => a + b, 0) / period;
}

// ── calcPVTSmoothed ───────────────────────────────────────────────────────────
function calcPVTSmoothed(prices, volumes) {
  if(prices.length < 6 || volumes.length < 6) return { pvt: 0, slope: 0, bullish: false, bearish: false };
  var n = Math.min(prices.length, volumes.length, 20);
  var pvtArr = [0];
  var startIdx = prices.length - n;
  for(var i = 1; i < n; i++) {
    var prevClose = prices[startIdx + i - 1];
    var currClose = prices[startIdx + i];
    var vol = volumes[startIdx + i] || 0;
    if(prevClose <= 0) { pvtArr.push(pvtArr[pvtArr.length-1]); continue; }
    var change = (currClose - prevClose) / prevClose;
    pvtArr.push(pvtArr[pvtArr.length-1] + change * vol);
  }
  // WMA 3 períodos — suaviza el ruido del volumen tick a tick
  var len = pvtArr.length;
  if(len < 3) return { pvt: pvtArr[len-1], slope: 0, bullish: false, bearish: false };
  var wma = (pvtArr[len-1]*3 + pvtArr[len-2]*2 + pvtArr[len-3]*1) / 6;
  var wmaPrev = len >= 4 ? (pvtArr[len-2]*3 + pvtArr[len-3]*2 + pvtArr[len-4]*1) / 6 : pvtArr[len-2];
  var slope = wma - wmaPrev;
  return {
    pvt: wma,
    slope: slope,
    bullish: slope > 0,
    bearish: slope < 0
  };
}

// ── calculateAll ──────────────────────────────────────────────────────────────
function calculateAll() {
  const prices  = state.get('candleBuffer').map(c => c.close);
  const highs   = state.get('candleBuffer').map(c => c.high);
  const lows    = state.get('candleBuffer').map(c => c.low);
  const volumes = state.get('candleBuffer').map(c => c.volume);

  const rawAtr = calcATR(highs, lows, prices, 14);
  const lastPrice = prices[prices.length - 1] || 1;
  // Normalizar ATR como fracción del precio (ej. 0.001 = 0.1%) para usar en SL/TP
  const atr = rawAtr !== null ? rawAtr / lastPrice : null;

  const result = {
    rsi:      calcRSI(prices, 14),
    macd:     calcMACD(prices, 12, 26, 9),
    bb:       calcBollinger(prices, 20, 2),
    emaFast:  calcEMAValue(prices, 9),
    emaSlow:  calcEMAValue(prices, 21),
    stoch:    calcStochRSI(prices, 14, 3, 3),
    adx:      calcADX(prices, highs, lows, 14),
    pvt:      calcPVTSmoothed(prices, volumes),
    atr,
  };

  state.update('indicators.rsi',     result.rsi);
  state.update('indicators.macd',    result.macd);
  state.update('indicators.bb',      result.bb);
  state.update('indicators.emaFast', result.emaFast);
  state.update('indicators.emaSlow', result.emaSlow);
  state.update('indicators.stochRSI', result.stoch);
  state.update('indicators.adx',     result.adx);
  state.update('indicators.pvtSmoothed', result.pvt.pvt);
  state.update('indicators.pvtCurrent', result.pvt.pvt);
  state.update('indicators.pvtScore', result.pvt.bullish ? 1 : result.pvt.bearish ? -1 : 0);
  if (atr !== null) state.update('indicators.atr', atr);

  return result;
}

module.exports = {
  calculateAll,
  calcRSI,
  calcEMA,
  calcEMAValue,
  calcMACD,
  calcBollinger,
  calcStochRSI,
  calcADX,
  calcATR,
  calcPVTSmoothed,
};
