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
import { createUserMessage, BlockAssembler } from '@deepseek-ai/dsh-llm'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'

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
  strictProjectScope: z.boolean().default(true),
  maxTasksPerWorker: z.number().default(2),
  reportTakeover: z.boolean().default(true),
  mailHintOnDispatch: z.boolean().default(true),
  worktreeBase: z.string().default(''),
  worktreeAutoCleanup: z.boolean().default(false),
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
  'strictProjectScope',
  'maxTasksPerWorker',
  'reportTakeover',
  'mailHintOnDispatch',
  'worktreeBase',
  'worktreeAutoCleanup',
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
  strictProjectScope: true,
  maxTasksPerWorker: 2,
  reportTakeover: true,
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
async function handleMail(req, res) {
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
    const boxData = readMailbox()
    for (const m of boxData.messages) {
      if (mailIds.includes(m.id)) {
        m.readBy = Array.isArray(m.readBy) ? m.readBy : []
        if (!m.readBy.includes(box)) m.readBy.push(box)
      }
    }
    try {
      writeMailbox(boxData)
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
  const boxData = readMailbox()
  const id = 'm-' + Date.now().toString(36) + '-' + String(boxData.messages.length + 1).padStart(4, '0')
  boxData.messages.push({ id, from, to, subject: subject || '(无主题)', body: mailBody, leases, at: Date.now(), readBy: [] })
  while (boxData.messages.length > MAILBOX_KEEP) boxData.messages.shift()
  try {
    writeMailbox(boxData)
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

function runGit(cwd, args) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
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
  const prev = repoLocks.get(key) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  repoLocks.set(key, next.catch(() => {}))
  return next
}

/** Handle `POST /api/dsh-commander/git` — worktree lifecycle + diff/merge ops. */
async function handleGit(req, res, source) {
  if (req.method !== 'POST') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only accepts POST' } })
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
  const config = resolveConfig(source)
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

/** Run one LLM call and return the assembled text response. */
async function llmText(ctx, options) {
  const assembler = new BlockAssembler()
  for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk)
  const finish = assembler.finish
  if (finish && finish.kind === 'error') throw new Error(finish.failure?.message ?? 'LLM call failed')
  return assembler.blocks().filter((b) => b.type === 'text').map((b) => b.text).join('')
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
  const context = typeof body?.body === 'string' ? body.body.trim() : ''
  const count = Math.min(Math.max(Number(body?.count) || 3, 3), 6)
  const provider = typeof body?.provider === 'string' && body.provider !== '' ? body.provider : undefined
  const model = typeof body?.model === 'string' && body.model !== '' ? body.model : undefined

  if (topic === '' || context === '') {
    send(res, 400, { ok: false, error: { code: 'bad-request', message: 'topic and body are required' } })
    return
  }

  try {
    // --- Round 1: independent analyses ---
    const r1Promises = []
    for (let i = 0; i < count; i++) {
      const role = ROUNDTABLE_ROLES[i % ROUNDTABLE_ROLES.length]
      r1Promises.push(
        llmText(ctx, {
          messages: [createUserMessage({
            content: [{ type: 'text', text: `[圆桌讨论 · 第一轮 · 角色视角：${role}]\n\n议题：${topic}\n\n${context}\n\n请从你的专业角度给出分析和建议方案。直接输出结论，不要寒暄。` }],
            source: { kind: 'plugin', plugin: 'dsh-commander' },
          })],
          ...(provider ? { provider } : {}),
          ...(model ? { model } : {}),
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
        messages: [createUserMessage({
          content: [{ type: 'text', text: `[圆桌讨论 · 第二轮 · 角色：${self.role}]\n\n议题：${topic}\n\n你在第一轮给出了以下分析：\n${truncate(String(self.text), 2000)}\n\n--- 其他参与者的第一轮观点 ---\n${others}\n\n请审阅以上观点：\n1. 你同意哪些？\n2. 你认为有什么遗漏或风险？\n3. 给出你修正后的最终建议。\n直接输出结论。` }],
          source: { kind: 'plugin', plugin: 'dsh-commander' },
        })],
        ...(provider ? { provider } : {}),
        ...(model ? { model } : {}),
        maxTokens: 2048,
      }).catch((error) => ({ __failed: true, role: self.role, error: String(error instanceof Error ? error.message : error) }))
    })
    const r2Results = await Promise.all(r2Promises)

    // --- Synthesize 纪要 ---
    const lines = [`[圆桌纪要 · ${topic}]`, `参与者：${r1Success.length} 人 · 两轮辩论`, '']
    for (let i = 0; i < r1Success.length; i++) {
      lines.push(`== ${r1Success[i].role} ==`)
      lines.push(truncate(String(r1Results[i] ?? ''), 600))
      if (i < r1Success.length) {
        const r2 = r2Results[i]
        if (typeof r2 === 'string' && r2.trim() !== '') lines.push(`[第二轮补充]\n${truncate(r2, 400)}`)
      }
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
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/mail',
        handler: (req, res) => handleMail(req, res),
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
export { apply, inject, name };
