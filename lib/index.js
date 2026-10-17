//#region lib/index.js
/**
 * Commander plugin, node half. Owns the plugin configuration and the eight
 * routes the browser engine consumes:
 *
 *   GET|POST /api/dsh-commander/config     —resolved config / whitelisted write-back
 *   POST /api/dsh-commander/inject      { sessionId, text }     —silent briefing injection
 *   GET  /api/dsh-commander/events      ?sessionId&cursor&limit —settled tail + artifacts
 *   GET  /api/dsh-commander/fullresult  ?sessionId&baseline     —complete task output
 *   GET|POST /api/dsh-commander/registry    —durable commander set (restart-proof)
 *   GET|POST /api/dsh-commander/mail        —worker collaboration mailbox (deliver / read / inbox)
 *   POST /api/dsh-commander/git             —worktree lifecycle + diff/merge/discard ops
 *   POST /api/dsh-commander/roundtable      —two-round debate via parallel LLM calls
 *
 * The orchestration —roster building, protocol-block parsing, dispatching,
 * worker watching, receipt delivery —happens entirely in the browser half
 * against the client sessions runtime. This half only:
 *   1. resolves the configuration (harness 0.2.0: the loader-validated `Config`
 *      export handed to `apply(ctx, config)`, plus the plugin's own persisted
 *      panel-override layer — the 0.1.x `settings.register()` namespace is gone);
 *   2. appends a plugin-sourced user message into a live session WITHOUT
 *      opening a turn (the context-compressor checkpoint discipline) so the
 *      commander's model sees the protocol briefing on its next request;
 *   3. walks a session's own event log (`session.snapshotEvents()`, the 0.2.0
 *      replacement for the removed `session.events` getter) and projects
 *      settled assistant texts after a cursor, so parsing works regardless of
 *      which conversation the browser has staged.
 * The API key never leaves the server and no provider call is ever made here.
 */
import z from '@deepseek-ai/schemastery'
import { createUserMessage, BlockAssembler } from '@deepseek-ai/dsh-llm'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const name = 'dsh-commander-host'
// 0.2.0: the `settings` service is NOT injected any more — `settings.register()`
// was removed and configuration now arrives as the loader-validated `Config`
// export through `apply(ctx, config)`. `llm` is REQUIRED since the harness
// sandbox facade: `ctx.<service>` throws a guard error for any service the
// plugin did not declare in `inject`, so the roundtable route's `ctx.llm.stream`
// died with "service llm is not injected" the moment a model emitted
// <dsh-roundtable>. `sessions` is the 0.2.0 SessionStore (get / flush /
// session.snapshotEvents()).
const inject = ['webServer', 'sessions', 'llm']

/**
 * Source kind stamped on every message this plugin produces. 0.2.0's message
 * vocabulary has NO catch-all `plugin` kind (each producer declares its own,
 * exactly like `schedule` / `goal` in the shipped composition), so the plugin
 * names itself and the host projection uses it to tell injected briefings
 * apart from human input.
 */
const PLUGIN_SOURCE_KIND = 'dsh-commander'
/** Legacy source kind written by the 0.1.x host half; still recognized as ours. */
const LEGACY_PLUGIN_SOURCE_KIND = 'plugin'
/**
 * Schema: the feature switch, the concurrency caps that keep one reply or one
 * runaway loop from flooding every conversation, the per-task text budget,
 * the receipt summary budget, the browser polling cadence, and whether
 * receipts are delivered back at all.
 */
const SCHEMA = z.object({
  enabled: z.boolean().default(true),
  maxOutstanding: z.number().default(5),
  maxPerMessage: z.number().default(8),
  maxTaskChars: z.number().default(4000),
  summaryMaxChars: z.number().default(800),
  pollIntervalMs: z.number().default(2000),
  autoReport: z.boolean().default(true),
  stuckTimeoutMs: z.number().default(600000),
  autoLabelWorkers: z.boolean().default(true),
  maxCommanderHops: z.number().default(10),
  notify: z.boolean().default(true),
  maxContinuations: z.number().default(2),
  maxFailovers: z.number().default(1),
  maxNewWorkersPerBatch: z.number().default(3),
  strictProjectScope: z.boolean().default(true),
  maxTasksPerWorker: z.number().default(2),
  reportTakeover: z.boolean().default(true),
  takeoverFollow: z.boolean().default(true),
  takeoverOnHuman: z.boolean().default(false),
  dedupDispatch: z.boolean().default(true),
  mailHintOnDispatch: z.boolean().default(true),
  worktreeBase: z.string().default(''),
  worktreeAutoCleanup: z.boolean().default(false),
  panelApprovals: z.boolean().default(true),
})

/**
 * The plugin's config schema. 0.2.0's config channel: the loader validates the
 * profile entry's `config` against this export and hands the result to
 * `apply(ctx, config)` — the removed `settings.register(NS, SCHEMA)` namespace
 * is not involved any more.
 */
const Config = SCHEMA

/** Keys the browser may write back through the settings panel (POST /config). */
const WRITABLE_KEYS = new Set([
  'maxOutstanding',
  'maxPerMessage',
  'maxTaskChars',
  'summaryMaxChars',
  'pollIntervalMs',
  'stuckTimeoutMs',
  'maxCommanderHops',
  'autoReport',
  'autoLabelWorkers',
  'notify',
  'maxContinuations',
  'maxFailovers',
  'maxNewWorkersPerBatch',
  'strictProjectScope',
  'maxTasksPerWorker',
  'reportTakeover',
  'takeoverFollow',
  'takeoverOnHuman',
  'dedupDispatch',
  'mailHintOnDispatch',
  'worktreeBase',
  'worktreeAutoCleanup',
  'panelApprovals',
  'confirmDispatch',
])
/** Composition defaults when the profile entry carries no config. */
const DEFAULTS = {  enabled: true,
  maxOutstanding: 5,
  maxPerMessage: 8,
  maxTaskChars: 4000,
  summaryMaxChars: 800,
  pollIntervalMs: 2000,
  autoReport: true,
  stuckTimeoutMs: 600000,
  autoLabelWorkers: true,
  maxCommanderHops: 10,
  notify: true,
  maxContinuations: 2,
  maxFailovers: 1,
  maxNewWorkersPerBatch: 3,
  strictProjectScope: true,
  maxTasksPerWorker: 2,
  reportTakeover: true,
  takeoverFollow: true,
  takeoverOnHuman: false,
  dedupDispatch: true,
  mailHintOnDispatch: true,
  worktreeBase: '',
  worktreeAutoCleanup: false,
  panelApprovals: true,
}

/** Reject bodies over 256 KiB before buffering. */
const MAX_BODY_BYTES = 256 * 1024
/** Hard cap for one injected briefing text (chars). */
const MAX_INJECT_CHARS = 32 * 1024

/**
 * CSRF gate for every mutating route. The web UI always sends an Origin
 * header on cross-site fetches; a foreign origin (another site driving the
 * victim's browser against a local harness) must not be able to inject
 * briefings, dispatch git operations, or rewrite settings. Same-origin
 * requests either omit Origin (curl, tests) or match the Host header.
 */
function originAllowed(req) {
  const origin = req.headers?.origin
  if (origin === undefined || origin === '' || origin === 'null') return true
  try {
    return new URL(origin).host === req.headers?.host
  } catch {
    return false
  }
}

/**
 * Serialize read-modify-write cycles on one JSON store. The registry and
 * mailbox handlers both follow read→mutate→write; two concurrent writes used
 * to interleave and the second one silently resurrect entries the first one
 * had just deleted.
 */
function withStoreLock(key, fn) {
  const prev = storeLocks.get(key) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  storeLocks.set(key, next.catch(() => {}))
  return next
}
const storeLocks = new Map()

/** Normalize a repo path into a lock key (Windows is case-insensitive). */
function repoLockKey(p) {
  const norm = path.normalize(p)
  return process.platform === 'win32' ? norm.toLowerCase() : norm
}

/**
 * Buffer the request body as UTF-8 text.
 * @param req - the incoming request stream.
 * @returns the decoded body.
 */
async function readBody(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Write a JSON response the handler fully owns.
 * @param res - the response.
 * @param status - HTTP status.
 * @param payload - JSON-serializable payload.
 */
function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

/**
 * Read one live session's event log. 0.2.0 removed the `session.events` getter;
 * the supported synchronous read is `snapshotEvents()` (immutable and cached
 * until the next append). The legacy getter is still honored first when a host
 * (or an older deployment) exposes it.
 * @param session - live SessionStore entry.
 * @returns the ordered event list (empty when the session exposes neither).
 */
function sessionEvents(session) {
  if (typeof session?.snapshotEvents === 'function') return session.snapshotEvents()
  return Array.isArray(session?.events) ? session.events : []
}

/** Whether the session currently has an open (in-flight) turn. */
function hasOpenTurn(session) {
  const events = sessionEvents(session)
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event.type === 'turn/start') return true
    if (event.type === 'turn/end') return false
  }
  return false
}

/**
 * Join the text parts of one assistant message's content blocks.
 * @param message - the `assistant/message` event payload's message field.
 * @returns the concatenated text (may be empty).
 */
function assistantText(message) {
  const content = message?.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const part of content) {
    if (part !== null && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string') {
      text += part.text
    }
  }
  return text
}

/**
 * Keep only finite numeric fields of a usage record — token accounting
 * shapes vary by adapter, so the client aggregates defensively over keys.
 * @param usage - the raw `assistant/message` usage payload.
 * @returns a plain numbers-only object, or undefined when empty/absent.
 */
function sanitizeUsage(usage) {
  if (usage === null || typeof usage !== 'object') return undefined
  const out = {}
  for (const [key, value] of Object.entries(usage)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Tool names whose arguments carry a written/edited file path. */
const FILE_TOOL_RE = /^(write|edit|str_replace_editor|multi_edit|notebook_edit)$/i

/**
 * Extract the target file path from one write/edit tool call's raw arguments.
 * The schema DSL validates `file_path`; be defensive about aliases anyway.
 */
function filePathOfToolCall(name, rawArguments) {
  if (typeof name !== 'string' || !FILE_TOOL_RE.test(name)) return null
  let args = null
  try {
    args = JSON.parse(typeof rawArguments === 'string' && rawArguments !== '' ? rawArguments : '{}')
  } catch {}
  if (args === null || typeof args !== 'object') return null
  for (const key of ['file_path', 'filePath', 'path', 'file']) {
    const value = args[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return null
}

/**
 * One pass over the log: collect settled assistant texts after `cursor`
 * (oldest-first, capped), remember the LAST turn/end reason so the client can
 * tell a completed task from a failed/interrupted one without opening a window
 * in the UI, count HUMAN (non-plugin-sourced) user messages after the cursor —
 * the takeover signal: a worker a human has started driving must not get an
 * automatic receipt — project the ARTIFACTS (unique written/edited file paths
 * plus per-tool call counts) so receipts can carry deliverables, and report
 * the HIGHEST assistant seq in the whole log regardless of cursor/limit, the
 * activation-time anchor a fresh commander advances its cursor to so
 * pre-activation outputs can never be re-executed.
 * @param session - the live host session.
 * @param cursor - exclusive seq lower bound.
 * @param limit - maximum number of events returned.
 * @returns { events, lastEnd, lastAssistantSeq, humanMessages, files, toolCounts }.
 */
function projectAssistantTail(session, cursor, limit) {
  const events = []
  let lastEnd = null
  let lastAssistantSeq = 0
  let humanMessages = 0
  const filePaths = []
  const pathSeen = new Set()
  const FILE_CAP = 20
  const toolCounts = new Map()
  for (const event of sessionEvents(session)) {
    if (event.type === 'turn/end') {
      const kind = event.data?.reason?.kind
      lastEnd = { turn: typeof event.data?.turn === 'number' ? event.data.turn : 0, reason: typeof kind === 'string' ? kind : String(kind ?? '') }
      continue
    }
    if (event.type === 'user/message') {
      // Our own briefing injections are NOT human input: 0.2.0 has no catch-all
      // `plugin` source kind, so the plugin stamps its own (legacy writes from
      // the 0.1.x half carry `kind: 'plugin'` and stay recognized).
      const kind = event.data?.source?.kind
      const ours = kind === PLUGIN_SOURCE_KIND || kind === LEGACY_PLUGIN_SOURCE_KIND
      if (event.seq > cursor && !ours) humanMessages += 1
      continue
    }
    if (event.type === 'tool/call' && event.seq > cursor) {
      const name = typeof event.data?.name === 'string' ? event.data.name : ''
      if (name !== '') toolCounts.set(name, (toolCounts.get(name) | 0) + 1)
      if (filePaths.length < FILE_CAP) {
        const p = filePathOfToolCall(event.data?.name, event.data?.arguments)
        if (p !== null && !pathSeen.has(p)) {
          pathSeen.add(p)
          filePaths.push({ path: p, tool: name })
        }
      }
      continue
    }
    if (event.type !== 'assistant/message') continue
    if (event.seq > lastAssistantSeq) lastAssistantSeq = event.seq
    if (event.seq <= cursor) continue
    const text = assistantText(event.data?.message)
    if (text.trim() === '' && event.data?.usage === undefined) continue
    if (events.length >= limit) continue
    events.push({ seq: event.seq, time: event.time, turn: typeof event.data?.turn === 'number' ? event.data.turn : 0, text, usage: sanitizeUsage(event.data?.usage) })
  }
  const tools = [...toolCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  return { events, lastEnd, lastAssistantSeq, humanMessages, files: filePaths, tools }
}

/**
 * Resolve the configuration, falling back to the composition defaults when
 * the resolved config yields no object (a bare host or an unreadable layer).
 * The client merges over its own defaults anyway; this keeps
 * every route self-contained.
 * @param source - config resolver for the commander configuration (defaults ⊕ profile ⊕ 面板覆盖层).
 * @returns the plain config object.
 */
function resolveConfig(source) {
  const resolved = source()
  return resolved !== null && typeof resolved === 'object' ? resolved : DEFAULTS
}

/** File holding the panel's config overrides, beside the durable registry. */
const OVERRIDE_FILE = 'overrides.json'
/** Keys of one stored override entry: the panel value and the profile base it replaced. */
const OVERRIDE_VALUE_KEY = 'value'
const OVERRIDE_BASE_KEY = 'base'

/** Config keys that must never be taken from a JSON file (prototype-safety). */
const UNSAFE_CONFIG_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Read the plugin's own override layer (`<dsh-home>/dsh-commander/overrides.json`).
 * Entries are `{ value, base? }`: `value` is what the settings panel saved and
 * `base` is the profile-config value at write time — the fingerprint that lets
 * a later `cordis.patch.yml` edit win over a stale panel write.
 * @returns the raw layer ({} when absent or unreadable).
 */
function readConfigOverrides() {
  try {
    const raw = JSON.parse(fs.readFileSync(dshHomePath('dsh-commander', OVERRIDE_FILE), 'utf8'))
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const layer = Object.create(null)
    for (const [key, entry] of Object.entries(raw)) {
      if (UNSAFE_CONFIG_KEYS.has(key)) continue
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue
      const value = entry[OVERRIDE_VALUE_KEY]
      if (typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'string') continue
      layer[key] = Object.prototype.hasOwnProperty.call(entry, OVERRIDE_BASE_KEY)
        ? { value, base: entry[OVERRIDE_BASE_KEY] }
        : { value }
    }
    return layer
  } catch {
    return {}
  }
}

/**
 * Persist the override layer atomically (temp file + rename), best-effort: a
 * read-only home must not break the running engine — the panel just loses
 * restart persistence, loudly in the log.
 * @param layer - the override entries keyed by config key.
 */
function writeConfigOverrides(layer) {
  try {
    const dir = dshHomePath('dsh-commander')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, OVERRIDE_FILE)
    const tmp = file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(layer, null, 2), 'utf8')
    fs.renameSync(tmp, file)
  } catch (error) {
    console.warn('[dsh-commander] 覆盖层配置写入失败（本次运行仍然生效）：', String(error instanceof Error ? error.message : error))
  }
}

/**
 * Keep only the override entries whose recorded profile base still matches —
 * an edited `cordis.patch.yml` is the sanctioned configuration channel, so a
 * profile change always wins over a stale panel write.
 * @param layer - raw override entries.
 * @param profile - the loader-applied profile config for this entry.
 * @returns the applicable values, without their bookkeeping fields.
 */
function applyOverrideLayer(layer, profile) {
  const values = Object.create(null)
  let dropped = 0
  for (const [key, entry] of Object.entries(layer)) {
    if (UNSAFE_CONFIG_KEYS.has(key)) continue
    const base = Object.prototype.hasOwnProperty.call(entry, OVERRIDE_BASE_KEY) ? entry[OVERRIDE_BASE_KEY] : undefined
    if (!Object.is(base, profile[key])) {
      dropped += 1
      continue
    }
    values[key] = entry[OVERRIDE_VALUE_KEY]
  }
  if (dropped > 0) console.info('[dsh-commander] profile 配置已变更，忽略 ' + String(dropped) + ' 项过期面板覆盖')
  return values
}

/**
 * Build the live config store: composition defaults ⊕ profile entry config ⊕
 * the panel's own persisted override layer. The settings panel writes through
 * `patch`, which clamps into the safe ranges, records the profile base it is
 * replacing, and persists — the 0.2.0 stand-in for the removed settings
 * namespace (the profile stays the base layer, `cordis.patch.yml` edits win).
 * @param config - the profile entry's validated config (absent when mounted bare).
 * @returns { get, patch, layers } — resolver, whitelisted writer, layer snapshot.
 */
function createConfigStore(config) {
  const profile = {}
  if (config !== null && typeof config === 'object') {
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') profile[key] = value
    }
  }
  const layer = readConfigOverrides()
  let values = applyOverrideLayer(layer, profile)
  const get = () => ({ ...DEFAULTS, ...profile, ...values })
  const patch = async (clean) => {
    for (const [key, value] of Object.entries(clean)) {
      layer[key] = Object.prototype.hasOwnProperty.call(profile, key) ? { value, base: profile[key] } : { value }
    }
    values = applyOverrideLayer(layer, profile)
    writeConfigOverrides(layer)
    return get()
  }
  const layers = () => ({ profile: { ...profile }, overrides: { ...values } })
  return { get, patch, layers }
}

/**
 * Clamp one writable numeric setting into the same safe range the browser
 * half's normalizeConfig enforces, so a bad write-back (or a rogue client)
 * cannot park the engine with e.g. pollIntervalMs=0.
 */
const SETTING_RANGES = {
  maxOutstanding: [1, 32],
  maxPerMessage: [1, 32],
  maxTaskChars: [50, 100000],
  summaryMaxChars: [40, 20000],
  pollIntervalMs: [500, 60000],
  stuckTimeoutMs: [30000, 3600000],
  maxCommanderHops: [1, 100],
  maxContinuations: [0, 5],
  maxFailovers: [0, 3],
  maxNewWorkersPerBatch: [0, 16],
  maxTasksPerWorker: [0, 32],
}

function clampSetting(key, value) {
  const range = SETTING_RANGES[key]
  if (range === undefined) return value
  return Math.min(Math.max(Math.floor(value), range[0]), range[1])
}

/**
 * Handle `/api/dsh-commander/config`. GET resolves the effective configuration
 * (composition defaults ⊕ profile entry config ⊕ persisted panel overrides) and
 * returns it; POST merges a whitelisted, range-clamped partial patch into the
 * plugin's own override layer (the browser settings panel's write-back) and
 * returns the resolved result. The client merges over its own defaults anyway.
 */
async function handleConfig(req, res, source, storeRef) {
  if (req.method === 'GET') {
    send(res, 200, { ok: true, config: resolveConfig(source) })
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route serves GET (read) and POST (write)' } })
    return
  }
  if (!originAllowed(req)) {
    send(res, 403, { ok: false, error: { code: 'cross-origin', message: 'cross-origin writes are not allowed' } })
    return
  }
  const store = storeRef()
  if (store === null || store === undefined) {
    send(res, 503, { ok: false, error: { code: 'no-scope', message: 'config store is not ready yet' } })
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
    return
  }
  const patch = body?.patch !== null && typeof body?.patch === 'object' ? body.patch : null
  if (patch === null) {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'patch object is required' } })
    return
  }
  const clean = {}
  for (const [key, value] of Object.entries(patch)) {
    if (!WRITABLE_KEYS.has(key)) continue
    if (typeof value === 'boolean') clean[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = clampSetting(key, value)
    else if (typeof value === 'string' && key === 'worktreeBase') clean[key] = value.trim()
  }
  try {
    await store.patch(clean)
    send(res, 200, { ok: true, config: resolveConfig(source) })
  } catch (error) {
    send(res, 500, {
      ok: false,
      error: { code: 'update-failed', message: String(error instanceof Error ? error.message : error) },
    })
  }
}

/**
 * Handle `POST /api/dsh-commander/inject`. Body `{ sessionId, text }`: append
 * the text as ONE plugin-sourced user message (no turn is opened —the model
 * simply sees it as established background on its next request) and flush.
 * Fails closed on: disabled plugin, unknown session, open turn, empty/oversized text.
 */
async function handleInject(req, res, ctx, source) {
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only accepts POST' } })
    return
  }
  if (!originAllowed(req)) {
    send(res, 403, { ok: false, error: { code: 'cross-origin', message: 'cross-origin writes are not allowed' } })
    return
  }
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander config' } })
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
    return
  }
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const text = typeof body?.text === 'string' ? body.text : ''
  if (sessionId === '' || text.trim() === '') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'sessionId and non-empty text are required' } })
    return
  }
  if (text.length > MAX_INJECT_CHARS) {
    send(res, 413, { ok: false, error: { code: 'too-large', message: `text exceeds ${MAX_INJECT_CHARS} chars` } })
    return
  }
  const session = ctx.sessions.get(sessionId)
  if (session === undefined) {
    send(res, 404, { ok: false, error: { code: 'session-not-found', message: `session "${sessionId}" is not live` } })
    return
  }
  if (hasOpenTurn(session)) {
    send(res, 409, { ok: false, error: { code: 'busy', message: 'the session has an open turn; wait for it to settle before injecting the briefing' } })
    return
  }
  try {
    const message = createUserMessage({
      content: [{ type: 'text', text }],
      source: { kind: PLUGIN_SOURCE_KIND },
    })
    const event = session.append('user/message', message, { surfaceOp: 'append' })
    await ctx.sessions.flush(session)
    send(res, 200, { ok: true, seq: event.seq })
  } catch (error) {
    send(res, 500, {
      ok: false,
      error: { code: 'inject-failed', message: String(error instanceof Error ? error.message : error) },
    })
  }
}

/**
 * Handle `GET /api/dsh-commander/events?sessionId=&cursor=&limit=`. Projects
 * the settled assistant tail plus the final turn/end fact. Read-only: never
 * mutates the session.
 */
async function handleEvents(req, res, ctx, source) {
  if (req.method !== 'GET') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only serves GET' } })
    return
  }
  const url = new URL(req.url ?? '/', 'http://local')
  const sessionId = (url.searchParams.get('sessionId') ?? '').trim()
  if (sessionId === '') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'sessionId is required' } })
    return
  }
  const rawCursor = url.searchParams.get('cursor')
  let cursor = 0
  if (rawCursor !== null && rawCursor !== '') {
    cursor = Number(rawCursor)
    if (!Number.isFinite(cursor) || cursor < 0 || !Number.isInteger(cursor)) {
      send(res, 400, { ok: false, error: { code: 'bad-request', message: 'cursor must be a non-negative integer' } })
      return
    }
  }
  const rawLimit = url.searchParams.get('limit')
  let limit = 20
  if (rawLimit !== null && rawLimit !== '') {
    limit = Number(rawLimit)
    if (!Number.isFinite(limit) || !Number.isInteger(limit)) {
      send(res, 400, { ok: false, error: { code: 'bad-request', message: 'limit must be an integer' } })
      return
    }
    limit = Math.min(Math.max(limit, 1), 100)
  }
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander config' } })
    return
  }
  const session = ctx.sessions.get(sessionId)
  if (session === undefined) {
    send(res, 404, { ok: false, error: { code: 'session-not-found', message: `session "${sessionId}" is not live` } })
    return
  }
  const { events, lastEnd, lastAssistantSeq, humanMessages, files, tools } = projectAssistantTail(session, cursor, limit)
  send(res, 200, { ok: true, sessionId, events, lastSeq: session.seq, lastAssistantSeq, humanMessages, lastEnd, files, tools, filesTruncated: files.length >= 20 })
}

/**
 * Handle `GET /api/dsh-commander/fullresult?sessionId=&baseline=`. Returns the
 * COMPLETE settled assistant text a task produced (everything after its
 * baseline), for the panel's 全文 viewer — the receipt only carries a
 * truncated summary. Read-only; hard-capped so a runaway worker cannot flood
 * the browser.
 */
async function handleFullResult(req, res, ctx, source) {
  if (req.method !== 'GET') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only serves GET' } })
    return
  }
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander config' } })
    return
  }
  const url = new URL(req.url ?? '/', 'http://local')
  const sessionId = (url.searchParams.get('sessionId') ?? '').trim()
  if (sessionId === '') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'sessionId is required' } })
    return
  }
  let baseline = 0
  const rawBaseline = url.searchParams.get('baseline')
  if (rawBaseline !== null && rawBaseline !== '') {
    baseline = Number(rawBaseline)
    if (!Number.isFinite(baseline) || baseline < 0 || !Number.isInteger(baseline)) {
      send(res, 400, { ok: false, error: { code: 'bad-request', message: 'baseline must be a non-negative integer' } })
      return
    }
  }
  const session = ctx.sessions.get(sessionId)
  if (session === undefined) {
    send(res, 404, { ok: false, error: { code: 'session-not-found', message: `session "${sessionId}" is not live` } })
    return
  }
  const { events } = projectAssistantTail(session, baseline, 400)
  const text = events.map((event) => event.text).join('\n\n')
  const HARD_CAP = 200 * 1024
  const truncated = text.length > HARD_CAP
  send(res, 200, {
    ok: true,
    sessionId,
    text: truncated ? text.slice(0, HARD_CAP) : text,
    truncated,
    segments: events.length,
  })
}

/**
 * Durable commander registry (`<dsh-home>/dsh-commander/registry.json`).
 * The browser's localStorage is origin-scoped — a harness restart that lands
 * on a different port (or a stale/unrefreshed page) silently loses it. The
 * host-side file survives restarts exactly like the session logs themselves,
 * so an activated commander STAYS one across `dsh web` restarts.
 */
function readRegistry() {
  try {
    const raw = JSON.parse(fs.readFileSync(dshHomePath('dsh-commander', 'registry.json'), 'utf8'))
    if (raw !== null && typeof raw === 'object' && Array.isArray(raw.commanders)) {
      return raw.commanders.filter((entry) => entry !== null && typeof entry === 'object' && typeof entry.sessionId === 'string' && entry.sessionId !== '')
    }
  } catch {}
  return []
}

/** Atomic-ish write: temp file + rename so a crash never leaves torn JSON. */
function writeRegistry(entries) {
  const dir = dshHomePath('dsh-commander')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'registry.json')
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, commanders: entries }, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

/**
 * Handle `/api/dsh-commander/registry`. GET lists the durable commander
 * session ids; POST `{sessionId, active}` adds/removes one and persists.
 */
async function handleRegistry(req, res) {
  if (req.method === 'GET') {
    send(res, 200, { ok: true, ids: readRegistry().map((entry) => entry.sessionId) })
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route serves GET (list) and POST (set)' } })
    return
  }
  if (!originAllowed(req)) {
    send(res, 403, { ok: false, error: { code: 'cross-origin', message: 'cross-origin writes are not allowed' } })
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
    return
  }
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  const active = body?.active
  if (sessionId === '' || typeof active !== 'boolean') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'sessionId (string) and active (boolean) are required' } })
    return
  }
  try {
    await withStoreLock('registry', async () => {
      let entries = readRegistry()
      if (active) {
        if (!entries.some((entry) => entry.sessionId === sessionId)) entries = [...entries, { sessionId, activatedAt: Date.now() }]
      } else {
        entries = entries.filter((entry) => entry.sessionId !== sessionId)
      }
      writeRegistry(entries)
    })
    send(res, 200, { ok: true, active, sessionId })
  } catch (error) {
    send(res, 500, { ok: false, error: { code: 'registry-write-failed', message: String(error instanceof Error ? error.message : error) } })
  }
}

/**
 * Worker collaboration bus (`<dsh-home>/dsh-commander/mailbox.json`).
 * Mail-like store for worker↔worker and commander↔worker messages plus
 * advisory file leases. Atomic writes mirror the registry.
 */
const MAIL_BODY_MAX = 8 * 1024
const MAIL_LEASES_MAX = 20
const MAILBOX_KEEP = 200

function readMailbox() {
  try {
    const raw = JSON.parse(fs.readFileSync(dshHomePath('dsh-commander', 'mailbox.json'), 'utf8'))
    if (raw !== null && typeof raw === 'object' && Array.isArray(raw.messages)) return raw
  } catch {}
  return { version: 1, messages: [] }
}

function writeMailbox(box) {
  const dir = dshHomePath('dsh-commander')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'mailbox.json')
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(box, null, 2), 'utf8')
  fs.renameSync(tmp, file)
}

/**
 * Handle `/api/dsh-commander/mail`.
 * GET  `?box=<sessionId>&limit=` — inbox (addressed to) + sent (from).
 * POST `{from,to[],subject,body,leases[]}` — deliver one message.
 * POST `{op:'read',box,mailIds[]}` — mark messages read by a reader.
 */
async function handleMail(req, res, source) {
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander config' } })
    return
  }
  if (req.method === 'GET') {
    const url = new URL(req.url ?? '/', 'http://local')
    const box = (url.searchParams.get('box') ?? '').trim()
    if (box === '') {
      send(res, 400, { ok: false, error: { code: 'bad-request', message: 'box is required' } })
      return
    }
    const boxData = readMailbox()
    const inbox = []
    const sent = []
    for (const m of boxData.messages) {
      if (m.from === box) sent.push(m)
      else if (Array.isArray(m.to) && m.to.includes(box)) inbox.push(m)
    }
    send(res, 200, { ok: true, inbox: inbox.reverse(), sent: sent.reverse(), unread: inbox.filter((m) => !(m.readBy ?? []).includes(box)).length })
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route serves GET (inbox) and POST (deliver/read)' } })
    return
  }
  if (!originAllowed(req)) {
    send(res, 403, { ok: false, error: { code: 'cross-origin', message: 'cross-origin writes are not allowed' } })
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
    return
  }
  if (body?.op === 'read') {
    const box = typeof body.box === 'string' ? body.box.trim() : ''
    const mailIds = Array.isArray(body.mailIds) ? body.mailIds.filter((id) => typeof id === 'string') : []
    if (box === '' || mailIds.length === 0) {
      send(res, 400, { ok: false, error: { code: 'bad-request', message: 'box and mailIds are required' } })
      return
    }
    try {
      await withStoreLock('mailbox', async () => {
        const boxData = readMailbox()
        for (const m of boxData.messages) {
          if (mailIds.includes(m.id)) {
            m.readBy = Array.isArray(m.readBy) ? m.readBy : []
            if (!m.readBy.includes(box)) m.readBy.push(box)
          }
        }
        writeMailbox(boxData)
      })
      send(res, 200, { ok: true })
    } catch (error) {
      send(res, 500, { ok: false, error: { code: 'mailbox-write-failed', message: String(error instanceof Error ? error.message : error) } })
    }
    return
  }
  const from = typeof body?.from === 'string' ? body.from.trim() : ''
  const to = Array.isArray(body?.to) ? body.to.filter((id) => typeof id === 'string' && id !== '') : []
  const subject = typeof body?.subject === 'string' ? body.subject.slice(0, 300) : ''
  const mailBody = typeof body?.body === 'string' ? body.body : ''
  const leases = Array.isArray(body?.leases) ? body.leases.filter((p) => typeof p === 'string' && p !== '').slice(0, MAIL_LEASES_MAX) : []
  if (from === '' || to.length === 0 || mailBody.trim() === '') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'from, non-empty to[] and body are required' } })
    return
  }
  if (mailBody.length > MAIL_BODY_MAX) {
    send(res, 413, { ok: false, error: { code: 'too-large', message: `body exceeds ${MAIL_BODY_MAX} bytes` } })
    return
  }
  try {
    const id = await withStoreLock('mailbox', () => {
      const boxData = readMailbox()
      // Random suffix: two messages within the same millisecond used to
      // collide on the sequential id and the second overwrote the first's
      // read tracking.
      const id = 'm-' + Date.now().toString(36) + '-' + randomBytes(3).toString('hex')
      boxData.messages.push({ id, from, to, subject: subject || '(无主题)', body: mailBody, leases, at: Date.now(), readBy: [] })
      while (boxData.messages.length > MAILBOX_KEEP) boxData.messages.shift()
      writeMailbox(boxData)
      return id
    })
    send(res, 200, { ok: true, id, to })
  } catch (error) {
    send(res, 500, { ok: false, error: { code: 'mailbox-write-failed', message: String(error instanceof Error ? error.message : error) } })
  }
}

/**
 * Git workspace assistant for isolated workers. Every operation is keyed by
 * the MAIN repository root and serialized through per-repo locks; paths are
 * only ever the ones our own engine recorded.
 */
const repoLocks = new Map()

/** Hard wall-clock cap for one git invocation — a hung worktree op must not wedge the repo lock forever. */
const GIT_TIMEOUT_MS = 120000

function runGit(cwd, args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 8 * 1024 * 1024, timeout: GIT_TIMEOUT_MS, killSignal: 'SIGKILL' }, (err, stdout, stderr) => {
      if (err) {
        const wrapped = new Error((stderr || err.message).trim())
        wrapped.gitCode = err.code
        reject(wrapped)
        return
      }
      resolve(String(stdout).trim())
    })
  })
}

function withRepoLock(key, fn) {
  const lockKey = repoLockKey(key)
  const prev = repoLocks.get(lockKey) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  repoLocks.set(lockKey, next.catch(() => {}))
  return next
}

/** Handle `POST /api/dsh-commander/git` — worktree lifecycle + diff/merge ops. */
async function handleGit(req, res, source) {
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only accepts POST' } })
    return
  }
  if (!originAllowed(req)) {
    send(res, 403, { ok: false, error: { code: 'cross-origin', message: 'cross-origin writes are not allowed' } })
    return
  }
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander config' } })
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
    return
  }
  const op = typeof body?.op === 'string' ? body.op : ''
  const mainCwd = typeof body?.mainCwd === 'string' && path.isAbsolute(body.mainCwd) ? path.normalize(body.mainCwd) : ''
  const wtPath = typeof body?.wtPath === 'string' && path.isAbsolute(body.wtPath) ? path.normalize(body.wtPath) : ''
  const branch = typeof body?.branch === 'string' ? body.branch : ''
  const baseBranch = typeof body?.baseBranch === 'string' ? body.baseBranch : ''
  const base = config.worktreeBase !== '' ? config.worktreeBase : dshHomePath('dsh-commander', 'worktrees')

  try {
    if (op === 'create-wt') {
      if (mainCwd === '') throw new Error('mainCwd is required')
      const result = await withRepoLock(mainCwd, async () => {
        const topLevel = await runGit(mainCwd, ['rev-parse', '--show-toplevel'])
        const current = await runGit(mainCwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
        const suffix = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
        const dir = path.join(base, suffix)
        const newBranch = 'wt/' + suffix
        fs.mkdirSync(base, { recursive: true })
        await runGit(topLevel, ['worktree', 'add', '-b', newBranch, dir])
        return { wtPath: dir, branch: newBranch, topLevel, baseBranch: current }
      })
      send(res, 200, { ok: true, ...result })
      return
    }
    if (op === 'diff') {
      if (wtPath === '' || baseBranch === '') throw new Error('wtPath and baseBranch are required')
      const stat = await runGit(wtPath, ['diff', '--stat', baseBranch + '...HEAD'])
      send(res, 200, { ok: true, stat })
      return
    }
    if (op === 'merge') {
      if (mainCwd === '' || branch === '' || wtPath === '') throw new Error('mainCwd, branch and wtPath are required')
      const result = await withRepoLock(mainCwd, async () => {
        try {
          await runGit(mainCwd, ['merge', '--no-ff', branch, '-m', 'dsh-commander: merge ' + branch])
          return { merged: true }
        } catch (error) {
          if ((error.message ?? '').includes('CONFLICT')) return { merged: false, conflicts: true, message: error.message }
          throw error
        }
      })
      if (!result.merged) {
        send(res, 200, { ok: false, conflicts: true, message: result.message })
        return
      }
      if (config.worktreeAutoCleanup === true) {
        try { await runGit(mainCwd, ['worktree', 'remove', '--force', wtPath]) } catch {}
        try { await runGit(mainCwd, ['branch', '-D', branch]) } catch {}
      }
      send(res, 200, { ok: true, cleanedUp: config.worktreeAutoCleanup === true })
      return
    }
    if (op === 'discard') {
      if (mainCwd === '' || wtPath === '') throw new Error('mainCwd and wtPath are required')
      await withRepoLock(mainCwd, async () => {
        try { await runGit(mainCwd, ['worktree', 'remove', '--force', wtPath]) } catch {}
        if (branch !== '') { try { await runGit(mainCwd, ['branch', '-D', branch]) } catch {} }
      })
      send(res, 200, { ok: true })
      return
    }
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'unknown op: ' + op } })
  } catch (error) {
    send(res, 500, { ok: false, error: { code: 'git-failed', message: String(error instanceof Error ? error.message : error) } })
  }
}

/**
 * Roundtable roles rotated across discussants. Each role shapes the model's
 * analysis lens without requiring tool access — pure reasoning.
 */
const ROUNDTABLE_ROLES = [
  '系统架构师，从设计模式、模块边界和技术选型角度分析',
  '测试工程师，从边界条件、风险和可测试性角度分析',
  '代码审查员，从可维护性、性能和安全角度分析',
  '产品经理，从用户体验、需求和优先级角度分析',
]

/** Context budget for one roundtable topic — N parallel calls each embed it. */
const ROUNDTABLE_CONTEXT_MAX = 32 * 1024

/** Run one LLM call and return the assembled text response (hard time cap). */
const LLM_CALL_TIMEOUT_MS = 180000

/**
 * Read the deployment's default model selection (provider + model).
 * @param ctx - host context; the service is read opportunistically (not injected).
 * @returns { provider, model } or null when the service is absent/unconfigured.
 */
function defaultModelSelection(ctx) {
  try {
    const service = typeof ctx?.get === 'function' ? ctx.get('agentDefaultModel') : undefined
    const selection = service?.currentSelection?.()
    if (selection === null || typeof selection !== 'object') return null
    const provider = typeof selection.provider === 'string' && selection.provider !== '' ? selection.provider : undefined
    const model = typeof selection.model === 'string' && selection.model !== '' ? selection.model : undefined
    if (provider === undefined || model === undefined) return null
    return { provider, model }
  } catch {
    return null
  }
}

/**
 * Resolve the exact provider/model route of one auxiliary LLM call. 0.2.0's
 * `GenerateOptions` REQUIRES both fields (the 0.1.x adapters defaulted them),
 * so an explicit request wins, then the deployment's default selection, and
 * only then the first registered provider route with its first advertised
 * model. Anything else fails closed instead of guessing a model id.
 * @param ctx - host context carrying the llm service.
 * @param provider - explicit provider from the request (optional).
 * @param model - explicit model from the request (optional).
 * @returns { provider, model } or null when no route can be resolved.
 */
async function resolveLlmRoute(ctx, provider, model) {
  if (provider !== undefined && model !== undefined) return { provider, model }
  const selection = defaultModelSelection(ctx)
  if (resolvedRouteUsable(provider, model, selection)) return { provider: provider ?? selection.provider, model: model ?? selection.model }
  try {
    const routes = typeof ctx?.llm?.listProviders === 'function' ? ctx.llm.listProviders() : []
    const target = provider !== undefined ? routes.find((row) => row?.provider === provider) : routes[0]
    if (target !== undefined && typeof target?.provider === 'string' && target.provider !== '') {
      if (model !== undefined) return { provider: target.provider, model }
      if (typeof ctx?.llm?.listModels === 'function') {
        const models = await ctx.llm.listModels(target.provider)
        const first = Array.isArray(models) ? models.find((row) => typeof row?.id === 'string' && row.id !== '') : undefined
        if (first !== undefined) return { provider: target.provider, model: first.id }
      }
    }
  } catch {}
  return null
}

/**
 * Whether the explicit request plus the default selection already pin both
 * halves of the route (avoids probing adapters at all in the common case).
 * @param provider - explicit provider, or undefined.
 * @param model - explicit model, or undefined.
 * @param selection - default selection or null.
 * @returns true when a full route is known.
 */
function resolvedRouteUsable(provider, model, selection) {
  const resolvedProvider = provider ?? selection?.provider
  const resolvedModel = model ?? selection?.model
  return typeof resolvedProvider === 'string' && resolvedProvider !== '' && typeof resolvedModel === 'string' && resolvedModel !== ''
}

/**
 * Stream one auxiliary model call and assemble its text.
 * @param ctx - host context carrying the llm service.
 * @param options - a complete GenerateOptions (provider/model/messages/maxTokens/signal).
 * @returns the joined text blocks.
 */
async function llmText(ctx, options) {
  const assembler = new BlockAssembler()
  const stream = ctx.llm.stream(options)
  // Promise.race keeps a wedged provider stream from pinning the roundtable
  // (and its HTTP response) forever; the losing stream is drained to silence.
  const textPromise = (async () => {
    for await (const chunk of stream) assembler.push(chunk)
    const finish = assembler.finish
    if (finish && finish.kind === 'error') throw new Error(finish.failure?.message ?? 'LLM call failed')
    return assembler.blocks().filter((b) => b.type === 'text').map((b) => b.text).join('')
  })()
  const timeout = new Promise((resolve, reject) => setTimeout(() => reject(new Error('LLM call timed out after ' + Math.round(LLM_CALL_TIMEOUT_MS / 1000) + 's')), LLM_CALL_TIMEOUT_MS))
  timeout.catch(() => {})
  return Promise.race([textPromise, timeout])
}

/**
 * Handle `POST /api/dsh-commander/roundtable {topic, body, count, provider?, model?}`.
 * Runs a two-round debate: N parallel independent analyses (each with a
 * different expert role), then each reviews the others' opinions. Returns
 * the synthesized 纪要 text.
 */
async function handleRoundtable(req, res, ctx, source) {
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only accepts POST' } })
    return
  }
  if (!originAllowed(req)) {
    send(res, 403, { ok: false, error: { code: 'cross-origin', message: 'cross-origin writes are not allowed' } })
    return
  }
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled' } })
    return
  }
  let body
  try {
    body = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'request body is not valid JSON' } })
    return
  }
  const topic = typeof body?.topic === 'string' ? body.topic.trim().slice(0, 300) : ''
  const context = typeof body?.body === 'string' ? body.body.trim().slice(0, ROUNDTABLE_CONTEXT_MAX) : ''
  const count = Math.min(Math.max(Number(body?.count) || 3, 3), 6)
  const provider = typeof body?.provider === 'string' && body.provider !== '' ? body.provider : undefined
  const model = typeof body?.model === 'string' && body.model !== '' ? body.model : undefined

  if (topic === '' || context === '') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'topic and body are required' } })
    return
  }

  // 0.2.0: GenerateOptions requires an exact provider/model route. Resolve it
  // ONCE per request (explicit body fields → agentDefaultModel → first
  // registered route) and fail closed when nothing usable is mounted.
  let route = null
  try {
    route = await resolveLlmRoute(ctx, provider, model)
  } catch {}
  if (route === null) {
    send(res, 503, {
      ok: false,
      error: { code: 'no-model-route', message: '圆桌讨论需要可用的模型路由：请在请求中带 provider/model，或在 harness 中配置默认模型' },
    })
    return
  }
  const routeOptions = { provider: route.provider, model: route.model }
  const callSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(LLM_CALL_TIMEOUT_MS) : undefined

  try {
    // --- Round 1: independent analyses ---
    const r1Promises = []
    for (let i = 0; i < count; i++) {
      const role = ROUNDTABLE_ROLES[i % ROUNDTABLE_ROLES.length]
      r1Promises.push(
        llmText(ctx, {
          ...routeOptions,
          messages: [createUserMessage({
            content: [{ type: 'text', text: `[圆桌讨论 · 第一轮 · 角色视角：${role}]\n\n议题：${topic}\n\n${context}\n\n请从你的专业角度给出分析和建议方案。直接输出结论，不要寒暄。` }],
            source: { kind: PLUGIN_SOURCE_KIND },
          })],
          ...(callSignal !== undefined ? { signal: callSignal } : {}),
          maxTokens: config.summaryMaxChars > 4000 ? 4096 : 2048,
        }).catch((error) => ({ __failed: true, role, error: String(error instanceof Error ? error.message : error) })),
      )
    }
    const r1Results = await Promise.all(r1Promises)
    const r1Success = []
    const r1Failed = []
    for (let i = 0; i < r1Results.length; i++) {
      const role = ROUNDTABLE_ROLES[i % ROUNDTABLE_ROLES.length]
      if (typeof r1Results[i] === 'string' && r1Results[i].trim() !== '') {
        r1Success.push({ index: i, role, text: r1Results[i] })
      } else {
        r1Failed.push({ role, detail: typeof r1Results[i] === 'object' ? r1Results[i].error : 'empty response' })
      }
    }
    if (r1Success.length === 0) {
      send(res, 502, { ok: false, error: { code: 'all-failed', message: '所有讨论员的第一轮分析均失败' } })
      return
    }

    // --- Round 2: cross-review (per-participant, self excluded) ---
    const r2Promises = r1Success.map((self) => {
      const others = r1Success
        .filter((r) => r.index !== self.index)
        .map((r) => `--- ${r.role} 的观点 ---\n${truncate(r.text, 1500)}`)
        .join('\n\n')
      return llmText(ctx, {
        ...routeOptions,
        messages: [createUserMessage({
          content: [{ type: 'text', text: `[圆桌讨论 · 第二轮 · 角色：${self.role}]\n\n议题：${topic}\n\n你在第一轮给出了以下分析：\n${truncate(String(self.text), 2000)}\n\n--- 其他参与者的第一轮观点 ---\n${others}\n\n请审阅以上观点：\n1. 你同意哪些？\n2. 你认为有什么遗漏或风险？\n3. 给出你修正后的最终建议。\n直接输出结论。` }],
          source: { kind: PLUGIN_SOURCE_KIND },
        })],
        ...(callSignal !== undefined ? { signal: callSignal } : {}),
        maxTokens: 2048,
      }).catch((error) => ({ __failed: true, role: self.role, error: String(error instanceof Error ? error.message : error) }))
    })
    const r2Results = await Promise.all(r2Promises)

    // --- Synthesize 纪要 ---
    const lines = [`[圆桌纪要 · ${topic}]`, `参与者：${r1Success.length} 人 · 两轮辩论`, '']
    for (let i = 0; i < r1Success.length; i++) {
      lines.push(`== ${r1Success[i].role} ==`)
      // Index into r1Success (compacted after failures), NOT r1Results — the
      // raw array keeps failure sentinels at their original positions, so
      // indexing it here misattributed text and printed '[object Object]'.
      lines.push(truncate(String(r1Success[i].text ?? ''), 600))
      const r2 = r2Results[i]
      if (typeof r2 === 'string' && r2.trim() !== '') lines.push(`[第二轮补充]\n${truncate(r2, 400)}`)
      lines.push('')
    }
    if (r1Failed.length > 0) lines.push(`注意：${String(r1Failed.length)} 位参与者的分析未能完成。`)
    lines.push('请基于以上讨论结果制定执行计划并派发任务。')

    send(res, 200, { ok: true, minutes: lines.join('\n'), participants: r1Success.length, failed: r1Failed.length })
  } catch (error) {
    send(res, 502, { ok: false, error: { code: 'roundtable-failed', message: String(error instanceof Error ? error.message : error) } })
  }
}

function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

/**
 * Register the routes for the browser half under the loader-applied config.
 *
 * 0.2.0 config channel: the profile entry's `config` is validated against the
 * exported `Config` schema and handed here — there is no settings namespace to
 * register (the 0.1.x `ctx.inject(['settings'])` + `settings.register()` path
 * throws on 0.2.0). Panel write-back therefore lands in the plugin's own
 * persisted override layer (see createConfigStore).
 * @param ctx - host context carrying the webServer, sessions, and llm services.
 * @param config - the profile entry's validated config (absent when mounted bare).
 */
function apply(ctx, config) {
  const store = createConfigStore(config)
  const source = () => store.get()
  const storeRef = () => store
  ctx.effect(
    () => {
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/config',
        handler: (req, res) => handleConfig(req, res, source, storeRef),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/inject',
        handler: (req, res) => handleInject(req, res, ctx, source),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/events',
        handler: (req, res) => handleEvents(req, res, ctx, source),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/fullresult',
        handler: (req, res) => handleFullResult(req, res, ctx, source),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/registry',
        handler: (req, res) => handleRegistry(req, res),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/mail',
        handler: (req, res) => handleMail(req, res, source),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/git',
        handler: (req, res) => handleGit(req, res, source),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/roundtable',
        handler: (req, res) => handleRoundtable(req, res, ctx, source),
      })
    },
    'dsh-commander: routes',
  )
}
//#endregion
export { Config, DEFAULTS, apply, inject, name, PLUGIN_SOURCE_KIND };
