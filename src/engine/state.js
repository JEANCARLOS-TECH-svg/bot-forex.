const EventEmitter = require('events');
const storage = require('../systems/storage');

class State extends EventEmitter {
  constructor() {
    super();
    this.data = {
      price: { current: 0, high: 0, low: 0, spread: 0 },
      indicators: { adx: 0, rsi: 0, macd: null, bb: null, ema: null, emaFast: 0, emaSlow: 0, stochRSI: null, pvtSmoothed: 0, pvtHistory: [], pvtCurrent: 0, pvtScore: 0 },
      market: { regime: 'LATERAL_EXTREMO', thresholdModifier: 5, pivot: null, symmetricConflict: false, lastCandle: null },
      signal: { score: 0, direction: null, threshold: 45, approved: false, finalScore: 0, side: 'NONE' },
      session: { consecutiveLoss: 0, pnlPips: 0, trades: 0, isShadowMode: true },
      settings: { capital: 100, allowedDirection: 'BOTH', killSwitchLimit: 5, riskProfile: 2, timeframe: '5m', autoBackup: false },
      openPosition: null,
      position: { progress: 0, statusBadge: null, lastClose: null },
      candleBuffer: [],
      warmupComplete: false
    };

    this.on('update:session.consecutiveLoss', async () => {
      await storage.save('session.json', this.data.session);
    });

    this.on('saveSession', async () => {
      await storage.save('session.json', this.data.session);
    });
  }

  async init() {
    const { session, settings, brain } = await storage.loadAll();
    this.data.session = session;
    this.data.settings = settings;
    this.data.brain = brain;
  }

  update(path, value) {
    const keys = path.split('.');
    let lastKey = keys.pop();
    let target = keys.reduce((acc, key) => acc[key], this.data);
    if (target[lastKey] !== value) {
      target[lastKey] = value;
      this.emit('update', { path, value });
      this.emit(`update:${path}`, value);
    }
  }

  get(path) {
    return path.split('.').reduce((acc, key) => acc[key], this.data);
  }
}

module.exports = new State();
