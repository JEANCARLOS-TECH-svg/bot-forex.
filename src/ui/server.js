const express = require('express');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const WebSocket = require('ws');
const state   = require('../engine/state');
const shadow  = require('../systems/shadow');
const binance = require('../adapters/binance-connector');

const PORT = 3000;
let backupInterval = null;

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
  if (req.body.timeframe) {
    state.update('settings.timeframe', req.body.timeframe);
    binance.reconnect(req.body.timeframe);
  }
  if (req.body.autoBackup != null) {
    const enable = req.body.autoBackup;
    state.update('settings.autoBackup', enable);
    if (enable) {
      if (backupInterval) clearInterval(backupInterval);
      backupInterval = setInterval(() => {
        const wins = shadow.getHistory().filter(e => e.result === 'WIN');
        if (!wins.length) { console.log('[Backup] Sin wins que guardar'); return; }
        const file = path.join(__dirname, '../../data/ml-wins.json');
        let existing = [];
        try { existing = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
        const existingTs = new Set(existing.map(e => e.timestamp));
        const merged = [...existing, ...wins.filter(e => !existingTs.has(e.timestamp))];
        fs.writeFile(file, JSON.stringify(merged, null, 2), err => {
          if (err) console.error('[Backup] Error:', err.message);
          else console.log(`[Backup] ${merged.length - existing.length} wins nuevos — total acumulado: ${merged.length}`);
        });
      }, 2 * 60 * 60 * 1000);
    } else {
      if (backupInterval) { clearInterval(backupInterval); backupInterval = null; }
    }
  }
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
      timeframe:        state.get('settings.timeframe'),
      autoBackup:       state.get('settings.autoBackup'),
    },
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
