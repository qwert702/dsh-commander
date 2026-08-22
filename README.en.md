# dsh-commander

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
  human-takeover detection that suppresses receipts, manual cancel/retry/
  force-send escape hatches.

- **Feedback loop** — receipts carry status, duration, token usage, changed
  files (projected from write/edit tool calls) and a truncated summary; a
  consolidated batch report lands once a whole wave settles. A 全文 button
  fetches the complete output on demand.

- **Persistence** — activations live in a durable host registry
  (`~/.dsh/dsh-commander/registry.json`) plus localStorage: commanders survive
  harness restarts and port changes. Queued/dependency-gated tasks are
  reconciled after reload against what settled while the page was away. A
  failed tail-anchor probe refuses to restore rather than guessing cursor 0,
  so history can never be replayed as fresh dispatches.

- **Two settings surfaces** — dsh's native settings panel gains a 指挥官 page
  (including per-project task statistics and totals), and the conversation
  panel has an inline 设置 drawer. Both write through to
  `~/.dsh/settings.yaml` and take effect immediately.

- **Safety rails** — burst caps (concurrent / per-message / per-activation /
  auto-created-per-batch), cross-commander hop budget, optional
  confirm-before-dispatch mode, one-click approve/deny for worker permission
  prompts (toggleable), desktop notifications while tabbed away.

## How it works

The host half registers five routes (config read/write-back, silent briefing
injection, event-log projection with human-message counting and artifact
extraction, full-result fetch, durable registry). The browser half runs a
module-level engine singleton that polls the projected tails, expands and gates
parsed batches through a pure policy function, delivers prompts via the client
sessions runtime, watches workers through the shared list snapshot, and feeds
receipts back into the commander. Three additive seats render the header badge +
panel, the global indicator pill, and the native settings section.

See [README.md](README.md) for the full Chinese documentation.
