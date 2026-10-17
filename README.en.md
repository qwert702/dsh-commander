# dsh-commander (v2.2, harness 0.2.0-rc.2)

Multi-conversation orchestration for the DeepSeek Harness Web GUI: promote any
conversation to **commander**, and its model can dispatch tasks to other
conversations (workers) in parallel. The plugin delivers each task, watches the
workers, and feeds result summaries back into the commander as receipts — a
closed, supervised delegation loop.

> **Install**
> ```
> dsh plugin add qwert702/dsh-commander
> ```
> Restart `dsh web` and refresh the page. A 「成为指挥官」(Become commander)
> button appears in every conversation header. UI copy is Chinese-first.

> **v2.2 adapts to harness 0.2.0-rc.2.** The removed `settings.register()`
> namespace is replaced by the exported `Config` schema applied through
> `apply(ctx, config)`; session logs are read through `session.snapshotEvents()`;
> browser-side session access goes through
> `retain → await reference.ready → reference.binding.session → release()`
> (0.2.0 `binding()` only answers for retained generations); navigation uses
> `uiWorkspace.openSession()`; pending interactions are read from
> `uiSession.sessionStatus`; plugin messages carry their own `dsh-commander`
> source kind; and the roundtable route resolves an exact provider/model route
> for 0.2.0's required `GenerateOptions`.

## Highlights

- **Dispatch protocol** — the commander model emits XML-ish blocks; the plugin
  parses and executes them:

  ```xml
  <dsh-dispatch target="#1" title="optional new-session title" fork="commander"
                tid="a" depends="a" delay="10m">
    self-contained task description for the worker
  </dsh-dispatch>
  ```

  `target` accepts a roster alias (`#N`), a full session id, a comma list
  (`#1,#2`), `all`, or may be omitted to auto-create a worker (inheriting the
  commander's cwd). `fork` clones a source conversation as background context.
  `tid`/`depends` form dependency chains with fail-fast cancellation.
  `delay` defers delivery (`30s` / `10m` / `1h` / plain seconds).

- **Resilience** — per-worker send locks with FIFO queues (receipt attribution
  can never cross streams), automatic resume of interrupted turns
  (`maxContinuations`), automatic reassignment of failed tasks to the least
  loaded idle worker (`maxFailovers`, budget inherited down the chain),
  human-presence detection that by default does NOT interrupt tasks (a
  「人工在场」 badge is shown instead; opt into the legacy takeover semantics
  with `takeoverOnHuman`, which pairs with the `takeoverFollow` read-only
  watch that streams each later turn of a human-driven worker back as
  「[指挥官观察]」 progress notes), manual cancel/retry/
  force-send escape hatches, and `dedupDispatch` duplicate-task interception
  (same-text re-dispatch keeps ONE copy and notifies the commander; explicit
  single-block broadcasts are exempt).

- **Feedback loop** — receipts carry status, duration, token usage, changed
  files (projected from write/edit tool calls) and a truncated summary; a
  consolidated batch report lands once a whole wave settles. A 全文 button
  fetches the complete output on demand.

- **Persistence** — activations live in a durable host registry
  (`<dsh-home>/dsh-commander/registry.json`) plus localStorage: commanders
  survive harness restarts and port changes. Queued/dependency-gated tasks are
  reconciled after reload against what settled while the page was away. A
  failed tail-anchor probe refuses to restore rather than guessing cursor 0,
  so history can never be replayed as fresh dispatches.

- **Two settings surfaces** — dsh's native settings panel gains a 指挥官 page
  (including per-project task statistics and totals), and the conversation
  panel has an inline 设置 drawer. Both write through the plugin's own persisted
  override layer (`<dsh-home>/dsh-commander/overrides.json`) and take effect
  immediately; the profile entry's `config` stays the base layer and any later
  edit there wins over a stale panel write.

- **Safety rails** — burst caps (concurrent / per-message / per-activation /
  auto-created-per-batch), cross-commander hop budget, optional
  confirm-before-dispatch mode, one-click approve/deny for worker permission
  prompts (toggleable), desktop notifications while tabbed away, origin-checked
  mutating routes, and range-clamped config write-back.

## How it works

The host half exports `Config` (validated by the loader and handed to
`apply(ctx, config)`), injects `webServer` + `sessions` + `llm`, and registers
eight routes: config read/write-back, silent briefing injection, event-log
projection (`session.snapshotEvents()`) with human-message counting and artifact
extraction, full-result fetch, durable registry, worker mailbox, git worktree
ops, and the roundtable debate. The browser half runs a module-level engine
singleton that polls the projected tails, expands and gates parsed batches
through a pure policy function, delivers prompts through the client sessions
runtime — holding a short-lived `retain` reference per operation — watches
workers through the shared list snapshot, reads pending interactions from
`uiSession`, navigates with `uiWorkspace.openSession`, and feeds receipts back
into the commander. Three additive seats render the header badge + panel, the
global indicator pill, and the native settings section.

See [README.md](README.md) for the full Chinese documentation.
