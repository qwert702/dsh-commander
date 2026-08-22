// Invariant soak test for dsh-commander (run manually: node test/soak.cjs).
// Drives many seeded-random poll cycles against the real bundle and asserts
// engine invariants after EVERY cycle:
//   - workerLocks only holds non-terminal tasks whose workerId matches
//   - every `waiting` task sits in its worker's FIFO
//   - commander cursors never move backwards
//   - terminal statuses are final
//   - task table stays bounded by TASK_HISTORY_LIMIT
const fs = require('node:fs');
const path = require('node:path');

const pkg = path.resolve(__dirname, '..');
const bundle = path.join(pkg, 'lib/client.js');
const harnessModules = process.env.DSH_HARNESS_NODE_MODULES ?? 'C:/Users/cbn/.dsh/profiles/node_modules';
const localNodeModules = path.join(pkg, 'node_modules');
if (!fs.existsSync(localNodeModules) && fs.existsSync(harnessModules)) {
  fs.symlinkSync(harnessModules, localNodeModules, 'junction');
}

const CYCLES = Number(process.env.SOAK_CYCLES ?? 60);
let seed = Number(process.env.SOAK_SEED ?? 20260823);
function rng() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const chance = (p) => rng() < p;
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const storageMap = new Map();
global.localStorage = {
  getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
  setItem(k, v) { storageMap.set(k, String(v)); },
  removeItem(k) { storageMap.delete(k); },
};

const listSnapshot = {
  ids: ['c-1', 'w-1', 'w-2', 'w-3', 'blank'],
  byId: {
    'c-1': { id: 'c-1', displayTitle: '指挥官', cwd: '/proj', running: false, blank: false },
    'w-1': { id: 'w-1', displayTitle: 'W1', cwd: '/proj/a', running: false, blank: false },
    'w-2': { id: 'w-2', displayTitle: 'W2', cwd: '/proj/b', running: false, blank: false },
    'w-3': { id: 'w-3', displayTitle: 'W3', cwd: '/proj', running: false, blank: false },
    blank: { id: 'blank', displayTitle: '空白', blank: true },
  },
  current: 'c-1',
};
const faces = {};
for (const id of ['c-1', 'w-1', 'w-2', 'w-3']) {
  faces[id] = {
    sessionId: id,
    async prompt(content) {
      if (chance(0.03)) return { ok: false, error: { code: 'flaky-reject', message: 'random rejection' } };
      return { ok: true };
    },
    async rename() { return { ok: true }; },
    async cancel() { return { ok: true }; },
  };
}

// Unified per-session event stores with monotonically growing tails.
let soakCreateCounter = 0;
const tailSeq = { 'c-1': 100, 'w-1': 40, 'w-2': 40, 'w-3': 40 };
const store = { 'c-1': [], 'w-1': [], 'w-2': [], 'w-3': [] };
let c1BlocksPending = [];
function pushC1(text) {
  tailSeq['c-1'] += 1;
  store['c-1'].push({ type: 'assistant/message', seq: tailSeq['c-1'], time: Date.now(), data: { turn: tailSeq['c-1'], step: 0, message: { content: [{ type: 'text', text }] } } });
}
const reasons = ['stop', 'stop', 'stop', 'max-tokens', 'aborted', 'error'];

global.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('/config')) return { json: async () => ({ ok: true, config: { enabled: true } }) };
  if (u.includes('/registry')) return { json: async () => ({ ok: true, ids: [] }) };
  if (u.includes('/inject')) return { json: async () => ({ ok: true, seq: ++tailSeq['c-1'] }) };
  if (u.includes('/fullresult')) return { json: async () => ({ ok: true, text: '全文内容', truncated: false, segments: 1 }) };
  if (u.includes('/events')) {
    const params = new URL(u, 'http://x').searchParams;
    const sid = params.get('sessionId');
    const cursor = Number(params.get('cursor') || 0);
    const all = store[sid] ?? [];
    const visible = all.filter((e) => e.seq > cursor && e.type === 'assistant/message')
      .map((e) => ({ seq: e.seq, time: e.time, turn: e.data.turn, text: (e.data.message.content.find((p) => p.type === 'text') || {}).text || '' }));
    const files = chance(0.25) ? [{ path: '/proj/f' + Math.floor(rng() * 9) + '.ts', tool: 'write' }] : [];
    return {
      json: async () => ({
        ok: true,
        sessionId: sid,
        events: visible.slice(0, 20),
        lastSeq: tailSeq[sid],
        lastAssistantSeq: tailSeq[sid],
        humanMessages: chance(0.05) ? 1 : 0,
        files,
        tools: [{ name: 'bash', count: 1 }],
        lastEnd: { turn: 9, reason: pick(reasons) },
      }),
    };
  }
  throw new Error('unexpected fetch ' + u);
};

const sessionsMock = {
  list: { getSnapshot: () => listSnapshot, subscribe() { return () => {}; } },
  binding(id) { return faces[id] ? { sessionId: id, session: faces[id] } : undefined; },
  async create(opts) {
    soakCreateCounter += 1;
    const id = 'new-' + String(soakCreateCounter);
    listSnapshot.ids.push(id);
    listSnapshot.byId[id] = { id, displayTitle: opts?.title || id, cwd: opts?.cwd || '/proj', running: false, blank: false };
    faces[id] = { sessionId: id, async prompt() { return { ok: true }; }, async rename() { return { ok: true }; }, async cancel() { return { ok: true }; } };
    return id;
  },
  open() {},
};

const loader = {};
global.window = {
  __ModuleLoader__: {
    load(entry) {
      loader.exports = entry.factory((spec) => {
        if (spec === 'react') return require(path.join(harnessModules, 'react'));
        if (spec === 'react/jsx-runtime') return require(path.join(harnessModules, 'react/jsx-runtime'));
        throw new Error('unexpected require ' + spec);
      });
    },
  },
};
(0, eval)(fs.readFileSync(bundle, 'utf8'));
const client = loader.exports;

client.apply({
  get(name) { return name === 'sessions' ? sessionsMock : undefined; },
  slots: { inject(n, f) { f(); }, register(o, comp) { return () => {}; } },
});

const TERMINAL = new Set(['done', 'failed', 'blocked', 'taken-over']);
const terminalSeen = new Map();
const cursorSeen = new Map();

function checkInvariants(tag) {
  let taskCount = 0;
  for (const [id, task] of client.state.tasks) {
    taskCount += 1;
    assert(taskCount <= 100, tag + ': task history exceeded limit');
    if (TERMINAL.has(task.status)) {
      if (terminalSeen.has(id)) assert(terminalSeen.get(id) === task.status, tag + ': terminal status changed ' + id);
      terminalSeen.set(id, task.status);
    }
    for (const [workerId, holder] of client.state.workerLocks) {
      if (holder === id) {
        assert(task.workerId === workerId, tag + ': lock worker mismatch ' + workerId + '->' + id);
        assert(!TERMINAL.has(task.status), tag + ': lock leak on terminal ' + id + ' status=' + task.status);
      }
    }
  }
  for (const [commanderId, record] of client.state.commanders) {
    const prev = cursorSeen.get(commanderId);
    assert(prev === undefined || record.cursor >= prev, tag + ': cursor regressed for ' + commanderId);
    cursorSeen.set(commanderId, record.cursor);
  }
}

(async () => {
  await client.activate('c-1');
  const aliases = ['#1', '#2', '#3'];
  let blockNo = 500;
  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    {
      const n = 1 + Math.floor(rng() * 3);
      const parts = [];
      for (let i = 0; i < n; i++) {
        const target = chance(0.25) ? '' : pick(aliases);
        const dep = chance(0.12) ? ' depends="chain-a"' : '';
        const tid = chance(0.15) ? ' tid="chain-a"' : '';
        blockNo += 1;
        parts.push('<dsh-dispatch target="' + target + '"' + tid + dep + '> soak 任务 ' + blockNo + '</dsh-dispatch>');
      }
      pushC1(parts.join('\n'));
    }
    for (const w of ['w-1', 'w-2', 'w-3']) {
      if (chance(0.5)) listSnapshot.byId[w].running = chance(0.5);
      if (chance(0.08)) listSnapshot.byId[w].pendingInteraction = { kind: 'approval' };
      else delete listSnapshot.byId[w].pendingInteraction;
    }
    await client.poll();
    if (process.env.SOAK_DEBUG && cycle <= 2) {
      const rec = client.state.commanders.get('c-1');
      const probeData = await client.fetchEvents('c-1', rec ? rec.cursor : 0, 5);
      console.error('DBG cycle', cycle, 'cursor=', rec && rec.cursor, 'active=', JSON.stringify(client.state.active), 'fetchOk=', probeData.ok, 'evts=', JSON.stringify((probeData.events || []).map((e) => e.text.slice(0, 40))), 'tasks=', client.state.tasks.size);
      const gatesNow = client.__gates();
      console.error('DBG queue=', JSON.stringify([...gatesNow.waitQueue.entries()].map(([w, ids]) => [w, ids.length])));
    }
    const all = [...client.state.tasks.values()];
    if (all.length > 0 && chance(0.25)) {
      const t = pick(all);
      if (t.status === 'running') await client.cancelTask(t.id).catch(() => {});
      else if (t.status === 'waiting') await client.forceDispatchWaiting(t.id).catch(() => {});
      else if (t.status === 'failed' || t.status === 'blocked') await client.retryTask(t.id).catch(() => {});
      else if ((t.status === 'done' || t.status === 'failed') && t.workerId) await client.fetchFullResult(t.id).catch(() => {});
    }
    checkInvariants('cycle ' + cycle);
  }
  // Quiesce: free every worker and drain until nothing is active (bounded).
  for (const w of ['w-1', 'w-2', 'w-3']) { listSnapshot.byId[w].running = false; delete listSnapshot.byId[w].pendingInteraction; }
  for (let i = 0; i < 15; i++) {
    for (const t of client.state.tasks.values()) {
      if (!TERMINAL.has(t.status) && t.status !== 'sending') t.sentAt = Date.now() - 60000;
    }
    await client.poll();
  }
  checkInvariants('final');
  const counts = {};
  for (const t of client.state.tasks.values()) counts[t.status] = (counts[t.status] || 0) + 1;
  console.log('SOAK OK — cycles:', CYCLES, 'final statuses:', JSON.stringify(counts));
  process.exit(0);
})().catch((error) => {
  console.error('SOAK FAILED:', error);
  process.exit(1);
});
