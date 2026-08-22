const fs = require('node:fs');
const path = require('node:path');
const pkg = path.resolve(__dirname, '..');
const bundle = path.join(pkg, 'lib/client.js');
const harnessModules = process.env.DSH_HARNESS_NODE_MODULES ?? 'C:/Users/cbn/.dsh/profiles/node_modules';

const storageMap = new Map();
global.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
};

global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, config: { enabled: true } }) });

const listSnapshot = {
  ids: ['c-1', 'w-1'],
  byId: {
    'c-1': { id: 'c-1', displayTitle: 'C', cwd: '/p', running: false, blank: false },
    'w-1': { id: 'w-1', displayTitle: 'W', cwd: '/p', running: false, blank: false },
  },
  current: 'c-1',
};
const faces = {};
faces['c-1'] = { sessionId: 'c-1', async prompt() { console.log('PROMPT c-1'); return { ok: true }; }, async rename() { return { ok: true }; } };
faces['w-1'] = { sessionId: 'w-1', async prompt() { console.log('PROMPT w-1'); return { ok: true }; }, async rename() { return { ok: true }; } };
const sessions = {
  list: { getSnapshot: () => listSnapshot, subscribe() { return () => {}; } },
  binding: (id) => (faces[id] ? { sessionId: id, session: faces[id] } : undefined),
  async create() { return 'n1'; },
  open() {},
};

const loader = {};
global.window = {
  __ModuleLoader__: {
    load(e) {
      loader.exports = e.factory((s) => {
        if (s === 'react') return require(path.join(harnessModules, 'react'));
        if (s === 'react/jsx-runtime') return require(path.join(harnessModules, 'react/jsx-runtime'));
        throw new Error('unexpected require ' + s);
      });
    },
  },
};
(0, eval)(fs.readFileSync(bundle, 'utf8'));
const c = loader.exports;

c.apply({
  get: (n) => (n === 'sessions' ? sessions : undefined),
  slots: {
    inject(n, f) { f(); },
    register(o, comp) { return () => {}; },
  },
});

(async () => {
  await c.activate('c-1');
  global.fetch = async (u) => {
    const u2 = String(u);
    if (u2.includes('/inject')) return { json: async () => ({ ok: true, seq: 1 }) };
    if (u2.includes('/events')) {
      const q = new URL(u2, 'http://x').searchParams;
      const sid = q.get('sessionId');
      const cur = Number(q.get('cursor') || 0);
      if (sid === 'c-1' && cur < 120) {
        return {
          json: async () => ({
            ok: true,
            events: [{ seq: 120, time: 1, turn: 1, text: '<dsh-dispatch target="#1">做任务</dsh-dispatch>' }],
            lastSeq: 130,
            lastAssistantSeq: 120,
            humanMessages: 0,
            lastEnd: { turn: 1, reason: 'stop' },
          }),
        };
      }
      return { json: async () => ({ ok: true, events: [], lastSeq: 5, lastAssistantSeq: 5, humanMessages: 0, lastEnd: null }) };
    }
    return { json: async () => ({ ok: true }) };
  };
  await c.poll();
  for (const t of c.state.tasks.values()) console.log('TASK', t.id, t.status, t.workerId, 'locks:', [...c.state.workerLocks]);
})();
