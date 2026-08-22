//#region lib/index.js
/**
 * Commander plugin, node half. Owns the settings namespace and the five
 * routes the browser engine consumes:
 *
 *   GET|POST /api/dsh-commander/config     —resolved settings / whitelisted write-back
 *   POST /api/dsh-commander/inject      { sessionId, text }     —silent briefing injection
 *   GET  /api/dsh-commander/events      ?sessionId&cursor&limit —settled tail + artifacts
 *   GET  /api/dsh-commander/fullresult  ?sessionId&baseline     —complete task output
 *   GET|POST /api/dsh-commander/registry    —durable commander set (restart-proof)
 *
 * The orchestration —roster building, protocol-block parsing, dispatching,
 * worker watching, receipt delivery —happens entirely in the browser half
 * against the client sessions runtime. This half only:
 *   1. resolves the `dsh-commander` settings namespace;
 *   2. appends a plugin-sourced user message into a live session WITHOUT
 *      opening a turn (the context-compressor checkpoint discipline) so the
 *      commander's model sees the protocol briefing on its next request;
 *   3. walks a session's own event log and projects settled assistant texts
 *      after a cursor, so parsing works regardless of which conversation the
 *      browser has staged.
 * The API key never leaves the server and no provider call is ever made here.
 */
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import fs from 'node:fs'
import path from 'node:path'

const name = 'dsh-commander-host'
const inject = ['webServer', 'settings', 'sessions']

/** Settings namespace holding the commander configuration. */
const NS = settingsNamespace('dsh-commander')
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
  panelApprovals: z.boolean().default(true),
})

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
  'panelApprovals',
])
/** Composition defaults when the settings namespace is absent. */
const DEFAULTS = {
  enabled: true,
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
  panelApprovals: true,
}

/** Reject bodies over 256 KiB before buffering. */
const MAX_BODY_BYTES = 256 * 1024
/** Hard cap for one injected briefing text (chars). */
const MAX_INJECT_CHARS = 32 * 1024

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

/** Whether the session currently has an open (in-flight) turn. */
function hasOpenTurn(session) {
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index]
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
  for (const event of session.events) {
    if (event.type === 'turn/end') {
      const kind = event.data?.reason?.kind
      lastEnd = { turn: typeof event.data?.turn === 'number' ? event.data.turn : 0, reason: typeof kind === 'string' ? kind : String(kind ?? '') }
      continue
    }
    if (event.type === 'user/message') {
      if (event.seq > cursor && event.data?.source?.kind !== 'plugin') humanMessages += 1
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
 * the settings namespace yields no object (a bare host or a namespace that has
 * not settled yet). The client merges over its own defaults anyway; this keeps
 * every route self-contained.
 * @param source - settings resolver for the commander configuration.
 * @returns the plain config object.
 */
function resolveConfig(source) {
  const resolved = source()
  return resolved !== null && typeof resolved === 'object' ? resolved : DEFAULTS
}

/**
 * Handle `/api/dsh-commander/config`. GET resolves the settings namespace
 * through the composition and returns the plain config object; POST merges a
 * whitelisted partial patch into the namespace's user layer (the browser
 * settings panel's write-back) and returns the resolved result. The client
 * merges over its own defaults anyway.
 */
async function handleConfig(req, res, source, scopeRef) {
  if (req.method === 'GET') {
    send(res, 200, { ok: true, config: resolveConfig(source) })
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route serves GET (read) and POST (write)' } })
    return
  }
  const scope = scopeRef()
  if (scope === null || scope === undefined) {
    send(res, 503, { ok: false, error: { code: 'no-scope', message: 'settings namespace not registered yet' } })
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
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value
  }
  try {
    await scope.update(clean)
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
  const config = resolveConfig(source)
  if (config.enabled !== true) {
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander settings' } })
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
      source: { kind: 'plugin', plugin: 'dsh-commander' },
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
    send(res, 200, { ok: false, error: { code: 'disabled', message: 'commander is disabled in the dsh-commander settings' } })
    return
  }
  const session = ctx.sessions.get(sessionId)
  if (session === undefined) {
    send(res, 404, { ok: false, error: { code: 'session-not-found', message: `session "${sessionId}" is not live` } })
    return
  }
  const { events, lastEnd, lastAssistantSeq, humanMessages, files, tools } = projectAssistantTail(session, cursor, limit)
  send(res, 200, { ok: true, sessionId, events, lastSeq: session.seq, lastAssistantSeq, humanMessages, lastEnd, files, tools })
}

/**
 * Handle `GET /api/dsh-commander/fullresult?sessionId=&baseline=`. Returns the
 * COMPLETE settled assistant text a task produced (everything after its
 * baseline), for the panel's 全文 viewer — the receipt only carries a
 * truncated summary. Read-only; hard-capped so a runaway worker cannot flood
 * the browser.
 */
async function handleFullResult(req, res, ctx) {
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
  let entries = readRegistry()
  if (active) {
    if (!entries.some((entry) => entry.sessionId === sessionId)) entries = [...entries, { sessionId, activatedAt: Date.now() }]
  } else {
    entries = entries.filter((entry) => entry.sessionId !== sessionId)
  }
  try {
    writeRegistry(entries)
    send(res, 200, { ok: true, active, sessionId })
  } catch (error) {
    send(res, 500, { ok: false, error: { code: 'registry-write-failed', message: String(error instanceof Error ? error.message : error) } })
  }
}

/**
 * Register the settings namespace and the routes for the browser half.
 * @param ctx - host context carrying the webServer, settings, and sessions services.
 */
function apply(ctx) {
  let source = () => DEFAULTS
  let scopeRef = () => null
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NS, SCHEMA)
    source = () => scope.get()
    scopeRef = () => scope
  })
  ctx.effect(
    () => {
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/config',
        handler: (req, res) => handleConfig(req, res, source, scopeRef),
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
        handler: (req, res) => handleFullResult(req, res, ctx),
      })
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/registry',
        handler: (req, res) => handleRegistry(req, res),
      })
    },
    'dsh-commander: routes',
  )
}
//#endregion
export { apply, inject, name };
