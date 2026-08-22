// Smoke test for dsh-commander:
// 1. node --check on lib/index.js + lib/client.js
// 2. Host half: apply() registers the three routes; the config route resolves
//    the settings namespace (defaults when absent, overrides when configured);
//    the inject route appends ONE plugin-sourced user message into a live,
//    idle session and fails closed on every bad input; the events route
//    projects the settled assistant tail after a cursor plus the final
//    turn/end fact and the log-wide tail anchor.
// 3. Client bundle: the additive header.actions registration + engine boot;
//    the pure protocol/policy/roster/config helpers across every branch; the
//    full orchestration loop against a mocked fetch + sessions runtime
//    (activate -> briefing injection -> parse & dispatch to an aliased worker
//    -> settle on idle -> receipt back into the commander -> auto-created
//    worker with inherited cwd + rename); and the SSR render of the header
//    entry (inactive button, active badge + panel).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pkg = path.resolve(__dirname, '..');
const bundle = path.join(pkg, 'lib/client.js');
const hostFile = path.join(pkg, 'lib/index.js');

// The host half imports harness packages. When this checkout has no
// node_modules (fresh clone), junction the harness install's node_modules
// from $DSH_HARNESS_NODE_MODULES so the smoke test still runs against a real
// install.
const localNodeModules = path.join(pkg, 'node_modules');
const harnessModules = process.env.DSH_HARNESS_NODE_MODULES ?? 'C:/Users/cbn/.dsh/profiles/node_modules';
if (!fs.existsSync(localNodeModules) && fs.existsSync(harnessModules)) {
  fs.symlinkSync(harnessModules, localNodeModules, 'junction');
}

// --- 1. syntax ---
execFileSync(process.execPath, ['--check', bundle], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', hostFile], { stdio: 'inherit' });
console.log('OK: node --check passed (client.js + index.js)');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- 2. host route tests ---
async function hostTests() {
  const host = await import('file:///' + hostFile.replace(/\\/g, '/'));
  if (host.name !== 'dsh-commander-host') throw new Error('bad host name: ' + host.name);
  for (const service of ['webServer', 'settings', 'sessions']) {
    if (!host.inject.includes(service)) throw new Error('host missing inject: ' + service);
  }

  const registeredRoutes = [];
  const appended = [];
  const flushed = [];
  let namespaceConfig = null;
  const sessionsById = new Map();

  function makeSession(id, events) {
    return {
      id,
      events,
      get seq() { return this.events.length; },
      header: { cwd: 'D:/proj' },
      append(type, data, opts) {
        const event = { type, seq: this.events.length + 1, time: 1, data };
        appended.push({ sessionId: id, type, data, opts });
        this.events = [...this.events, event];
        return event;
      },
    };
  }

  const ctx = {
    effect(fn) { fn(); },
    inject(services, cb) {
      cb({ settings: { register: () => ({ get: () => namespaceConfig }) } });
    },
    webServer: {
      register(route) { registeredRoutes.push(route); return () => {}; },
    },
    sessions: {
      get(id) { return sessionsById.get(id); },
      flush(session) { flushed.push(session.id); return Promise.resolve(true); },
    },
  };
  host.apply(ctx);

  const routeByPath = {};
  for (const route of registeredRoutes) routeByPath[route.path] = route;
  for (const p of ['/api/dsh-commander/config', '/api/dsh-commander/inject', '/api/dsh-commander/events']) {
    if (routeByPath[p] === undefined) throw new Error('route not registered: ' + p);
    if (routeByPath[p].kind !== 'exact') throw new Error('wrong kind for ' + p + ': ' + JSON.stringify(routeByPath[p]));
  }
  console.log('OK: host registers the three routes');

  function fakeRes() {
    let status = 0;
    let body = '';
    return {
      res: {
        writeHead(s) { status = s; },
        end(b) { body = b; },
      },
      status: () => status,
      json: () => JSON.parse(body),
      body: () => body,
    };
  }

  function makeReq(method, url, payload) {
    const text = payload === undefined ? '' : (typeof payload === 'string' ? payload : JSON.stringify(payload));
    return {
      method,
      url,
      async *[Symbol.asyncIterator]() {
        if (text !== '') yield Buffer.from(text, 'utf8');
      },
    };
  }

  // --- config route ---
  let f = fakeRes();
  await routeByPath['/api/dsh-commander/config'].handler({ method: 'GET', url: '/api/dsh-commander/config' }, f.res);
  let parsed = f.json();
  if (f.status() !== 200 || parsed.ok !== true || parsed.config.enabled !== true || parsed.config.maxOutstanding !== 5 || parsed.config.pollIntervalMs !== 2000) {
    throw new Error('config defaults wrong: ' + f.body());
  }
  namespaceConfig = { enabled: false, maxOutstanding: 9 };
  f = fakeRes();
  await routeByPath['/api/dsh-commander/config'].handler({ method: 'GET', url: '/api/dsh-commander/config' }, f.res);
  parsed = f.json();
  if (parsed.config.enabled !== false || parsed.config.maxOutstanding !== 9) throw new Error('config overrides wrong: ' + f.body());
  f = fakeRes();
  await routeByPath['/api/dsh-commander/config'].handler({ method: 'POST', url: '/api/dsh-commander/config' }, f.res);
  if (f.status() !== 405 || f.json().error.code !== 'method-not-allowed') throw new Error('config 405 wrong');
  namespaceConfig = null;
  console.log('OK: host config route (defaults / overrides / 405)');

  // --- inject route ---
  const injectRoute = routeByPath['/api/dsh-commander/inject'];
  f = fakeRes();
  await injectRoute.handler(makeReq('GET', '/api/dsh-commander/inject'), f.res);
  if (f.status() !== 405) throw new Error('inject GET must 405');

  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', '{oops'), f.res);
  if (f.status() !== 400 || f.json().error.code !== 'bad-request') throw new Error('inject bad JSON wrong');

  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', { sessionId: '', text: '' }), f.res);
  if (f.status() !== 400) throw new Error('inject missing fields must 400');

  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', { sessionId: 'ghost', text: 'x' }), f.res);
  if (f.status() !== 404 || f.json().error.code !== 'session-not-found') throw new Error('inject ghost session wrong');

  sessionsById.set('busy', makeSession('busy', [{ type: 'turn/start', seq: 1, time: 1, data: { turn: 1 } }]));
  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', { sessionId: 'busy', text: 'x' }), f.res);
  if (f.status() !== 409 || f.json().error.code !== 'busy') throw new Error('inject busy wrong');

  namespaceConfig = { enabled: false };
  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', { sessionId: 'c-1', text: 'x' }), f.res);
  if (f.status() !== 200 || f.json().ok !== false || f.json().error.code !== 'disabled') throw new Error('inject disabled wrong');
  namespaceConfig = null;

  sessionsById.set('big', makeSession('big', []));
  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', { sessionId: 'big', text: 'x'.repeat(32 * 1024 + 1) }), f.res);
  if (f.status() !== 413 || f.json().error.code !== 'too-large') throw new Error('inject too-large wrong');

  sessionsById.set('c-1', makeSession('c-1', []));
  f = fakeRes();
  await injectRoute.handler(makeReq('POST', '/api/dsh-commander/inject', { sessionId: 'c-1', text: '简报内容' }), f.res);
  parsed = f.json();
  if (f.status() !== 200 || parsed.ok !== true || parsed.seq !== 1) throw new Error('inject happy wrong: ' + f.body());
  const injection = appended[appended.length - 1];
  if (injection.type !== 'user/message') throw new Error('append must be user/message');
  if (injection.opts?.surfaceOp !== 'append') throw new Error('append surfaceOp wrong');
  if (JSON.stringify(injection.data).indexOf('dsh-commander') === -1) throw new Error('append must carry plugin source');
  if (JSON.stringify(injection.data).indexOf('简报内容') === -1) throw new Error('append must carry briefing text');
  if (!flushed.includes('c-1')) throw new Error('inject must flush the session');
  console.log('OK: host inject route (validation matrix + silent checkpoint append + flush)');

  // --- events route ---
  const eventsRoute = routeByPath['/api/dsh-commander/events'];
  const logEvents = [
    { type: 'user/message', seq: 1, time: 1, data: {} },
    { type: 'assistant/chunk', seq: 2, time: 2, data: {} },
    { type: 'assistant/message', seq: 3, time: 3, data: { turn: 1, step: 0, message: { content: [{ type: 'text', text: '旧的' }] } } },
    { type: 'turn/end', seq: 4, time: 4, data: { turn: 1, reason: { kind: 'stop' } } },
    { type: 'assistant/message', seq: 5, time: 5, data: { turn: 2, step: 0, message: { content: [{ type: 'reasoning', text: '思考中' }, { type: 'text', text: '新输出A' }] } } },
    { type: 'turn/end', seq: 6, time: 6, data: { turn: 2, reason: { kind: 'error' } } },
    { type: 'user/message', seq: 7, time: 7, data: { source: { kind: 'user' }, content: [] } },
    { type: 'user/message', seq: 8, time: 8, data: { source: { kind: 'plugin', plugin: 'dsh-commander' }, content: [] } },
  ];
  sessionsById.set('log', makeSession('log', logEvents));

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events' }, f.res);
  if (f.status() !== 400) throw new Error('events missing sessionId must 400');

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=log&cursor=abc' }, f.res);
  if (f.status() !== 400) throw new Error('events bad cursor must 400');

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=log&limit=x' }, f.res);
  if (f.status() !== 400) throw new Error('events bad limit must 400');

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=ghost' }, f.res);
  if (f.status() !== 404) throw new Error('events ghost must 404');

  f = fakeRes();
  await eventsRoute.handler({ method: 'POST', url: '/api/dsh-commander/events' }, f.res);
  if (f.status() !== 405) throw new Error('events POST must 405');

  namespaceConfig = { enabled: false };
  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=log' }, f.res);
  if (f.status() !== 200 || f.json().ok !== false || f.json().error.code !== 'disabled') throw new Error('events disabled wrong');
  namespaceConfig = null;

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=log&cursor=3&limit=10' }, f.res);
  parsed = f.json();
  if (parsed.ok !== true) throw new Error('events happy failed: ' + f.body());
  if (parsed.events.length !== 1 || parsed.events[0].seq !== 5 || parsed.events[0].text !== '新输出A' || parsed.events[0].turn !== 2) {
    throw new Error('events tail projection wrong: ' + JSON.stringify(parsed.events));
  }
  if (parsed.lastSeq !== 8 || parsed.lastAssistantSeq !== 5) throw new Error('events anchors wrong: ' + JSON.stringify(parsed));
  if (parsed.lastEnd?.reason !== 'error' || parsed.lastEnd?.turn !== 2) throw new Error('events lastEnd wrong');
  // One HUMAN user message after cursor=3 (seq7); the plugin-sourced one (seq8) must not count.
  if (parsed.humanMessages !== 1) throw new Error('events humanMessages wrong: ' + parsed.humanMessages);

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=log&cursor=99' }, f.res);
  parsed = f.json();
  if (parsed.events.length !== 0 || parsed.lastAssistantSeq !== 5) throw new Error('events beyond-cursor wrong');

  f = fakeRes();
  await eventsRoute.handler({ method: 'GET', url: '/api/dsh-commander/events?sessionId=log&limit=0' }, f.res);
  parsed = f.json();
  if (parsed.events.length !== 1 || parsed.events[0].seq !== 3) throw new Error('events limit clamp wrong');
  console.log('OK: host events route (validation matrix + tail projection + anchors)');
}

// --- 3. client bundle tests ---
async function clientTests() {
  const react = require(path.join(harnessModules, 'react'));
  const jsxRuntime = require(path.join(harnessModules, 'react/jsx-runtime'));

  // localStorage mock BEFORE the bundle evaluates (boot reads persisted ids).
  const storageMap = new Map();
  global.localStorage = {
    getItem(key) { return storageMap.has(key) ? storageMap.get(key) : null; },
    setItem(key, value) { storageMap.set(key, String(value)); },
    removeItem(key) { storageMap.delete(key); },
  };

  // Fetch mock routing by URL; per-session event handlers respect the cursor
  // so repeated polls are idempotent exactly like the real host route.
  const calls = { inject: [], prompts: [], renames: [], createOpts: [], cancels: [] };
  let configPayload = { ok: true, config: { enabled: true } };
  const eventHandlers = {};

  function jsonResponse(payload) {
    return { ok: true, status: 200, json: async () => payload };
  }

  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/api/dsh-commander/config')) return jsonResponse(configPayload);
    if (u.includes('/api/dsh-commander/inject')) {
      calls.inject.push(JSON.parse(opts.body));
      return jsonResponse({ ok: true, seq: 5 });
    }
    if (u.includes('/api/dsh-commander/events')) {
      const params = new URL(u, 'http://x').searchParams;
      const sessionId = params.get('sessionId');
      const cursor = Number(params.get('cursor') || 0);
      const handler = eventHandlers[sessionId];
      if (handler === undefined) return jsonResponse({ ok: false, error: { code: 'session-not-found', message: 'no handler' } });
      return jsonResponse(handler(cursor));
    }
    throw new Error('unexpected fetch ' + u);
  };

  // Sessions runtime mock: list snapshot store + lazy bindings + create().
  const listSnapshot = {
    ids: ['c-1', 'w-1', 'w-2', 'blank', 'c-2'],
    byId: {
      'c-1': { id: 'c-1', displayTitle: '指挥官会话', title: '', cwd: 'D:/proj', running: false, completed: false, blank: false },
      'w-1': { id: 'w-1', displayTitle: 'Worker A', title: '', cwd: 'D:/proj', running: false, completed: false, blank: false },
      'w-2': { id: 'w-2', displayTitle: 'Worker B', title: '', cwd: 'D:/proj', running: false, completed: false, blank: false },
      blank: { id: 'blank', displayTitle: '空白', blank: true },
      'c-2': { id: 'c-2', displayTitle: '指挥官二号', title: '', cwd: 'D:/proj2', running: false, completed: false, blank: false },
    },
    current: 'c-1',
  };
  const faces = {};
  function addFace(id) {
    faces[id] = {
      sessionId: id,
      async prompt(content, mode) { calls.prompts.push({ id, content, mode }); return { ok: true }; },
      async rename(title) { calls.renames.push({ id, title }); return { ok: true, title, seq: 1 }; },
      async cancel() { calls.cancels.push(id); return { ok: true }; },
    };
    return faces[id];
  }
  addFace('c-1');
  addFace('w-1');
  addFace('w-2');
  const sessionsMock = {
    list: { getSnapshot: () => listSnapshot, subscribe() { return () => {}; } },
    binding(id) { return faces[id] !== undefined ? { sessionId: id, session: faces[id] } : undefined; },
    async create(opts) {
      calls.createOpts.push(opts);
      listSnapshot.ids.push('session-new');
      listSnapshot.byId['session-new'] = { id: 'session-new', displayTitle: 'session-new', running: false, blank: false };
      addFace('session-new');
      return 'session-new';
    },
    open() {},
    refresh: async () => {},
  };

  const loader = {};
  global.window = {
    __ModuleLoader__: {
      load(entry) {
        loader.id = entry.id;
        loader.exports = entry.factory((spec) => {
          if (spec === 'react') return react;
          if (spec === 'react/jsx-runtime') return jsxRuntime;
          throw new Error('unexpected require: ' + spec);
        });
      },
    },
  };
  try {
    (0, eval)(fs.readFileSync(bundle, 'utf8'));
  } finally {
    delete global.window;
  }
  if (loader.id !== 'dsh-commander') throw new Error('wrong bundle id: ' + loader.id);
  const client = loader.exports;
  if (client.inject.length !== 2 || client.inject[0] !== 'slots' || client.inject[1] !== 'sessions') {
    throw new Error('wrong client inject: ' + JSON.stringify(client.inject));
  }
  console.log('OK: client bundle loads, inject slots+sessions');

  // --- registration via apply() ---
  const entries = [];
  const injectedSeats = [];
  const ctx = {
    get(name) { return name === 'sessions' ? sessionsMock : undefined; },
    slots: {
      inject(name, factory) { injectedSeats.push(name); factory(); },
      register(opts, component) { entries.push({ opts, component }); return () => {}; },
    },
  };
  client.apply(ctx);
  if (!injectedSeats.includes('conversation.session.header.actions')) throw new Error('header seat not injected');
  const entry = entries.find((e) => e.opts.name === 'conversation.session.header.actions');
  if (entry === undefined) throw new Error('header.actions entry not registered');
  if (entry.opts.id !== 'dsh-commander' || entry.opts.priority !== 10) throw new Error('wrong header action opts: ' + JSON.stringify(entry.opts));
  if (!injectedSeats.includes('shell.overlay')) throw new Error('shell.overlay seat not injected (global indicator)');
  const overlay = entries.find((e) => e.opts.name === 'shell.overlay');
  if (overlay === undefined || overlay.opts.id !== 'dsh-commander-global') throw new Error('global indicator entry wrong: ' + JSON.stringify(overlay?.opts));
  if (client.state.booted !== true) throw new Error('engine not booted by apply()');
  console.log('OK: client registers both seats and boots the engine');

  // --- protocol parsing ---
  let blocks = client.parseDispatchBlocks('');
  if (blocks.length !== 0) throw new Error('empty text must yield no blocks');
  blocks = client.parseDispatchBlocks('普通回复，没有任务块。');
  if (blocks.length !== 0) throw new Error('plain reply must yield no blocks');
  blocks = client.parseDispatchBlocks('<dsh-dispatch target="#1" title="标题">做A</dsh-dispatch>');
  if (blocks.length !== 1 || blocks[0].target !== '#1' || blocks[0].title !== '标题' || blocks[0].task !== '做A') {
    throw new Error('single block parse wrong: ' + JSON.stringify(blocks));
  }
  blocks = client.parseDispatchBlocks('前言 <dsh-dispatch>任务B</dsh-dispatch>\n<dsh-dispatch target="#2">任务C</dsh-dispatch>');
  if (blocks.length !== 2) throw new Error('multi block count wrong');
  if (blocks[0].target !== '' || blocks[0].task !== '任务B') throw new Error('attr-less block wrong: ' + JSON.stringify(blocks[0]));
  if (blocks[1].target !== '#2') throw new Error('second block wrong');
  blocks = client.parseDispatchBlocks('<dsh-dispatch target="#1">   </dsh-dispatch>');
  if (blocks.length !== 0) throw new Error('empty task must be skipped');
  console.log('OK: parseDispatchBlocks covers every branch');

  // --- truncateText ---
  if (client.truncateText('abc', 10) !== 'abc') throw new Error('truncate within-limit wrong');
  const cut = client.truncateText('abcdef', 5);
  if (cut.length !== 5 || !cut.endsWith('…')) throw new Error('truncate over-limit wrong: ' + cut);

  // --- policy ---
  const cfg = { enabled: true, maxOutstanding: 5, maxPerMessage: 8 };
  const many = Array.from({ length: 8 }, (_, i) => ({ target: '#' + String(i), title: '', task: 't' + String(i) }));
  let verdict = client.evaluateBatch([], {}, cfg);
  if (verdict.action !== 'empty') throw new Error('empty branch wrong');
  verdict = client.evaluateBatch(many, {}, { ...cfg, enabled: false });
  if (verdict.action !== 'disabled') throw new Error('disabled branch wrong');
  verdict = client.evaluateBatch(many, { outstanding: 0, dispatchedTotal: 0 }, { ...cfg, maxOutstanding: 16 });
  if (verdict.action !== 'execute' || verdict.items.length !== 8 || verdict.dropped !== 0) throw new Error('execute-all wrong');
  verdict = client.evaluateBatch(many, { outstanding: 0, dispatchedTotal: 0 }, cfg);
  if (verdict.action !== 'execute' || verdict.items.length !== 5 || verdict.dropped !== 3) throw new Error('outstanding-room slice wrong');
  verdict = client.evaluateBatch(many, { outstanding: 0, dispatchedTotal: 0 }, { ...cfg, maxPerMessage: 3 });
  if (verdict.action !== 'execute' || verdict.items.length !== 3 || verdict.dropped !== 5) throw new Error('per-message slice wrong');
  verdict = client.evaluateBatch(many, { outstanding: 5, dispatchedTotal: 0 }, cfg);
  if (verdict.action !== 'cap' || String(verdict.reason).indexOf('并发') === -1) throw new Error('outstanding cap wrong');
  verdict = client.evaluateBatch(many, { outstanding: 0, dispatchedTotal: 50 }, cfg);
  if (verdict.action !== 'cap' || String(verdict.reason).indexOf('累计派发已达上限') === -1) throw new Error('activation cap wrong');
  console.log('OK: evaluateBatch covers every branch');

  // --- roster + briefing ---
  const rosterList = {
    ids: ['c-1', 'w-b', 'w-a', 'blank'],
    byId: {
      'c-1': { displayTitle: '指挥官' },
      'w-b': { displayTitle: 'B会话', running: true },
      'w-a': { displayTitle: 'A会话' },
      blank: { displayTitle: '空白', blank: true },
    },
  };
  const roster = client.buildRoster(rosterList, 'c-1');
  if (roster.length !== 2) throw new Error('roster must exclude commander and blanks');
  if (roster[0].alias !== '#1' || roster[0].id !== 'w-a' || roster[0].title !== 'A会话') throw new Error('roster sort/alias wrong: ' + JSON.stringify(roster));
  if (roster[1].alias !== '#2' || roster[1].running !== true) throw new Error('roster second row wrong');
  const briefing = client.briefingText(roster);
  for (const needle of ['#1 「A会话」', '<dsh-dispatch', '</dsh-dispatch>', '花名册', '自包含']) {
    if (briefing.indexOf(needle) === -1) throw new Error('briefing missing ' + needle);
  }
  console.log('OK: buildRoster + briefingText');

  // --- config normalization + loading ---
  let normalized = client.normalizeConfig({ enabled: 'yes', pollIntervalMs: 1, autoReport: false, stuckTimeoutMs: 1, autoLabelWorkers: false });
  if (normalized.enabled !== false || normalized.pollIntervalMs !== 500 || normalized.autoReport !== false || normalized.stuckTimeoutMs !== 30000 || normalized.autoLabelWorkers !== false) {
    throw new Error('normalize wrong: ' + JSON.stringify(normalized));
  }
  normalized = client.normalizeConfig({});
  if (normalized.maxOutstanding !== 5 || normalized.autoReport !== true || normalized.maxTaskChars !== 4000 || normalized.stuckTimeoutMs !== 600000 || normalized.autoLabelWorkers !== true) throw new Error('normalize defaults wrong');

  configPayload = { ok: true, config: { enabled: false, maxOutstanding: 7 } };
  let loaded = await client.loadConfig();
  if (loaded.enabled !== false || loaded.maxOutstanding !== 7 || loaded.pollIntervalMs !== 2000) throw new Error('loadConfig merge wrong: ' + JSON.stringify(loaded));
  configPayload = { ok: false };
  loaded = await client.loadConfig();
  if (loaded.enabled !== true || loaded.maxOutstanding !== 5) throw new Error('loadConfig fallback wrong');
  configPayload = { ok: true, config: { enabled: true } };
  console.log('OK: loadConfig merge + fallback, normalizeConfig clamps');

  // --- broadcast expansion ---
  const smallRoster = [{ id: 'a' }, { id: 'b' }];
  let expanded = client.expandBlocks([{ target: '#1,#2', task: 'x', title: '' }], smallRoster);
  if (expanded.length !== 2 || expanded[0].target !== '#1' || expanded[1].target !== '#2') throw new Error('comma expansion wrong: ' + JSON.stringify(expanded));
  expanded = client.expandBlocks([{ target: 'ALL', task: 'y', title: '' }], smallRoster);
  if (expanded.length !== 2 || expanded[0].target !== 'a' || expanded[1].target !== 'b') throw new Error('all expansion wrong: ' + JSON.stringify(expanded));
  expanded = client.expandBlocks([{ target: '', task: 'z', title: '' }], smallRoster);
  if (expanded.length !== 1 || expanded[0].target !== '') throw new Error('plain passthrough wrong');
  expanded = client.expandBlocks([{ target: ' #1 , ,#2 ', task: 'w', title: '' }], smallRoster);
  if (expanded.length !== 2) throw new Error('whitespace/empty-part expansion wrong: ' + JSON.stringify(expanded));
  console.log('OK: expandBlocks covers comma / all / passthrough');

  // --- engine flow A: activation ---
  let c1Events = [];
  let c1LastSeq = 100;
  let c1LastAssistantSeq = 100;
  let c1LastEnd = null;
  eventHandlers['c-1'] = (cursor) => ({
    ok: true,
    sessionId: 'c-1',
    events: c1Events.filter((e) => e.seq > cursor),
    lastSeq: c1LastSeq,
    lastAssistantSeq: c1LastAssistantSeq,
    lastEnd: c1LastEnd,
  });

  await client.activate('c-1');
  if (calls.inject.length !== 1) throw new Error('activation must inject one briefing');
  if (calls.inject[0].sessionId !== 'c-1') throw new Error('briefing sent to wrong session');
  if (calls.inject[0].text.indexOf('#2 「Worker A」') === -1) throw new Error('briefing missing roster line');
  if (calls.inject[0].text.indexOf('#3 「Worker B」') === -1 || calls.inject[0].text.indexOf('target="all"') === -1) throw new Error('briefing missing second roster line / broadcast syntax');
  let record = client.state.commanders.get('c-1');
  if (record === undefined || record.cursor !== 100) throw new Error('activation cursor wrong: ' + (record && record.cursor));
  if (record.roster.length !== 3 || record.roster[0].id !== 'c-2' || record.roster[0].alias !== '#1' || record.roster[1].id !== 'w-1' || record.roster[2].id !== 'w-2') throw new Error('activation roster wrong: ' + JSON.stringify(record.roster));
  if (!client.state.active.includes('c-1')) throw new Error('active list wrong');
  console.log('OK: activate injects the briefing and pins the cursor to the tail');

  // --- engine flow B: dispatch to an aliased worker ---
  c1Events = [{ seq: 120, time: 9, turn: 2, text: '<dsh-dispatch target="#2">做任务A</dsh-dispatch>' }];
  c1LastSeq = 130;
  c1LastAssistantSeq = 120;
  c1LastEnd = { turn: 2, reason: 'stop' };
  let w1Events = [];
  let w1LastSeq = 55;
  let w1LastAssistantSeq = 55;
  let w1LastEnd = null;
  eventHandlers['w-1'] = (cursor) => ({
    ok: true,
    sessionId: 'w-1',
    events: w1Events.filter((e) => e.seq > cursor),
    humanMessages: 0,
    lastSeq: w1LastSeq,
    lastAssistantSeq: w1LastAssistantSeq,
    lastEnd: w1LastEnd,
  });
  let w2Events = [];
  let w2LastSeq = 10;
  let w2LastAssistantSeq = 10;
  let w2LastEnd = null;
  eventHandlers['w-2'] = (cursor) => ({
    ok: true,
    sessionId: 'w-2',
    events: w2Events.filter((e) => e.seq > cursor),
    humanMessages: 0,
    lastSeq: w2LastSeq,
    lastAssistantSeq: w2LastAssistantSeq,
    lastEnd: w2LastEnd,
  });

  await client.poll();
  const taskRows = [...client.state.tasks.values()];
  if (taskRows.length !== 1) throw new Error('one task expected: ' + taskRows.length);
  const task = taskRows[0];
  if (task.status !== 'running' || task.workerId !== 'w-1' || task.workerTitle !== 'Worker A' || task.alias !== '#2') {
    throw new Error('dispatch result wrong: ' + JSON.stringify(task));
  }
  const dispatchPrompt = calls.prompts.find((p) => p.id === 'w-1');
  if (dispatchPrompt === undefined) throw new Error('worker prompt missing');
  if (dispatchPrompt.mode !== 'queue' || dispatchPrompt.content[0].text !== '做任务A') throw new Error('worker prompt payload wrong');
  if (record.cursor !== 130 || record.dispatchedTotal !== 1 || client.countOutstanding('c-1') !== 1) {
    throw new Error('engine counters wrong: ' + JSON.stringify({ cursor: record.cursor, total: record.dispatchedTotal }));
  }
  console.log('OK: poll parses the block, resolves alias #2 -> w-1, delivers the queued task');

  // --- engine flow C: settle on idle + receipt back into the commander ---
  listSnapshot.byId['w-1'].running = false;
  task.sentAt = Date.now() - 10000; // age past the settle-grace window deterministically
  w1Events = [{ seq: 60, time: 11, turn: 3, text: '干完了' }];
  w1LastSeq = 61;
  w1LastAssistantSeq = 60;
  w1LastEnd = { turn: 3, reason: 'stop' };

  await client.poll();
  if (task.status !== 'done' || task.detail.indexOf('干完了') === -1) throw new Error('settle wrong: ' + JSON.stringify(task));
  const receipts = calls.prompts.filter((p) => p.id === 'c-1');
  if (receipts.length !== 1 || receipts[0].mode !== 'queue' || receipts[0].content[0].text.indexOf('[指挥官回执') === -1 || receipts[0].content[0].text.indexOf('已完成') === -1) {
    throw new Error('receipt wrong: ' + JSON.stringify(receipts));
  }
  if (client.countOutstanding('c-1') !== 0) throw new Error('outstanding must drop to zero');
  console.log('OK: monitor settles the idle worker and feeds the receipt into the commander');

  // --- engine flow D: omitted target auto-creates a worker ---
  client.state.commanders.get('c-1').lastBatchAt = 0; // skip the batch cooldown deterministically
  c1Events = [{ seq: 140, time: 12, turn: 4, text: '<dsh-dispatch title="新窗口">做B</dsh-dispatch>' }];
  c1LastSeq = 141;
  c1LastAssistantSeq = 140;
  await client.poll();
  const createdTask = [...client.state.tasks.values()].find((t) => t.workerId === 'session-new');
  if (createdTask === undefined || createdTask.status !== 'running' || createdTask.workerTitle !== '新窗口') {
    throw new Error('auto-create wrong: ' + JSON.stringify(createdTask ?? null));
  }
  if (calls.createOpts.length !== 1 || calls.createOpts[0].cwd !== 'D:/proj') throw new Error('create opts wrong: ' + JSON.stringify(calls.createOpts));
  if (!calls.renames.some((r) => r.id === 'session-new' && r.title === '新窗口')) throw new Error('rename wrong: ' + JSON.stringify(calls.renames));
  const createdPrompt = calls.prompts.find((p) => p.id === 'session-new');
  if (createdPrompt === undefined || createdPrompt.content[0].text !== '做B') throw new Error('created-worker prompt wrong');
  console.log('OK: omitted target auto-creates a worker with inherited cwd + rename');

  // --- engine flow E: broadcast to two workers + batch roll-up summary ---
  client.state.commanders.get('c-1').lastBatchAt = 0;
  c1Events.push({ seq: 150, time: 13, turn: 5, text: '<dsh-dispatch target="#2,#3">并行做C</dsh-dispatch>' });
  c1LastSeq = 151;
  c1LastAssistantSeq = 150;
  await client.poll();
  const waveC = [...client.state.tasks.values()].filter((t) => t.excerpt === '并行做C');
  if (waveC.length !== 2 || !waveC.every((t) => t.workerId === 'w-1' || t.workerId === 'w-2')) throw new Error('broadcast dispatch wrong: ' + JSON.stringify(waveC));
  if (calls.prompts.filter((p) => (p.id === 'w-1' || p.id === 'w-2') && p.content[0].text === '并行做C').length !== 2) {
    throw new Error('broadcast must deliver the task to BOTH workers');
  }
  // Settle both workers; expect two receipts plus ONE consolidated batch report.
  for (const rowId of ['w-1', 'w-2']) listSnapshot.byId[rowId].running = false;
  for (const t of waveC) t.sentAt = Date.now() - 10000;
  // Results land AFTER the dispatch (baselines were probed at dispatch time).
  w1Events.push({ seq: 70, time: 14, turn: 4, text: 'C1结果' });
  w1LastSeq = 71;
  w1LastAssistantSeq = 70;
  w1LastEnd = { turn: 4, reason: 'stop' };
  w2Events.push({ seq: 20, time: 14, turn: 2, text: 'C2结果' });
  w2LastSeq = 21;
  w2LastAssistantSeq = 20;
  w2LastEnd = { turn: 2, reason: 'stop' };
  const promptsBeforeBatch = calls.prompts.filter((p) => p.id === 'c-1').length;
  await client.poll();
  if (!waveC.every((t) => t.status === 'done')) throw new Error('broadcast settle wrong: ' + JSON.stringify(waveC.map((t) => t.status)));
  const afterWave = calls.prompts.filter((p) => p.id === 'c-1');
  if (afterWave.length - promptsBeforeBatch !== 3) throw new Error('expected 2 receipts + 1 batch summary, got ' + (afterWave.length - promptsBeforeBatch));
  const batchReport = afterWave[afterWave.length - 1].content[0].text;
  if (!batchReport.includes('[指挥官批次汇总') || !batchReport.includes('C1结果') || !batchReport.includes('#2')) {
    throw new Error('batch summary wrong: ' + batchReport);
  }
  console.log('OK: broadcast delivers to both workers and rolls the batch up into one summary');

  // --- engine flow F: stuck flag + human takeover (NO receipt) ---
  client.state.commanders.get('c-1').lastBatchAt = 0;
  c1Events.push({ seq: 160, time: 15, turn: 6, text: '<dsh-dispatch target="#3">做D</dsh-dispatch>' });
  c1LastSeq = 161;
  c1LastAssistantSeq = 160;
  await client.poll();
  const takeoverTask = [...client.state.tasks.values()].find((t) => t.excerpt === '做D');
  if (takeoverTask === undefined || takeoverTask.status !== 'running') throw new Error('takeover setup wrong');
  // Worker asks for a permission confirmation -> panel must flag it.
  listSnapshot.byId['w-2'].pendingInteraction = { kind: 'permission' };
  await client.poll();
  if (takeoverTask.stuck !== true) throw new Error('stuck flag not set');
  // The human answers IN the worker session instead: takeover, no receipt.
  listSnapshot.byId['w-2'].pendingInteraction = null;
  listSnapshot.byId['w-2'].running = false;
  takeoverTask.sentAt = Date.now() - 10000;
  w2Events = []; // no assistant output of ours got processed before the human stepped in
  w2LastSeq = 30;
  w2LastAssistantSeq = 20;
  w2LastEnd = { turn: 3, reason: 'stop' };
  eventHandlers['w-2'] = (cursor) => ({
    ok: true,
    sessionId: 'w-2',
    events: w2Events.filter((e) => e.seq > cursor),
    humanMessages: 1,
    lastSeq: w2LastSeq,
    lastAssistantSeq: w2LastAssistantSeq,
    lastEnd: w2LastEnd,
  });
  const promptsBeforeTakeover = calls.prompts.filter((p) => p.id === 'c-1').length;
  await client.poll(); // flag flip tick
  await client.poll(); // settle tick
  if (takeoverTask.status !== 'taken-over') throw new Error('takeover status wrong: ' + takeoverTask.status);
  if (calls.prompts.filter((p) => p.id === 'c-1').length !== promptsBeforeTakeover) throw new Error('takeover must NOT inject a receipt');
  console.log('OK: stuck flag mirrors pending interactions; a human takeover suppresses the receipt');

  // --- engine flow G: manual cancel + retry ---
  client.state.commanders.get('c-1').lastBatchAt = 0;
  c1Events.push({ seq: 170, time: 16, turn: 7, text: '<dsh-dispatch target="#2">做E</dsh-dispatch>' });
  c1LastSeq = 171;
  c1LastAssistantSeq = 170;
  await client.poll();
  const cancelTaskRow = [...client.state.tasks.values()].find((t) => t.excerpt === '做E');
  await client.cancelTask(cancelTaskRow.id);
  if (!calls.cancels.includes('w-1') || cancelTaskRow.cancelRequested !== true) throw new Error('cancel flow wrong');
  listSnapshot.byId['w-1'].running = false;
  cancelTaskRow.sentAt = Date.now() - 10000;
  w1Events.push({ seq: 80, time: 17, turn: 5, text: '' });
  w1LastSeq = 81;
  w1LastEnd = { turn: 5, reason: 'aborted' };
  await client.poll();
  await client.poll();
  if (cancelTaskRow.status !== 'failed' || cancelTaskRow.detail.indexOf('已手动取消') === -1) {
    throw new Error('cancelled settle wrong: ' + JSON.stringify({ status: cancelTaskRow.status, detail: cancelTaskRow.detail }));
  }
  const promptsBeforeRetry = calls.prompts.length;
  await client.retryTask(cancelTaskRow.id);
  const retryRow = [...client.state.tasks.values()].find((t) => t.fullText === '做E' && t.id !== cancelTaskRow.id);
  if (retryRow === undefined || retryRow.workerId !== 'w-1' || retryRow.status !== 'running') throw new Error('retry task wrong: ' + JSON.stringify(retryRow ?? null));
  if (calls.prompts.length !== promptsBeforeRetry + 1 || calls.prompts[calls.prompts.length - 1].content[0].text !== '做E') throw new Error('retry prompt wrong');
  console.log('OK: cancel flags the worker turn; retry re-sends the same full text to the same worker');

  // Settle the retried task so flow H starts from an idle worker slot.
  listSnapshot.byId['w-1'].running = false;
  retryRow.sentAt = Date.now() - 10000;
  w1Events.push({ seq: 85, time: 18, turn: 6, text: 'E补跑完成' });
  w1LastSeq = 86;
  w1LastAssistantSeq = 85;
  w1LastEnd = { turn: 6, reason: 'stop' };
  await client.poll();
  if (retryRow.status !== 'done') throw new Error('retry settle wrong: ' + JSON.stringify(retryRow));

  // --- engine flow H: same-worker serialization fixes receipt attribution ---
  client.state.commanders.get('c-1').lastBatchAt = 0;
  c1Events.push({ seq: 180, time: 18, turn: 8, text: '<dsh-dispatch target="#2">先做F</dsh-dispatch><dsh-dispatch target="#2">后做G</dsh-dispatch>' });
  c1LastSeq = 181;
  c1LastAssistantSeq = 180;
  await client.poll();
  const taskF = [...client.state.tasks.values()].find((t) => t.excerpt === '先做F');
  const taskG = [...client.state.tasks.values()].find((t) => t.excerpt === '后做G');
  if (taskF === undefined || taskG === undefined) throw new Error('flow H tasks missing');
  if (taskF.status !== 'running' || taskG.status !== 'waiting' || taskG.workerId !== 'w-1') {
    throw new Error('serialization wrong: ' + JSON.stringify({ f: taskF.status, g: taskG.status, fd: taskF.detail, gd: taskG.detail, fw: taskF.workerId, gw: taskG.workerId }));
  }
  if (calls.prompts.some((p) => p.id === 'w-1' && p.content[0].text === '后做G')) throw new Error('second task must NOT send while the slot is held');
  // Settle F; its lock release must promote G with a FRESH baseline.
  taskF.sentAt = Date.now() - 10000;
  w1Events.push({ seq: 90, time: 19, turn: 9, text: 'F结果' });
  w1LastSeq = 91;
  w1LastAssistantSeq = 90;
  w1LastEnd = { turn: 9, reason: 'stop' };
  await client.poll();
  if (taskF.status !== 'done' || !taskF.detail.includes('F结果')) throw new Error('F settle wrong: ' + JSON.stringify(taskF));
  if (taskG.status !== 'running' || taskG.baseline !== 90) throw new Error('promotion wrong: ' + JSON.stringify({ s: taskG.status, b: taskG.baseline }));
  if (calls.prompts.filter((p) => p.id === 'w-1' && p.content[0].text === '后做G').length !== 1) throw new Error('G prompt missing');
  taskG.sentAt = Date.now() - 10000;
  w1Events.push({ seq: 95, time: 20, turn: 10, text: 'G结果' });
  w1LastSeq = 96;
  w1LastAssistantSeq = 95;
  w1LastEnd = { turn: 10, reason: 'stop' };
  await client.poll();
  if (taskG.status !== 'done' || !taskG.detail.includes('G结果')) throw new Error('G settle misattributed: ' + taskG.detail);
  console.log('OK: same-worker tasks serialize with fresh baselines — receipts attributed correctly');

  // --- engine flow I: cross-commander hop guard ---
  eventHandlers['c-2'] = () => ({ ok: true, sessionId: 'c-2', events: [], humanMessages: 0, lastSeq: 5, lastAssistantSeq: 5, lastEnd: null });
  await client.activate('c-2'); // roster of BOTH commanders now includes each other
  record = client.state.commanders.get('c-1');
  record.lastBatchAt = 0;
  record.commanderHops = 99; // exhaust the budget deterministically
  c1Events.push({ seq: 190, time: 21, turn: 11, text: '<dsh-dispatch target="#1">跨指挥官任务</dsh-dispatch>' });
  c1LastSeq = 191;
  c1LastAssistantSeq = 190;
  await client.poll();
  const hopTask = [...client.state.tasks.values()].find((t) => t.excerpt === '跨指挥官任务');
  if (hopTask === undefined || hopTask.status !== 'failed' || hopTask.detail.indexOf('跨指挥官派发已达上限') === -1) {
    throw new Error('hop guard wrong: ' + JSON.stringify(hopTask ?? null));
  }
  if (calls.prompts.some((p) => p.id === 'c-2')) throw new Error('hopped dispatch must not reach the other commander');
  console.log('OK: cross-commander hops are budgeted and blocked at the cap');

  // --- persistence: tasks mirrored into localStorage ---
  const storedTasks = JSON.parse(storageMap.get('dsh-commander.tasks'));
  if (!Array.isArray(storedTasks) || storedTasks.length < 5) throw new Error('tasks storage missing: ' + storedTasks.length);
  if (!storedTasks.some((t) => typeof t.fullText === 'string' && t.fullText !== '')) throw new Error('fullText not persisted');
  if (!storedTasks.some((t) => typeof t.batchId === 'string' && t.batchId !== '')) throw new Error('batchId not persisted');
  console.log('OK: task history persists to localStorage with full text + batch ids');

  // --- cleanup: stop everything so no timer keeps the process alive ---
  for (const t of client.state.tasks.values()) {
    if (t.status === 'running' || t.status === 'sending') t.status = 'done';
  }
  client.deactivate('c-2');
  client.deactivate('c-1');
  if (client.state.active.length !== 0) throw new Error('deactivate must clear the active list');
  if (client.hasOutstanding()) throw new Error('no outstanding tasks expected at cleanup');
  console.log('OK: deactivation clears the commander');

  // --- SSR: inactive button vs active badge + panel + global pill ---
  const serverRenderer = require(path.join(harnessModules, 'react-dom/server'));
  const snapshot = { sessionId: 's-9' };
  const emptyGlobalHtml = serverRenderer.renderToString(react.createElement(client.GlobalIndicator));
  if (emptyGlobalHtml !== '') throw new Error('global indicator must render nothing without active commanders');
  const inactiveHtml = serverRenderer.renderToString(react.createElement(client.HeaderCommander, {
    useSession: (sel) => sel(snapshot),
  }));
  if (inactiveHtml.indexOf('成为指挥官') === -1) throw new Error('inactive SSR must show the activation button');

  client.state.active.push('s-9');
  client.state.commanders.set('s-9', { sessionId: 's-9', cursor: 0, roster: [{ alias: '#1', id: 'w-9', title: 'W', cwd: '', running: false }], outstanding: 0, dispatchedTotal: 0, lastBatchAt: 0, error: '' });
  client.state.panelOpenFor = 's-9';
  try {
    const activeHtml = serverRenderer.renderToString(react.createElement(client.HeaderCommander, {
      useSession: (sel) => sel(snapshot),
    }));
    if (activeHtml.indexOf('data-active="true"') === -1) throw new Error('active SSR must show the accent badge');
    if (activeHtml.indexOf('指挥官面板') === -1 || activeHtml.indexOf('花名册') === -1) throw new Error('active SSR must render the panel');
    const globalHtml = serverRenderer.renderToString(react.createElement(client.GlobalIndicator));
    if (globalHtml.indexOf('data-commander-global') === -1 || globalHtml.indexOf('指挥官') === -1) throw new Error('global indicator SSR wrong: ' + globalHtml);
  } finally {
    client.state.active.pop();
    client.state.commanders.delete('s-9');
    client.state.panelOpenFor = null;
  }
  console.log('OK: client SSR renders inactive button, active badge + panel, and the global pill');
}

async function main() {
  await hostTests();
  await clientTests();
  console.log('all smoke tests passed');
}

main()
  .then(() => {
    // The engine may own a live polling interval; exit explicitly so CI never hangs.
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    // Same reason: never leave the polling interval keeping the loop alive on failure.
    process.exit(1);
  });
