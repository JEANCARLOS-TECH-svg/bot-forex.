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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'panel')));

app.post('/clear-history', (req, res) => {
  shadow.clearHistory();
  res.json({ ok: true });
});

app.post('/settings', (req, res) => {
  const { capital, allowedDirection } = req.body;
  if (capital        != null) state.update('settings.capital',         Number(capital));
  if (allowedDirection)       state.update('settings.allowedDirection', allowedDirection);
  if (req.body.killSwitchLimit != null) state.update('settings.killSwitchLimit', Number(req.body.killSwitchLimit));
  if (req.body.riskProfile     != null) state.update('settings.riskProfile',     Number(req.body.riskProfile));
  res.json({ ok: true });
});

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
    settings: {
      capital:          state.get('settings.capital'),
      allowedDirection: state.get('settings.allowedDirection'),
      killSwitchLimit:  state.get('settings.killSwitchLimit'),
      riskProfile:      state.get('settings.riskProfile'),
    },
    macd:            state.get('indicators.macd'),
    ema:             { fast: state.get('indicators.emaFast'), slow: state.get('indicators.emaSlow') },
    bb:              state.get('indicators.bb'),
    stoch:           state.get('indicators.stochRSI'),
    priceHistory:    (() => { const buf = (state.get('candleBuffer') || []).slice(-120); const now = Date.now(); return buf.map((c, i) => ({ o: c.open, h: c.high, l: c.low, c: c.close, t: now - (buf.length - 1 - i) * 60000 })); })(),
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
