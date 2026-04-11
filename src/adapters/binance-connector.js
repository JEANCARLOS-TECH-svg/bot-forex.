const WebSocket = require('ws');
const state        = require('../engine/state');
const tickManager  = require('../engine/tick-manager');
const l2Indicators = require('../layers/l2-indicators');

const WS_BASE = 'wss://stream.binance.com:9443/ws';
const CANDLE_WARMUP  = 100;
const CANDLE_MAX     = 500;

let ws = null;

async function preloadCandles(symbol) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=500`;
  const res  = await fetch(url);
  const data = await res.json();

  const candles = data.map(k => ({
    open:   parseFloat(k[1]),
    high:   parseFloat(k[2]),
    low:    parseFloat(k[3]),
    close:  parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));

  const buffer = state.get('candleBuffer');
  buffer.push(...candles);
  if (buffer.length > CANDLE_MAX) buffer.splice(0, buffer.length - CANDLE_MAX);

  if (!state.get('warmupComplete') && buffer.length >= CANDLE_WARMUP) {
    state.update('warmupComplete', true);
  }

  // Poblar indicadores en state inmediatamente tras la precarga
  const lastCandle = candles[candles.length - 1];
  state.update('price.current', lastCandle.close);
  l2Indicators.calculateAll();

  console.log(`[Binance] Precarga: ${candles.length} velas — warmup ${state.get('warmupComplete') ? 'completo' : 'pendiente'}`);
}

async function connect(symbol) {
  await preloadCandles(symbol);

  const url = `${WS_BASE}/${symbol.toLowerCase()}@kline_1m`;
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log(`[Binance] Conectado — ${symbol} @kline_1m`);
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const k = msg.k;
    if (!k) return;

    // Precio en tiempo real en cada tick (kline abierta o cerrada)
    state.update('price.current', parseFloat(k.c));

    if (!k.x) return; // solo procesar lógica completa en klines cerradas

    const candle = {
      open:   parseFloat(k.o),
      high:   parseFloat(k.h),
      low:    parseFloat(k.l),
      close:  parseFloat(k.c),
      volume: parseFloat(k.v),
    };

    const buffer = state.get('candleBuffer');
    buffer.push(candle);
    if (buffer.length > CANDLE_MAX) buffer.splice(0, buffer.length - CANDLE_MAX);

    if (!state.get('warmupComplete') && buffer.length >= CANDLE_WARMUP) {
      state.update('warmupComplete', true);
      console.log('[Binance] Warmup completo — 100 velas acumuladas');
    }

    tickManager.onTick({
      close:  candle.close,
      high:   candle.high,
      low:    candle.low,
      open:   candle.open,
      volume: candle.volume,
    });
  });

  ws.on('error', (err) => {
    console.error('[Binance] Error WS:', err.message);
  });

  ws.on('close', (code, reason) => {
    console.warn(`[Binance] Desconectado — code ${code}. Reconectando en 5s...`);
    ws = null;
    setTimeout(() => connect(symbol), 5000);
  });
}

function disconnect() {
  if (ws) {
    ws.removeAllListeners('close'); // evita reconexión automática
    ws.close();
    ws = null;
    console.log('[Binance] Desconectado manualmente');
  }
}

module.exports = { connect, disconnect };
