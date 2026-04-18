const express = require('express');
const http    = require('http');
const path    = require('path');
const WebSocket = require('ws');
const state   = require('../engine/state');
const shadow  = require('../systems/shadow');

const PORT = 3000;

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'panel')));

wss.on('connection', (ws) => {
  console.log('[UI] Cliente conectado');
  ws.send(JSON.stringify(getStateSnapshot()));
  ws.on('close', () => console.log('[UI] Cliente desconectado'));
});

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function getStateSnapshot() {
  return {
    price:           state.get('price.current'),
    regime:          state.get('market.regime'),
    adx:             state.get('indicators.adx'),
    rsi:             state.get('indicators.rsi'),
    threshold:       state.get('signal.threshold'),
    consecutiveLoss: state.get('session.consecutiveLoss'),
    isShadowMode:    state.get('session.isShadowMode'),
    warmupComplete:  state.get('warmupComplete'),
    position:        state.get('openPosition'),
    statusBadge:     state.get('position.statusBadge'),
    signal:          { side: state.get('signal.side'), score: state.get('signal.score') },
    shadowStats:     shadow.getStats(),
    shadowHistory:   shadow.getHistory(),
    macd:            state.get('indicators.macd'),
    ema:             { fast: state.get('indicators.emaFast'), slow: state.get('indicators.emaSlow') },
    bb:              state.get('indicators.bb'),
    stoch:           state.get('indicators.stochRSI'),
    priceHistory:    (state.get('candleBuffer') || []).slice(-120).map(c => c.close),
  };
}

function start() {
  server.listen(PORT, () => {
    console.log(`[UI] Servidor en http://localhost:${PORT}`);
  });

  setInterval(() => {
    if (wss.clients.size > 0) {
      broadcast(getStateSnapshot());
    }
  }, 1000);
}

module.exports = { start, broadcast };
