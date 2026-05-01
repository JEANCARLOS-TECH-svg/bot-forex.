const WebSocket = require('ws');
const state        = require('../engine/state');
const tickManager  = require('../engine/tick-manager');
const l2Indicators = require('../layers/l2-indicators');

const WS_BASE = 'wss://stream.binance.com:9443/ws';
const CANDLE_WARMUP  = 100;
const CANDLE_MAX     = 500;

let ws = null;
let lastTickTime = 0;
let currentSymbol = null;

async function preloadCandles(symbol, interval) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`;
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

async function connect(symbol, interval = '5m') {
  currentSymbol = symbol;
  await preloadCandles(symbol, interval);

  const url = `${WS_BASE}/${symbol.toLowerCase()}@kline_${interval}`;
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log(`[Binance] Conectado — ${symbol} @kline_${interval}`);
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const k = msg.k;
    if (!k) return;

    // Precio en tiempo real en cada tick (kline abierta o cerrada)
    state.update('price.current', parseFloat(k.c));
    lastTickTime = Date.now();

    if (!k.x) return; // solo procesar lógica completa en klines cerradas

    const candle = {
      open:   parseFloat(k.o),
      high:   parseFloat(k.h),
      low:    parseFloat(k.l),
      close:  parseFloat(k.c),
      volume: parseFloat(k.v),
      tf:     interval,
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

  const watchdog = setInterval(() => {
    if (lastTickTime > 0 && Date.now() - lastTickTime > 30000) {
      console.warn('[Binance] Watchdog: sin datos por 30s — forzando reconexión');
      clearInterval(watchdog);
      if (ws) { ws.removeAllListeners('close'); ws.terminate(); }
      ws = null;
      connect(symbol, interval);
    }
  }, 10000);

  ws.on('error', (err) => {
    console.error('[Binance] Error WS:', err.message);
  });

  ws.on('close', (code, reason) => {
    console.warn(`[Binance] Desconectado — code ${code}. Reconectando en 5s...`);
    clearInterval(watchdog);
    ws = null;
    setTimeout(() => connect(symbol, interval), 5000);
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

function reconnect(interval) {
  disconnect();
  connect(currentSymbol || 'BTCUSDT', interval);
}

module.exports = { connect, disconnect, reconnect };
