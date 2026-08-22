//#region lib/index.js
/**
 * Commander plugin, node half. Owns the settings namespace and the two
 * routes the browser engine consumes:
 *
 *   GET  /api/dsh-commander/config   { config }              —resolved settings
 *   POST /api/dsh-commander/inject   { sessionId, text }     —silent briefing injection
 *   GET  /api/dsh-commander/events   ?sessionId&cursor&limit —settled assistant tail
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
})
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
 * One pass over the log: collect settled assistant texts after `cursor`
 * (oldest-first, capped), remember the LAST turn/end reason so the client can
 * tell a completed task from a failed/interrupted one without opening a window
 * in the UI, count HUMAN (non-plugin-sourced) user messages after the cursor —
 * the takeover signal: a worker a human has started driving must not get an
 * automatic receipt — and report the HIGHEST assistant seq in the whole log
 * regardless of cursor/limit, the activation-time anchor a fresh commander
 * advances its cursor to so pre-activation outputs can never be re-executed.
 * @param session - the live host session.
 * @param cursor - exclusive seq lower bound.
 * @param limit - maximum number of events returned.
 * @returns { events, lastEnd, lastAssistantSeq, humanMessages }.
 */
function projectAssistantTail(session, cursor, limit) {
  const events = []
  let lastEnd = null
  let lastAssistantSeq = 0
  let humanMessages = 0
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
    if (event.type !== 'assistant/message') continue
    if (event.seq > lastAssistantSeq) lastAssistantSeq = event.seq
    if (event.seq <= cursor) continue
    const text = assistantText(event.data?.message)
    if (text.trim() === '') continue
    if (events.length >= limit) continue
    events.push({ seq: event.seq, time: event.time, turn: typeof event.data?.turn === 'number' ? event.data.turn : 0, text })
  }
  return { events, lastEnd, lastAssistantSeq, humanMessages }
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
 * Handle `GET /api/dsh-commander/config`. Resolves the settings namespace
 * through the composition and returns the plain config object; the client
 * merges over its own defaults anyway. Non-GET verbs are rejected.
 */
async function handleConfig(req, res, source) {
  if (req.method !== 'GET') {
    send(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'this route only serves GET' } })
    return
  }
  send(res, 200, { ok: true, config: resolveConfig(source) })
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
  const { events, lastEnd, lastAssistantSeq, humanMessages } = projectAssistantTail(session, cursor, limit)
  send(res, 200, { ok: true, sessionId, events, lastSeq: session.seq, lastAssistantSeq, humanMessages, lastEnd })
}

/**
 * Register the settings namespace and the three routes for the browser half.
 * @param ctx - host context carrying the webServer, settings, and sessions services.
 */
function apply(ctx) {
  let source = () => DEFAULTS
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NS, SCHEMA)
    source = () => scope.get()
  })
  ctx.effect(
    () => {
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/dsh-commander/config',
        handler: (req, res) => handleConfig(req, res, source),
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
    },
    'dsh-commander: routes',
  )
}
//#endregion
export { apply, inject, name };
