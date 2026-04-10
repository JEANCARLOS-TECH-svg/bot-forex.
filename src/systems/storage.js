const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = './data';

const DEFAULTS = {
  brain: { aiWeights: {}, history: [] },
  session: { consecutiveLoss: 0, pnl: 0, trades: 0, isShadowMode: true },
  settings: { killSwitchLevels: [10, 20, 30], thresholdBase: 45, maxDailyLossPips: -100 }
};

const storage = {
  save: async (filename, data) => {
    const json = JSON.stringify(data, null, 2);
    JSON.parse(json);
    await fs.writeFile(path.join(DATA_DIR, filename), json);
  },
  load: async (filename) => {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
      return JSON.parse(raw);
    } catch {
      return DEFAULTS[filename.replace('.json', '')];
    }
  },
  loadAll: async () => ({
    brain: await storage.load('brain.json'),
    session: await storage.load('session.json'),
    settings: await storage.load('settings.json')
  }),
  backup: async (filename) => {
    const timestamp = Date.now();
    const src = path.join(DATA_DIR, filename);
    const dst = path.join(DATA_DIR, `backups/${filename}.${timestamp}.bak`);
    await fs.copyFile(src, dst);
  }
};

module.exports = storage;
