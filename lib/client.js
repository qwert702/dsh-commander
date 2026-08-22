window.__ModuleLoader__.load({
	id: "dsh-commander",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		//#region dsh-commander/styles.js
		// One style tag, hashed tag id, injected once per page — the same
		// mechanism the harness bundles use for CSS modules. All classes are
		// ours (dsh-cmdr- prefix); nothing depends on the harness's hashed class
		// names.
		const cssId = "@dsh-commander/HeaderCommander.module.css";
		const css = "" +
			// header badge button (inactive / active variants)
			".dsh-cmdr-badge{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg);border-radius:8px;padding:2px 10px;font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap}" +
			".dsh-cmdr-badge:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			".dsh-cmdr-badge[disabled]{opacity:.5;cursor:default}" +
			'.dsh-cmdr-badge[data-active="true"]{border-color:color-mix(in srgb,#4a9eff 55%,transparent);color:var(--dsw-alias-label-primary)}' +
			".dsh-cmdr-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#4a9eff;color:#fff;font-size:10px;line-height:1;font-weight:600}" +
			// inline confirm row while activating (mirrors context-compressor)
			".dsh-cmdr-confirm{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary)}" +
			".dsh-cmdr-act{display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg);border-radius:8px;padding:2px 8px;font-size:12px;line-height:20px;cursor:pointer}" +
			".dsh-cmdr-act:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			".dsh-cmdr-error{color:var(--dsw-alias-label-danger,var(--dsw-alias-label-secondary));font-size:12px;line-height:20px}" +
			// dropdown panel (fixed under the header, right-aligned)
			".dsh-cmdr-panel{position:fixed;top:56px;right:14px;width:360px;max-width:calc(100vw - 28px);max-height:min(72vh,620px);overflow:auto;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.14);padding:12px;z-index:60}" +
			".dsh-cmdr-phead{display:flex;align-items:center;gap:6px}" +
			".dsh-cmdr-ptitle{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}" +
			".dsh-cmdr-spacer{flex:1}" +
			".dsh-cmdr-mini{display:inline-flex;align-items:center;border:none;background:none;padding:2px 6px;border-radius:6px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary);cursor:pointer}" +
			".dsh-cmdr-mini:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			".dsh-cmdr-notice{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-danger,#c0392b)}" +
			".dsh-cmdr-sect{font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary);margin-top:2px}" +
			// task rows
			".dsh-cmdr-task{display:flex;flex-direction:column;gap:3px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 8px}" +
			".dsh-cmdr-trow{display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary)}" +
			".dsh-cmdr-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-label-caption)}" +
			'.dsh-cmdr-dot[data-status="sending"],.dsh-cmdr-dot[data-status="running"]{background:#4a9eff}' +
			'.dsh-cmdr-dot[data-status="waiting"]{background:#8a97a8}' +
			'.dsh-cmdr-dot[data-status="blocked-dep"]{background:#b8860b}' +
			'.dsh-cmdr-dot[data-status="done"]{background:#34a853}' +
			'.dsh-cmdr-dot[data-status="failed"],.dsh-cmdr-dot[data-status="blocked"]{background:var(--dsw-alias-label-danger,#c0392b)}' +
			'.dsh-cmdr-dot[data-status="taken-over"]{background:#f0a000}' +
			".dsh-cmdr-flag{flex:none;font-size:10px;line-height:16px;padding:0 5px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover);color:#b8860b}" +
			".dsh-cmdr-tname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			".dsh-cmdr-ttime{flex:none;margin-left:auto;font-size:10px;color:var(--dsw-alias-label-tertiary)}" +
			".dsh-cmdr-tex{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
			".dsh-cmdr-tdetail{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary);white-space:pre-wrap}" +
			".dsh-cmdr-empty{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary)}" +
			// roster rows
			".dsh-cmdr-rrow{display:flex;align-items:center;gap:6px;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary)}" +
			".dsh-cmdr-ralias{flex:none;font-family:var(--dsw-font-code,ui-monospace,monospace);color:var(--dsw-alias-label-primary)}" +
			".dsh-cmdr-rtitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			".dsh-cmdr-rdot{flex:none;margin-left:auto;width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-border-l2)}" +
			'.dsh-cmdr-rdot[data-running="true"]{background:#34a853}' +
			".dsh-cmdr-foot{font-size:10px;line-height:1.6;color:var(--dsw-alias-label-tertiary);border-top:1px solid var(--dsw-alias-border-l2);padding-top:6px}" +
			// global indicator pill (shell.overlay): visible from any conversation
			".dsh-cmdr-gpill{position:fixed;bottom:14px;right:14px;display:flex;align-items:center;gap:6px;background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,.12);padding:4px 8px;z-index:55}" +
			".dsh-cmdr-glabel{font-size:11px;line-height:20px;color:var(--dsw-alias-label-tertiary)}" +
			".dsh-cmdr-gitem{display:inline-flex;align-items:center;gap:4px;border:none;background:var(--dsw-alias-interactive-bg);border-radius:12px;padding:2px 9px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-primary);cursor:pointer;max-width:180px}" +
			".dsh-cmdr-gitem:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			".dsh-cmdr-gtitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			// manual dispatch composer + settings editor
			".dsh-cmdr-compose{display:flex;flex-direction:column;gap:4px;border:1px dashed var(--dsw-alias-border-l2);border-radius:8px;padding:6px}" +
			".dsh-cmdr-crow{display:flex;gap:4px;align-items:center}" +
			".dsh-cmdr-select,.dsh-cmdr-input{min-width:0;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-base,#fff));border-radius:6px;padding:2px 6px;font-size:11px;line-height:18px;color:var(--dsw-alias-label-primary);font-family:inherit}" +
			".dsh-cmdr-select{flex:none;width:150px}" +
			".dsh-cmdr-input{flex:1;resize:vertical}" +
			".dsh-cmdr-settings{display:flex;flex-direction:column;gap:5px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l2);padding-top:6px}" +
			".dsh-cmdr-srow{display:flex;align-items:center;gap:6px;justify-content:space-between}" +
			".dsh-cmdr-snum{width:84px;text-align:right}" +
			".dsh-cmdr-scheck{accent-color:#4a9eff}";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-commander";
			tag.dataset.pluginCss = cssId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region dsh-commander/config.js
		/**
		 * Default configuration, mirrored from the host half. Used until the
		 * config route answers, so a slow or missing host never stalls the
		 * engine.
		 */
		const CONFIG_DEFAULTS = Object.freeze({
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
		});

		function positiveInt(value, fallback) {
			const n = Number(value);
			return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
		}

		/** Like positiveInt but honors 0 as a meaningful value ("disable"). */
		function zeroAllowedInt(value, fallback, min, max) {
			const n = Math.floor(Number(value));
			if (!Number.isFinite(n)) return fallback;
			return Math.min(Math.max(n, min), max);
		}

		/**
		 * Resolve the plugin configuration from the host route, merged over the
		 * defaults so an older host still yields a complete object. Any failure
		 * falls back to the defaults.
		 * @returns the resolved configuration object.
		 */
		async function loadConfig() {
			try {
				const response = await fetch("/api/dsh-commander/config", { method: "GET" });
				if (!response.ok) throw new Error("config route responded " + response.status);
				const data = await response.json();
				const section = data?.ok === true && data.config !== null && typeof data.config === "object" ? data.config : null;
				if (section === null) throw new Error("config route payload is not an object");
				return normalizeConfig({ ...CONFIG_DEFAULTS, ...section });
			} catch (error) {
				console.warn("[dsh-commander] 读取配置失败，使用默认配置：", error instanceof Error ? error.message : error);
				return { ...CONFIG_DEFAULTS };
			}
		}

		/** Clamp numeric fields into safe ranges so a bad settings edit cannot wedge the engine. */
		function normalizeConfig(section) {
			const config = { ...CONFIG_DEFAULTS, ...section };
			config.enabled = config.enabled === true;
			config.maxOutstanding = Math.min(Math.max(positiveInt(config.maxOutstanding, 5), 1), 32);
			config.maxPerMessage = Math.min(Math.max(positiveInt(config.maxPerMessage, 8), 1), 32);
			config.maxTaskChars = Math.min(Math.max(positiveInt(config.maxTaskChars, 4000), 50), 100000);
			config.summaryMaxChars = Math.min(Math.max(positiveInt(config.summaryMaxChars, 800), 40), 20000);
			config.pollIntervalMs = Math.min(Math.max(positiveInt(config.pollIntervalMs, 2000), 500), 60000);
			config.autoReport = config.autoReport !== false;
			config.stuckTimeoutMs = Math.min(Math.max(positiveInt(config.stuckTimeoutMs, 600000), 30000), 3600000);
			config.autoLabelWorkers = config.autoLabelWorkers !== false;
			config.maxCommanderHops = Math.min(Math.max(positiveInt(config.maxCommanderHops, 10), 1), 100);
			config.notify = config.notify !== false;
			config.maxContinuations = zeroAllowedInt(config.maxContinuations, 2, 0, 5);
			return config;
		}
		//#endregion

		//#region dsh-commander/protocol.js
		/**
		 * The dispatch protocol: the commander's model emits XML-ish blocks and
		 * the engine executes each one against its target conversation.
		 *
		 *   <dsh-dispatch target="#1" title="新会话标题(可选)">
		 *     自包含的任务文本
		 *   </dsh-dispatch>
		 *
		 * `target` accepts a roster alias (#N) or a full session id; omitted (or
		 * unresolved-new) means "create a fresh worker session".
		 */
		const DISPATCH_RE = /<dsh-dispatch\b([^>]*)>([\s\S]*?)<\/dsh-dispatch>/g;
		const ATTR_RE = /([a-zA-Z_][\w:-]*)\s*=\s*"([^"]*)"/g;

		/**
		 * Parse every dispatch block in one assistant text, source order.
		 * @param text - settled assistant message text.
		 * @returns the parsed blocks [{ target, title, fork, tid, depends, task }] —
		 *   task is trimmed and non-empty; `fork` inherits a session prefix into
		 *   a fresh worker; `tid` publishes this task's completion under a name;
		 *   `depends` gates this task on named predecessors ("a,b").
		 */
		function parseDispatchBlocks(text) {
			const blocks = [];
			if (typeof text !== "string" || text.indexOf("<dsh-dispatch") === -1) return blocks;
			DISPATCH_RE.lastIndex = 0;
			let match;
			while ((match = DISPATCH_RE.exec(text)) !== null) {
				const attrs = {};
				ATTR_RE.lastIndex = 0;
				let attr;
				while ((attr = ATTR_RE.exec(match[1])) !== null) attrs[attr[1].toLowerCase()] = attr[2];
				const task = (match[2] ?? "").trim();
				if (task === "") continue;
				blocks.push({
					target: typeof attrs.target === "string" ? attrs.target.trim() : "",
					title: typeof attrs.title === "string" ? attrs.title.trim() : "",
					fork: typeof attrs.fork === "string" ? attrs.fork.trim() : "",
					tid: typeof attrs.tid === "string" ? attrs.tid.trim() : "",
					depends: typeof attrs.depends === "string"
						? attrs.depends.split(",").map((part) => part.trim()).filter((part) => part !== "")
						: [],
					task,
				});
			}
			return blocks;
		}

		/** Hard-truncate one text with an ellipsis marker. */
		function truncateText(text, maxChars) {
			const s = String(text ?? "");
			const limit = positiveInt(maxChars, s.length || 1);
			if (s.length <= limit) return s;
			return s.slice(0, Math.max(0, limit - 1)) + "…";
		}

		/**
		 * Broadcast expansion: one parsed block may address many workers via
		 * `target="#1,#2"` (comma list) or `target="all"` (every roster row at
		 * dispatch time). Produces one single-target item per recipient, source
		 * order preserved.
		 * @param blocks - parsed blocks.
		 * @param roster - the commander's current roster rows.
		 * @returns expanded single-target items.
		 */
		function expandBlocks(blocks, roster) {
			const out = [];
			for (const block of Array.isArray(blocks) ? blocks : []) {
				const raw = String(block?.target ?? "").trim();
				if (raw.toLowerCase() === "all") {
					for (const row of roster ?? []) out.push({ ...block, target: row.id });
					continue;
				}
				if (raw.indexOf(",") !== -1) {
					for (const part of raw.split(",")) {
						const target = part.trim();
						if (target !== "") out.push({ ...block, target });
					}
					continue;
				}
				out.push(block);
			}
			return out;
		}
		//#endregion

		//#region dsh-commander/policy.js
		/**
		 * Burst guards that keep one runaway loop from flooding every
		 * conversation: a hard per-activation cumulative cap, the concurrent
		 * outstanding cap, and the per-message block cap.
		 */
		const ACTIVATION_TASK_CAP = 50;
		const BATCH_MIN_INTERVAL_MS = 1000;
		/**
		 * A freshly accepted prompt takes a moment to flip the host's `running`
		 * flag; settling a worker inside this window would read a stale idle
		 * state and emit a bogus empty receipt.
		 */
		const SETTLE_GRACE_MS = 2500;

		/**
		 * Pure gate for one parsed batch. Decides nothing about targets or
		 * delivery — only how many items (if any) may leave this tick.
		 * @param blocks - parsed dispatch blocks from new commander output.
		 * @param st - live counters { outstanding, dispatchedTotal }.
		 * @param config - resolved plugin configuration.
		 * @returns { action: 'disabled'|'empty'|'cap'|'execute', items?, dropped?, reason? }
		 */
		function evaluateBatch(blocks, st, config) {
			if (config.enabled !== true) return { action: "disabled", reason: "插件已在设置中禁用" };
			if (!Array.isArray(blocks) || blocks.length === 0) return { action: "empty" };
			const perMessageRoom = positiveInt(config.maxPerMessage, 8);
			const outstandingRoom = Math.max(0, positiveInt(config.maxOutstanding, 5) - (st.outstanding | 0));
			const activationRoom = Math.max(0, ACTIVATION_TASK_CAP - (st.dispatchedTotal | 0));
			const room = Math.min(perMessageRoom, outstandingRoom, activationRoom);
			if (room <= 0) {
				const reason = activationRoom <= 0
					? "单次激活累计派发已达上限（" + ACTIVATION_TASK_CAP + "），请重新激活指挥官"
					: outstandingRoom <= 0
						? "并发任务已达上限（" + positiveInt(config.maxOutstanding, 5) + "）"
						: "单条消息任务块数已达上限";
				return { action: "cap", items: [], dropped: blocks.length, reason };
			}
			return { action: "execute", items: blocks.slice(0, room), dropped: Math.max(0, blocks.length - room) };
		}
		//#endregion

		//#region dsh-commander/roster.js
		/**
		 * Build the worker roster from one list snapshot: every non-blank
		 * session except the commander itself, sorted by display title, aliased
		 * `#1..#N` for the model to reference cheaply.
		 * @param list - sessions.list snapshot { ids, byId }.
		 * @param commanderId - the commander session (excluded).
		 * @returns the roster rows [{ alias, id, title, cwd, running }].
		 */
		function buildRoster(list, commanderId) {
			const rows = [];
			for (const id of list?.ids ?? []) {
				if (id === commanderId) continue;
				const row = list?.byId?.[id];
				if (row === undefined || row.blank === true) continue;
				rows.push({
					id,
					title: typeof row.displayTitle === "string" && row.displayTitle !== "" ? row.displayTitle : (typeof row.title === "string" && row.title !== "" ? row.title : id),
					cwd: typeof row.cwd === "string" ? row.cwd : "",
					running: row.running === true,
				});
			}
			// Aliases must be DETERMINISTIC across environments and reloads
			// (locale-aware title sorts are not): the model's mental map of
			// "#N -> session" lives in one injected briefing, so we derive it
			// from the stable session-id ordering instead.
			rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
			return rows.map((row, index) => ({ alias: "#" + String(index + 1), ...row }));
		}

		/**
		 * Render the protocol briefing injected into the commander session as a
		 * plugin-sourced user message (no turn is opened). The roster aliases
		 * are stable until the next briefing; the engine maps alias -> id at
		 * dispatch time from its own copy of the same roster.
		 */
		function briefingText(roster) {
			const lines = [
				"[系统提示 · 指挥官模式] 你现在是一个「指挥官」会话，可以把任务派发给其他对话（worker）并行执行。插件会自动把任务送达目标会话，并在 worker 完成后把结果以「[指挥官回执]」开头的消息注入本会话。",
				"可用 worker 会话（花名册）：",
			];
			if (roster.length === 0) {
				lines.push("（当前没有其他会话；省略 target 即可让插件新建 worker 会话。）");
			} else {
				for (const row of roster) {
					lines.push(row.alias + " 「" + row.title + "」 id=" + row.id + (row.cwd !== "" ? " 目录=" + row.cwd : ""));
				}
			}
			lines.push(
				'派发方法——在回复中原样输出如下块（每块一个自包含任务，可一次多个）：',
				'<dsh-dispatch target="#1" title="新会话标题(可选)">',
				"交给 worker 执行的完整任务描述",
				"</dsh-dispatch>",
				"规则：",
				"- target 填花名册别名（如 #1）或完整会话 id；省略 target 则自动新建 worker 会话，title 作为其侧边栏标题；",
				'- 同一任务发多个 worker 用逗号分隔（target="#1,#2"）；target="all" 发给花名册全部会话；',
				'- fork="commander"（或某会话引用）：新建的 worker 将继承该会话完整上下文作为背景，任务文本可以只写增量要求；代价是 token 消耗显著更高，仅在强背景依赖时使用；',
				'- 复杂编排：tid="a" 给本任务命名；另一块 depends="a" 表示等 a 完成后才派发（a 失败则连锁取消）；',
				"- 任务文本必须自包含——worker 看不到本会话的任何上下文，请写清目标、背景、步骤与验收标准；",
				"- 派发后停止输出并等待回执；收到所需的全部回执后再继续汇总或继续派发；严禁虚构或提前编造回执内容；",
				"- 无需派发时正常对话回复即可，不要输出空的任务块。",
			);
			return lines.join("\n");
		}
		//#endregion

		//#region dsh-commander/store.js
		/**
		 * Module-level engine state. Deliberately OUTSIDE React: the polling
		 * loop, monitors, and receipts survive navigation between conversations
		 * (and component unmounts) because nothing owns them per-session. The UI
		 * subscribes to a version counter and re-reads everything on change.
		 */
		const STORAGE_KEY = "dsh-commander.active";
		const STORAGE_TASKS = "dsh-commander.tasks";
		/** Task history kept in storage/memory — bounded so long sessions never leak. */
		const TASK_HISTORY_LIMIT = 100;
		const listeners = new Set();
		let version = 0;

		const state = {
			booted: false,
			config: { ...CONFIG_DEFAULTS },
			configLoaded: false,
			/** Active commander session ids (persisted across reloads). */
			active: [],
			/** Per-commander engine records keyed by session id. */
			commanders: new Map(),
			/** Every known task keyed by task id (persisted, pruned to TASK_HISTORY_LIMIT). */
			tasks: new Map(),
			taskSeq: 0,
			batchSeq: 0,
			/** workerId -> taskId currently holding the send slot (engine-level serialization). */
			workerLocks: new Map(),
			panelOpenFor: null,
		};

		/**
		 * Per-worker FIFO of task ids waiting for their send slot. Module scope
		 * (not persisted): a reload rebuilds it from restored `waiting` tasks.
		 */
		const waitQueue = new Map();

		function enqueueWaiting(workerId, taskId) {
			const list = waitQueue.get(workerId) ?? [];
			if (!list.includes(taskId)) list.push(taskId);
			waitQueue.set(workerId, list);
		}

		function dequeueWaiting(workerId, taskId) {
			const list = waitQueue.get(workerId);
			if (list === undefined) return;
			const next = list.filter((id) => id !== taskId);
			if (next.length === 0) waitQueue.delete(workerId);
			else waitQueue.set(workerId, next);
		}

		function getSnapshot() {
			return version;
		}

		function subscribe(fn) {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		}

		/**
		 * Mutate the engine state through `fn`, then notify subscribers and
		 * mirror the task table into storage — every mutation stays crash-safe
		 * against a page reload.
		 */
		function update(fn) {
			fn(state);
			version += 1;
			for (const listener of [...listeners]) {
				try {
					listener();
				} catch {}
			}
			persistTasks();
		}

		function persistActive() {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state.active));
			} catch {}
		}

		function readPersistedActive() {
			try {
				const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
				if (!Array.isArray(raw)) return [];
				return raw.filter((id) => typeof id === "string" && id !== "");
			} catch {
				return [];
			}
		}

		/** Mirror the task table into localStorage, pruning to the newest N entries. */
		function persistTasks() {
			try {
				const all = [...state.tasks.values()].sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
				let keep = all;
				if (all.length > TASK_HISTORY_LIMIT) {
					keep = all.slice(all.length - TASK_HISTORY_LIMIT);
					state.tasks = new Map(keep.map((task) => [task.id, task]));
				}
				localStorage.setItem(STORAGE_TASKS, JSON.stringify(keep.map((task) => ({ ...task }))));
			} catch {}
		}

		/** Reload path: rebuild the task table (and id sequence) from storage. */
		function restoreTasks() {
			try {
				const raw = JSON.parse(localStorage.getItem(STORAGE_TASKS) ?? "[]");
				if (!Array.isArray(raw)) return;
				let maxSeq = state.taskSeq;
				for (const task of raw) {
					if (task === null || typeof task !== "object" || typeof task.id !== "string" || task.id === "") continue;
					if (state.tasks.has(task.id)) continue;
					state.tasks.set(task.id, { ...task });
					const seq = Number(task.id.slice("cmdr-".length));
					if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
				}
				state.taskSeq = maxSeq;
				// Parked tasks from before the reload re-enter their FIFO; a task
				// that crashed mid-send parks too instead of hanging forever.
				for (const task of state.tasks.values()) {
					if ((task.status === "waiting" || task.status === "sending") && typeof task.workerId === "string" && task.workerId !== "") {
						if (task.status === "sending") task.status = "waiting";
						enqueueWaiting(task.workerId, task.id);
					}
				}
			} catch {}
		}

		/** React binding: re-render whenever the engine state changes. */
		function useEngineTick() {
			const [tick, setTick] = react.useState(version);
			react.useEffect(() => subscribe(() => setTick((value) => value + 1)), []);
			return tick;
		}

		function errorMessage(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion

		//#region dsh-commander/api.js
		/**
		 * Call the host events route. Returns the parsed payload verbatim
		 * (`{ok:true,...}` or `{ok:false,error}`) so callers can distinguish
		 * business failures (session-not-found) from transport ones.
		 */
		async function fetchEvents(sessionId, cursor, limit) {
			const query = "?sessionId=" + encodeURIComponent(sessionId) + "&cursor=" + String(cursor | 0) + "&limit=" + String(limit | 0 || 20);
			const response = await fetch("/api/dsh-commander/events" + query, { method: "GET" });
			let data = null;
			try {
				data = await response.json();
			} catch {}
			if (data === null) return { ok: false, error: { code: "transport", message: "events route returned non-JSON (" + response.status + ")" } };
			return data;
		}

		/** Call the host inject route (silent briefing injection). */
		async function injectBriefing(sessionId, text) {
			const response = await fetch("/api/dsh-commander/inject", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId, text }),
			});
			let data = null;
			try {
				data = await response.json();
			} catch {}
			if (data === null) return { ok: false, error: { code: "transport", message: "inject route returned non-JSON (" + response.status + ")" } };
			return data;
		}
		//#endregion

		//#region dsh-commander/engine.js
		/**
		 * The orchestration engine. One module singleton: a single interval polls
		 * every active commander's settled assistant tail through the HOST event
		 * log (window/staging independent), parses dispatch blocks, delivers
		 * tasks through the client session faces, watches workers through the
		 * list snapshot (the same signal the sidebar runs on), and feeds result
		 * summaries back into the commander as receipt messages.
		 */
		const LOG_PREFIX = "[dsh-commander]";
		let runtime = null;
		let timer = null;
		let polling = false;

		/** Capture the sessions runtime once and restore persisted activations. */
		function boot(sessions) {
			if (runtime !== null || sessions === undefined || sessions === null) return;
			runtime = { sessions };
			state.booted = true;
			restoreTasks();
			// The list store starts `pending` before its first pull; filtering the
			// persisted ids against a pending snapshot would drop every restored
			// commander. Wait for `ready` (with a bounded fallback so a stuck
			// phase can never wedge the restore).
			let restored = false;
			const tryRestore = () => {
				if (restored || runtime === null) return true;
				const snapshot = sessions.list.getSnapshot();
				const ready = snapshot.phase === undefined || snapshot.phase === "ready";
				if (!ready) return false;
				restored = true;
				restoreCommanders(readPersistedActive().filter((id) => snapshot.byId[id] !== undefined));
				return true;
			};
			if (!tryRestore()) {
				const unsubscribe = sessions.list.subscribe(() => {
					if (tryRestore()) unsubscribe();
				});
				setTimeout(() => {
					tryRestore();
					try {
						unsubscribe();
					} catch {}
				}, 8000);
			}
			loadConfig().then((config) => {
				update((s) => {
					s.config = config;
					s.configLoaded = true;
				});
				rearmTimer();
			});
			ensureTimer();
			console.info(LOG_PREFIX, "引擎已启动");
		}

		/** Re-register commanders after a reload: fresh roster, cursor pinned to the current tail. */
		async function restoreCommanders(ids) {
			for (const sessionId of ids) {
				try {
					const roster = buildRoster(runtime.sessions.list.getSnapshot(), sessionId);
					let cursor = 0;
					const probe = await fetchEvents(sessionId, 0, 1);
					if (probe.ok === true) cursor = Number(probe.lastAssistantSeq ?? probe.lastSeq ?? 0);
					update((s) => {
						s.commanders.set(sessionId, { sessionId, cursor, roster, outstanding: 0, dispatchedTotal: 0, lastBatchAt: 0, error: "", commanderHops: 0 });
						if (!s.active.includes(sessionId)) s.active.push(sessionId);
					});
				} catch (error) {
					console.warn(LOG_PREFIX, "恢复指挥官失败：", errorMessage(error));
				}
			}
			persistActive();
		}

		/**
		 * Activate one conversation as the commander: build the roster, inject
		 * the protocol briefing (host appends it silently), pin the parse cursor
		 * to the current tail so pre-activation outputs never execute, and start
		 * polling.
		 */
		async function activate(sessionId) {
			if (state.active.includes(sessionId)) throw new Error("该会话已是指挥官");
			await ensureConfig();
			const sessions = runtime.sessions;
			const list = sessions.list.getSnapshot();
			if (list.byId[sessionId] === undefined) throw new Error("会话不在列表中，无法激活指挥官");
			const roster = buildRoster(list, sessionId);
			const result = await injectBriefing(sessionId, briefingText(roster));
			if (result.ok !== true) throw new Error(result.error?.message ?? result.error?.code ?? "简报注入失败");
			let cursor = 0;
			try {
				const probe = await fetchEvents(sessionId, 0, 1);
				cursor = Number(probe.lastAssistantSeq ?? probe.lastSeq ?? 0);
			} catch {}
			update((s) => {
				s.commanders.set(sessionId, { sessionId, cursor, roster, outstanding: 0, dispatchedTotal: 0, lastBatchAt: 0, error: "", commanderHops: 0 });
				if (!s.active.includes(sessionId)) s.active.push(sessionId);
			});
			persistActive();
			ensureTimer();
			console.info(LOG_PREFIX, "指挥官已激活：", sessionId, "（花名册 " + roster.length + " 个会话）");
		}

		/** Deactivate: stop parsing/dispatching for this commander. In-flight tasks finish reporting status only. */
		function deactivate(sessionId) {
			update((s) => {
				s.active = s.active.filter((id) => id !== sessionId);
				s.commanders.delete(sessionId);
				if (s.panelOpenFor === sessionId) s.panelOpenFor = null;
			});
			persistActive();
			stopTimerIfIdle();
			console.info(LOG_PREFIX, "指挥官已停用：", sessionId);
		}

		/** Re-inject an updated roster briefing (aliases may have shifted). */
		async function refreshRoster(sessionId) {
			await ensureConfig();
			const record = state.commanders.get(sessionId);
			if (record === undefined) throw new Error("该会话不是激活中的指挥官");
			const previous = record.roster;
			const roster = buildRoster(runtime.sessions.list.getSnapshot(), sessionId);
			record.roster = roster;
			const result = await injectBriefing(sessionId, briefingText(roster));
			if (result.ok !== true) {
				// Roll the alias map back: the model's context still speaks the OLD
				// roster, so dispatches must keep resolving against it.
				record.roster = previous;
				const message = result.error?.message ?? result.error?.code ?? "花名册刷新失败";
				update((s) => {
					const r = s.commanders.get(sessionId);
					if (r !== undefined) r.error = message;
				});
				throw new Error(message);
			}
			update((s) => {
				const r = s.commanders.get(sessionId);
				if (r !== undefined) {
					r.roster = roster;
					r.error = "";
				}
			});
			console.info(LOG_PREFIX, "花名册已刷新：", sessionId, "（" + roster.length + " 个会话）");
		}

		async function ensureConfig() {
			if (!state.configLoaded) {
				state.config = await loadConfig();
				state.configLoaded = true;
			}
		}

		function countOutstanding(commanderId) {
			let count = 0;
			for (const task of state.tasks.values()) {
				if (task.commanderId === commanderId && (task.status === "sending" || task.status === "running")) count += 1;
			}
			return count;
		}

		function hasOutstanding() {
			for (const task of state.tasks.values()) {
				if (task.status === "sending" || task.status === "running" || task.status === "waiting") return true;
			}
			return false;
		}

		function ensureTimer() {
			if (timer !== null || !state.booted) return;
			if (state.active.length === 0) return;
			const period = Math.min(Math.max(positiveInt(state.config.pollIntervalMs, 2000), 500), 60000);
			timer = setInterval(() => {
				poll().catch((error) => console.warn(LOG_PREFIX, "轮询异常：", errorMessage(error)));
			}, period);
		}

		function stopTimerIfIdle() {
			if (timer !== null && state.active.length === 0 && !hasOutstanding()) {
				clearInterval(timer);
				timer = null;
			}
		}

		function rearmTimer() {
			stopTimerIfIdle();
			ensureTimer();
		}

		/** One poll pass: drain every active commander's tail, then settle workers. Reentrancy-guarded. */
		async function poll() {
			if (polling) return;
			if (state.active.length === 0 && !hasOutstanding()) {
				stopTimerIfIdle();
				return;
			}
			polling = true;
			try {
				for (const commanderId of [...state.active]) {
					await processCommander(commanderId).catch((error) => console.warn(LOG_PREFIX, "处理指挥官输出失败：", errorMessage(error)));
				}
				await monitorTasks();
				await drainWaitingQueues();
			} finally {
				polling = false;
			}
			stopTimerIfIdle();
		}

		/**
		 * Drain one commander: fetch the settled assistant texts since the
		 * cursor, gate the parsed batch through the pure policy, advance the
		 * cursor (at-most-once execution), and dispatch the admitted items.
		 */
		async function processCommander(commanderId) {
			const record = state.commanders.get(commanderId);
			if (record === undefined) return;
			const data = await fetchEvents(commanderId, record.cursor, 50);
			if (data.ok !== true) {
				if (data.error?.code === "session-not-found") {
					console.warn(LOG_PREFIX, "指挥官会话已消失，自动停用：", commanderId);
					deactivate(commanderId);
				}
				return;
			}
			const lastSeq = Number(data.lastSeq ?? record.cursor);
			// Broadcast expansion first: `target="#1,#2"` / `target="all"` become
			// single-target items so every downstream gate (caps, cooldown,
			// dispatch) treats them uniformly.
			const blocks = expandBlocks(
				(data.events ?? []).flatMap((event) => parseDispatchBlocks(event.text)),
				record.roster ?? [],
			);
			if (blocks.length === 0) {
				record.cursor = Math.max(record.cursor, lastSeq);
				return;
			}
			const verdict = evaluateBatch(blocks, { outstanding: countOutstanding(commanderId), dispatchedTotal: record.dispatchedTotal }, state.config);
			if (verdict.action === "cap") {
				// A permanent cap (activation budget exhausted) must consume the
				// batch or it would re-warn every tick; a transient one (all
				// workers busy) leaves the cursor alone so tasks run next tick.
				if (String(verdict.reason ?? "").indexOf("累计派发已达上限") !== -1) {
					record.cursor = Math.max(record.cursor, lastSeq);
					console.warn(LOG_PREFIX, verdict.reason, "，丢弃 " + verdict.dropped + " 个任务块");
					return;
				}
				return;
			}
			// The cooldown gate sits BEFORE the cursor advance: an early return
			// here re-reads the same tail next tick instead of dropping it.
			if (verdict.action === "execute" && Date.now() - record.lastBatchAt < BATCH_MIN_INTERVAL_MS) {
				console.warn(LOG_PREFIX, "距上一批派发不足 " + BATCH_MIN_INTERVAL_MS + "ms，本批顺延到下一轮询");
				return;
			}
			record.cursor = Math.max(record.cursor, lastSeq);
			if (verdict.action !== "execute") return;
			record.lastBatchAt = Date.now();
			if (verdict.dropped > 0) console.warn(LOG_PREFIX, "超出单条消息上限，丢弃 " + verdict.dropped + " 个任务块");
			const batchId = "b-" + String(++state.batchSeq);
			const batchTids = new Set(verdict.items.map((item2) => item2.tid).filter((tid) => typeof tid === "string" && tid !== ""));
			for (const item of verdict.items) {
				await dispatchTask(record, item, batchId, batchTids).catch((error) => console.warn(LOG_PREFIX, "派发异常：", errorMessage(error)));
			}
		}

		/** Create the task record up-front so the panel shows the attempt even when resolution fails. */
		function openTask(record, item, batchId) {
			const taskId = "cmdr-" + String(++state.taskSeq);
			update((s) => {
				s.tasks.set(taskId, {
					id: taskId,
					commanderId: record.sessionId,
					workerId: "",
					workerTitle: item.title,
					alias: item.target,
					excerpt: truncateText(item.task, 60),
					fullText: truncateText(item.task, positiveInt(s.config.maxTaskChars, 4000)),
					pendingFork: item.fork,
					tid: item.tid,
					status: "sending",
					detail: "",
					sentAt: Date.now(),
					settledAt: 0,
					baseline: 0,
					batchId: batchId ?? null,
					stuck: false,
					slow: false,
					cancelRequested: false,
					continuations: 0,
				});
			});
			return taskId;
		}

		//#region dsh-commander/dependencies.js
		/**
		 * Dependency gate. `depends="a,b"` parks a task as 「等依赖」 until every
		 * named predecessor settles done; any predecessor failing cancels the
		 * chain (fail-fast). Names come from `tid="a"` on other blocks — either
		 * later in the SAME reply or from earlier turns.
		 */
		const depIndex = new Map();

		function registerDeps(taskId, names) {
			for (const name of names) {
				let set = depIndex.get(name);
				if (set === undefined) {
					set = new Set();
					depIndex.set(name, set);
				}
				set.add(taskId);
			}
		}

		function unregisterDeps(taskId, names) {
			for (const name of names) {
				const set = depIndex.get(name);
				if (set === undefined) continue;
				set.delete(taskId);
				if (set.size === 0) depIndex.delete(name);
			}
		}

		/** Latest task carrying the given tid (scan is tiny: bounded history). */
		function latestTaskWithTid(tid) {
			let found = undefined;
			for (const task of state.tasks.values()) {
				if (task.tid === tid && (found === undefined || Number(task.id.slice(5)) > Number(found.id.slice(5)))) found = task;
			}
			return found;
		}

		/**
		 * Decide whether this task may proceed to target resolution right now.
		 * Returns true to proceed; false when parked on deps (or failed fast).
		 */
		function checkDepsGate(record, taskId, item, batchTids) {
			const deps = Array.isArray(item.depends) ? item.depends : [];
			if (deps.length === 0) return true;
			const missing = deps.filter((name) => !batchTids.has(name) && latestTaskWithTid(name) === undefined);
			if (missing.length > 0) {
				markTask(taskId, "failed", "依赖不存在：" + missing.join(","));
				return false;
			}
			const dead = [];
			const remaining = [];
			for (const name of deps) {
				const prior = latestTaskWithTid(name);
				if (prior !== undefined && isTerminalStatus(prior.status)) {
					if (prior.status === "done") continue;
					dead.push(name);
					continue;
				}
				remaining.push(name);
			}
			if (dead.length > 0) {
				markTask(taskId, "failed", "前置任务失败：" + dead.join(","));
				return false;
			}
			if (remaining.length === 0) return true;
			update((s) => {
				const t = s.tasks.get(taskId);
				if (t === undefined || isTerminalStatus(t.status)) return;
				t.depsRemaining = remaining;
				t.status = "blocked-dep";
			});
			registerDeps(taskId, remaining);
			console.info(LOG_PREFIX, "任务等待依赖：", taskId, "←", remaining.join(","));
			return false;
		}

		/**
		 * Called from markTask once a task lands in a terminal state: publish its
		 * tid to dependents — releasing the satisfied ones into the send
		 * pipeline and fail-fast cancelling the ones waiting on a failure.
		 */
		function publishTidSettlement(task) {
			const tid = task.tid;
			if (typeof tid !== "string" || tid === "") return;
			const waiters = [...(depIndex.get(tid) ?? [])];
			if (waiters.length === 0) return;
			depIndex.delete(tid);
			const succeeded = task.status === "done";
			for (const waiterId of waiters) {
				const waiter = state.tasks.get(waiterId);
				if (waiter === undefined || waiter.status !== "blocked-dep") continue;
				if (!succeeded) {
					unregisterDeps(waiterId, [tid]);
					markTask(waiterId, "failed", "前置任务「" + tid + "」未成功，已连锁取消");
					continue;
				}
				const remaining = (waiter.depsRemaining ?? []).filter((name) => name !== tid);
				update((s) => {
					const t = s.tasks.get(waiterId);
					if (t === undefined || t.status !== "blocked-dep") return;
					t.depsRemaining = remaining;
					if (remaining.length === 0) t.status = "sending";
				});
				if (remaining.length === 0) {
					const record = state.commanders.get(waiter.commanderId);
					unregisterDeps(waiterId, [tid]);
					if (record === undefined) {
						markTask(waiterId, "failed", "指挥官已停用，依赖解除后作废");
						continue;
					}
					void resolveAndSend(record, waiterId).catch((error) => console.warn(LOG_PREFIX, "依赖解除派发异常：", errorMessage(error)));
				}
			}
		}
		//#endregion

		const TERMINAL_STATUSES = ["done", "failed", "blocked", "taken-over"];

		function isTerminalStatus(status) {
			return TERMINAL_STATUSES.includes(status);
		}

		function markTask(taskId, status, detail) {
			let settled = null;
			update((s) => {
				const task = s.tasks.get(taskId);
				if (task === undefined || isTerminalStatus(task.status)) return;
				task.status = status;
				task.detail = String(detail ?? "");
				task.settledAt = Date.now();
				const record = s.commanders.get(task.commanderId);
				if (record !== undefined) record.outstanding = countOutstanding(task.commanderId);
				// Terminal settlement frees the worker's send slot.
				if (isTerminalStatus(status) && typeof task.workerId === "string" && task.workerId !== "" && s.workerLocks.get(task.workerId) === task.id) {
					s.workerLocks.delete(task.workerId);
				}
				if (isTerminalStatus(status)) settled = { tid: task.tid };
			});
			// Publish OUTSIDE the update closure: promotion may re-enter update().
			if (settled !== null) publishTidSettlement({ id: taskId, tid: settled.tid, status });
		}

		/**
		 * Entry point for one admitted block: create the record, run the
		 * dependency gate, then resolve+send when unblocked.
		 */
		async function dispatchTask(record, item, batchId, batchTids) {
			const taskId = openTask(record, item, batchId);
			if (!checkDepsGate(record, taskId, item, batchTids ?? new Set())) return;
			await resolveAndSend(record, taskId);
		}

		/**
		 * Resolve the target for one admitted task and hand it to the send
		 * pipeline. Resolution order: roster alias -> full session id ->
		 * exact display-title match -> auto-create — where `fork="commander"`
		 * (or a session ref) swaps plain creation for a FORK, so the worker
		 * inherits the source conversation's full prefix as background.
		 */
		async function resolveAndSend(record, taskId) {
			const task = state.tasks.get(taskId);
			if (task === undefined || isTerminalStatus(task.status)) return;
			const item = { target: typeof task.alias === "string" ? task.alias : "", title: typeof task.workerTitle === "string" ? task.workerTitle : "", fork: typeof task.pendingFork === "string" ? task.pendingFork : "", task: typeof task.fullText === "string" ? task.fullText : "" };
			const sessions = runtime.sessions;
			const list = sessions.list.getSnapshot();

			let workerId = "";
			let workerTitle = item.title;
			let commanderTarget = false;
			if (item.target !== "") {
				if (item.target === record.sessionId) {
					markTask(taskId, "failed", "目标是指挥官自己，已跳过");
					return;
				}
				const rosterRow = record.roster.find((row) => row.alias === item.target || row.id === item.target);
				if (rosterRow !== undefined) {
					workerId = rosterRow.id;
					if (workerTitle === "") workerTitle = rosterRow.title;
				} else if (list.byId[item.target] !== undefined) {
					workerId = item.target;
				} else {
					const byTitle = Object.values(list.byId).find((row) => row.displayTitle === item.target || row.title === item.target);
					if (byTitle !== undefined) {
						workerId = byTitle.id;
						if (workerTitle === "") workerTitle = byTitle.displayTitle || byTitle.title || workerId;
					} else {
						markTask(taskId, "failed", "目标不存在：" + truncateText(item.target, 40));
						return;
					}
				}
				commanderTarget = state.active.includes(workerId);
			} else {
				const commanderRow = list.byId[record.sessionId];
				const cwd = typeof commanderRow?.cwd === "string" && commanderRow.cwd !== "" ? { cwd: commanderRow.cwd } : {};
				if (workerTitle === "" && state.config.autoLabelWorkers === true) {
					workerTitle = "[T" + String(record.dispatchedTotal + 1) + "] " + truncateText(item.task, 24);
				}
				const forkSource = item.fork;
				if (forkSource !== "") {
					let sourceId = record.sessionId; // fork="commander"
					if (forkSource.toLowerCase() !== "commander") {
						const refRow =
							record.roster.find((row) => row.alias === forkSource || row.id === forkSource) ??
							(list.byId[forkSource] !== undefined ? { id: forkSource } : undefined) ??
							Object.values(list.byId).find((row) => row.displayTitle === forkSource);
						if (refRow === undefined) {
							markTask(taskId, "failed", "fork 来源不存在：" + truncateText(forkSource, 40));
							return;
						}
						sourceId = refRow.id;
					}
					try {
						workerId = await sessions.fork({ sessionId: sourceId });
						if (workerTitle !== "") {
							sessions.binding(workerId)?.session.rename(workerTitle).catch(() => {});
						}
					} catch (error) {
						markTask(taskId, "failed", "fork 会话失败（源回合可能未闭合）：" + errorMessage(error));
						return;
					}
				} else {
					try {
						workerId = await sessions.create(cwd);
						if (workerTitle !== "") {
							sessions.binding(workerId)?.session.rename(workerTitle).catch(() => {});
						}
					} catch (error) {
						markTask(taskId, "failed", "新建 worker 会话失败：" + errorMessage(error));
						return;
					}
				}
			}

			// Persist identity NOW so queued/lock paths can operate without the
			// original protocol block.
			update((s) => {
				const task = s.tasks.get(taskId);
				if (task === undefined) return;
				task.workerId = workerId;
				task.isHop = commanderTarget;
				if (task.workerTitle === "") {
					const row = list.byId[workerId];
					task.workerTitle = (row !== undefined && typeof row.displayTitle === "string" && row.displayTitle !== "" ? row.displayTitle : workerId);
				}
			});
			await sendOrQueue(record, taskId, commanderTarget);
		}

		/**
		 * Acquire the per-worker send slot. A worker counts as busy while one of
		 * OUR tasks holds the slot OR a live turn (possibly a human's) is
		 * running on it — sending into that race is exactly what misattributed
		 * receipts used to come from.
		 */
		function acquireWorkerLock(workerId, taskId) {
			const holder = state.workerLocks.get(workerId);
			if (holder !== undefined && holder !== taskId) return false;
			const row = runtime?.sessions.list.getSnapshot().byId[workerId];
			if (row !== undefined && row.running === true) return false;
			state.workerLocks.set(workerId, taskId);
			return true;
		}

		function releaseWorkerLockOf(taskId) {
			const task = state.tasks.get(taskId);
			if (task !== undefined && typeof task.workerId === "string" && task.workerId !== "" && state.workerLocks.get(task.workerId) === taskId) {
				state.workerLocks.delete(task.workerId);
			}
		}

		/**
		 * Send one resolved task now, or park it as 「排队中」 when its worker's
		 * slot is taken. The parked task keeps its identity and is promoted by
		 * the poll loop as soon as the slot frees.
		 */
		async function sendOrQueue(record, taskId, commanderTarget) {
			const task = state.tasks.get(taskId);
			if (task === undefined || task.workerId === "") return;
			// Cross-commander loop guard: dispatching INTO another active
			// commander is legitimate orchestration but budgeted per activation,
			// so an A->B->A ping-pong burns out instead of running forever.
			if (commanderTarget === true) {
				const cap = positiveInt(state.config.maxCommanderHops, 10);
				if ((record.commanderHops | 0) >= cap) {
					markTask(taskId, "failed", "跨指挥官派发已达上限（" + String(cap) + "），已拦截以防循环");
					return;
				}
			}
			if (!acquireWorkerLock(task.workerId, taskId)) {
				update((s) => {
					const t = s.tasks.get(taskId);
					if (t === undefined || isTerminalStatus(t.status)) return;
					t.status = "waiting";
				});
				enqueueWaiting(task.workerId, taskId);
				console.info(LOG_PREFIX, "worker 忙，任务排队：", truncateText(task.excerpt, 30), "→", task.workerId);
				return;
			}
			await performSend(record, taskId);
		}

		/**
		 * Lock held: probe the baseline FRESH (this ordering is the whole point
		 * of the lock), deliver the prompt, and flip the task to running /
		 * blocked. Any exit releases the slot.
		 */
		async function performSend(record, taskId) {
			const sessions = runtime.sessions;
			const task = state.tasks.get(taskId);
			if (task === undefined) {
				releaseWorkerLockOf(taskId);
				return;
			}
			const face = sessions.binding(task.workerId)?.session;
			if (face === undefined) {
				releaseWorkerLockOf(taskId);
				markTask(taskId, "failed", "目标会话不可达（不在列表中）：" + truncateText(task.workerId, 40));
				return;
			}
			let baseline = 0;
			try {
				const probe = await fetchEvents(task.workerId, 0, 1);
				if (probe.ok === true) baseline = Number(probe.lastAssistantSeq ?? probe.lastSeq ?? 0);
			} catch {}

			const taskText = truncateText(task.fullText ?? "", positiveInt(state.config.maxTaskChars, 4000));
			let accepted = false;
			let failure = "";
			try {
				const result = await face.prompt([{ type: "text", text: taskText }], "queue");
				if (result !== null && typeof result === "object" && result.ok === true) accepted = true;
				else failure = result?.error?.message ?? result?.error?.code ?? "发送被拒绝";
			} catch (error) {
				failure = errorMessage(error);
			}
			if (!accepted) {
				releaseWorkerLockOf(taskId);
				markTask(taskId, "blocked", "任务未送达：" + failure);
				return;
			}
			update((s) => {
				const t = s.tasks.get(taskId);
				if (t === undefined) return;
				t.baseline = baseline;
				// sentAt anchors the settle-grace and slow flags: it must reflect
				// the ACTUAL send, or a long-queued task would be promotable past
				// the grace window into an empty misattributed receipt.
				t.sentAt = Date.now();
				t.status = "running";
				const rec = s.commanders.get(record.sessionId);
				if (rec !== undefined) {
					rec.dispatchedTotal += 1;
					if (t.isHop === true) rec.commanderHops = (rec.commanderHops | 0) + 1;
					rec.outstanding = countOutstanding(record.sessionId);
				}
			});
			console.info(LOG_PREFIX, "任务已派发 →", task.workerId, "：", truncateText(task.excerpt, 60));
		}

		/**
		 * Promote queued tasks whose worker slot freed up (FIFO per worker).
		 * Runs every poll after settlements released their locks.
		 */
		async function drainWaitingQueues() {
			for (const [workerId, ids] of [...waitQueue]) {
				for (const taskId of [...ids]) {
					const task = state.tasks.get(taskId);
					if (task === undefined || isTerminalStatus(task.status)) {
						dequeueWaiting(workerId, taskId);
						continue;
					}
					if (task.status !== "waiting") {
						dequeueWaiting(workerId, taskId);
						continue;
					}
					if (state.workerLocks.has(workerId)) break; // slot still taken — FIFO order preserved
					const record = state.commanders.get(task.commanderId);
					if (record === undefined) {
						dequeueWaiting(workerId, taskId);
						markTask(taskId, "failed", "指挥官已停用，排队任务作废");
						continue;
					}
					if (!acquireWorkerLock(workerId, taskId)) break;
					dequeueWaiting(workerId, taskId);
					await performSend(record, taskId);
				}
			}
		}

		/**
		 * Settle finished workers: a worker whose `running` flag dropped is
		 * either done or gone. Pull ITS post-baseline tail from the host log,
		 * classify the ending reason, and feed a receipt back into the
		 * commander (which wakes it to continue orchestrating). While a worker
		 * runs, live liveness flags (waiting-for-confirmation / over-budget)
		 * are mirrored onto the task for the panel.
		 */
		async function monitorTasks() {
			if (runtime === null) return;
			const list = runtime.sessions.list.getSnapshot();
			for (const task of [...state.tasks.values()]) {
				if (task.status !== "running") continue;
				const row = list.byId[task.workerId];
				if (row === undefined) {
					finishTask(task, "failed", "worker 会话已不存在");
					continue;
				}
				// Live liveness mirrors: a pending interaction means the worker is
				// blocked on a human confirmation; a long run exceeds the budget.
				const stuck = row.pendingInteraction !== undefined && row.pendingInteraction !== null;
				if (stuck !== task.stuck || (!stuck && Date.now() - task.sentAt > positiveInt(state.config.stuckTimeoutMs, 600000)) !== task.slow) {
					update((s) => {
						const t = s.tasks.get(task.id);
						if (t === undefined) return;
						t.stuck = stuck;
						if (!stuck) t.slow = Date.now() - t.sentAt > positiveInt(s.config.stuckTimeoutMs, 600000);
					});
					if (stuck === true) notifyUser("指挥官 · worker 等待确认", (task.workerTitle || task.workerId) + "：" + task.excerpt);
					continue; // flags changed — give the next tick a clean view before settling
				}
				if (row.running === true) continue;
				if (Date.now() - task.sentAt < SETTLE_GRACE_MS) continue; // too fresh to trust the idle flag
				const data = await fetchEvents(task.workerId, task.baseline ?? 0, 10).catch(() => null);
				if (data === null || data.ok !== true) continue; // transport hiccup — retry next tick
				// A human started driving this worker directly: no automatic
				// receipt (it would fight the human's own input).
				if ((data.humanMessages ?? 0) > 0) {
					finishTask(task, "taken-over", "人工已接管该会话，自动回执省略");
					continue;
				}
				const reason = typeof data.lastEnd?.reason === "string" ? data.lastEnd.reason : "stop";
				// Interruption recovery: a turn that ended BEFORE finishing its task
				// (token-cap truncation, abort, error) gets a bounded number of
				// automatic continuation prompts so the commander's work completes
				// instead of dying mid-flight. Manual cancels never resume.
				if (reason !== "stop" && task.cancelRequested !== true && (task.continuations | 0) < zeroAllowedInt(state.config.maxContinuations, 2, 0, 5)) {
					const face = runtime.sessions.binding(task.workerId)?.session;
					const contText =
						"[指挥官插件] 你的上一个回合在完成任务前被中断（原因：" + reason + "）。" +
						"请从中断处继续执行原始任务；若实际已经完成，直接输出最终结果与结论。";
					let resumed = false;
					if (face !== undefined) {
						try {
							const result = await face.prompt([{ type: "text", text: contText }], "queue");
							resumed = result !== null && typeof result === "object" && result.ok === true;
						} catch {}
					}
					update((s) => {
						const t = s.tasks.get(task.id);
						if (t === undefined || t.status !== "running") return;
						t.continuations = (t.continuations | 0) + 1;
						t.sentAt = Date.now(); // fresh activity window for the continuation turn
					});
					if (resumed) {
						console.info(LOG_PREFIX, "回合中断（" + reason + "），已让 worker 继续（第 " + String((task.continuations | 0) + 1) + " 次）：", task.workerId);
						continue; // stay running — the continuation turn settles next cycle
					}
					// Resume rejected/unreachable: fall through and settle as failure.
				}
				const parts = [];
				let tokens = 0;
				for (const event of data.events ?? []) {
					parts.push(event.text);
					if (event.usage !== undefined && event.usage !== null) {
						for (const [key, value] of Object.entries(event.usage)) {
							if (typeof value === "number" && Number.isFinite(value) && /token/i.test(key)) tokens += value;
						}
					}
				}
				let summary = parts.join("\n\n").trim();
				if (summary === "") summary = "（该回合没有产生文本输出）";
				summary = truncateText(summary, positiveInt(state.config.summaryMaxChars, 800));
				const durationSec = Math.max(1, Math.round((Date.now() - task.sentAt) / 1000));
				let status = "done";
				let note = "完成";
				if (task.cancelRequested === true) {
					status = "failed";
					note = "已手动取消";
				} else if (reason === "max-tokens") {
					note = (task.continuations | 0) > 0
						? "完成（自动继续 " + String(task.continuations) + " 次后仍被 token 上限截断）"
						: "完成（输出被 token 上限截断）";
				} else if (reason !== "stop") {
					status = "failed";
					note = (task.continuations | 0) > 0
						? "回合异常结束（reason=" + reason + "）· 已自动继续 " + String(task.continuations) + " 次仍未恢复"
						: "回合异常结束（reason=" + reason + "）";
				}
				const contNote = (task.continuations | 0) > 0 ? " · 续跑 " + String(task.continuations) + " 次" : "";
				const metaLine = "（耗时 " + String(durationSec) + "s" + (tokens > 0 ? " · ~" + String(tokens) + " tok" : "") + contNote + "）";
				finishTask(task, status, note + metaLine + "\n摘要：" + summary);
				await deliverReceipt(task);
			}
			maybeBatchSummaries();
		}

		/**
		 * Batch roll-up: once EVERY task of one dispatch batch (size >= 2) has
		 * settled, inject ONE consolidated report so the commander can consume
		 * the whole wave at a glance instead of piecing receipts together.
		 * Each batch reports exactly once per activation.
		 */
		function maybeBatchSummaries() {
			for (const record of state.commanders.values()) {
				const batches = new Map();
				for (const task of state.tasks.values()) {
					if (task.commanderId !== record.sessionId || typeof task.batchId !== "string" || task.batchId === "") continue;
					const bucket = batches.get(task.batchId) ?? [];
					bucket.push(task);
					batches.set(task.batchId, bucket);
				}
				for (const [batchId, tasks] of batches) {
					if (tasks.length < 2 || !tasks.every((task) => isTerminalStatus(task.status))) continue;
					record.reportedBatches = record.reportedBatches ?? new Set();
					if (record.reportedBatches.has(batchId)) continue;
					record.reportedBatches.add(batchId);
					const failedCount = tasks.filter((task) => task.status === "failed" || task.status === "blocked").length;
					const lines = tasks.map((task) => {
						const label = (task.alias !== "" ? task.alias : "新") + "「" + (task.workerTitle || task.workerId) + "」";
						// Prefer the actual result text (the 摘要 line of the receipt
						// detail) over the bare status note, so one glance at the
						// roll-up carries the outcome.
						const detailLines = String(task.detail ?? "").split("\n");
						const summaryLine = detailLines.find((line) => line.indexOf("摘要：") === 0) ?? "";
						const preview = summaryLine !== "" ? summaryLine.slice("摘要：".length) : (detailLines[0] ?? "");
						return "- " + label + "：" + (STATUS_LABEL[task.status] ?? task.status) + "：" + truncateText(preview, 60);
					});
					const text =
						"[指挥官批次汇总 · " + String(tasks.length) + " 项已全部结算" + (failedCount > 0 ? "，其中 " + String(failedCount) + " 项未成功" : "") + "]\n" +
						lines.join("\n") + "\n请基于以上全部结果继续调度或汇总。";
					void deliverReceiptText(record.sessionId, text);
				}
			}
		}

		/** Fire-and-forget receipt with an explicit body (batch summaries). */
		async function deliverReceiptText(commanderId, text) {
			if (!state.config.autoReport) return;
			const face = runtime?.sessions.binding(commanderId)?.session;
			if (face === undefined) return;
			try {
				await face.prompt([{ type: "text", text }], "queue");
				notifyUser("指挥官 · 批次已全部结算", truncateText(text.replace(/\n/g, " "), 90));
			} catch (error) {
				console.warn(LOG_PREFIX, "批次汇总发送失败：", errorMessage(error));
			}
		}

		/** Transition one task to a terminal state exactly once and wake the UI. */
		function finishTask(task, status, detail) {
			if (isTerminalStatus(task.status)) return;
			markTask(task.id, status, detail);
			console.info(LOG_PREFIX, "任务结算 [" + status + "]", task.workerTitle || task.workerId, "：", truncateText(detail, 80));
			if (status === "failed" || status === "blocked") {
				notifyUser("指挥官 · 任务未成功", (task.workerTitle || task.workerId) + "：" + truncateText(detail, 80));
			}
		}

		/**
		 * Panel action: stop a running worker's current turn. The cancellation
		 * is flagged first so the settle pass labels it 已手动取消 instead of an
		 * opaque abnormal-end reason.
		 */
		async function cancelTask(taskId) {
			const task = state.tasks.get(taskId);
			if (task === undefined) return;
			if (task.status === "waiting") {
				dequeueWaiting(task.workerId, taskId);
				markTask(taskId, "failed", "已取消（尚未发送）");
				return;
			}
			if (task.status === "blocked-dep") {
				unregisterDeps(taskId, task.depsRemaining ?? []);
				markTask(taskId, "failed", "已取消（等待依赖中）");
				return;
			}
			if (task.status !== "running") return;
			update((s) => {
				const t = s.tasks.get(taskId);
				if (t !== undefined) t.cancelRequested = true;
			});
			const face = runtime?.sessions.binding(task.workerId)?.session;
			if (face === undefined) {
				markTask(taskId, "failed", "worker 会话不可达，任务终止");
				return;
			}
			try {
				const result = await face.cancel();
				if (result === null || typeof result !== "object" || result.ok !== true) {
					console.warn(LOG_PREFIX, "取消请求被拒绝：", result?.error?.message ?? result?.error?.code ?? "unknown");
					update((s) => {
						const t = s.tasks.get(taskId);
						if (t !== undefined) t.cancelRequested = false;
					});
				}
			} catch (error) {
				console.warn(LOG_PREFIX, "取消失败：", errorMessage(error));
				update((s) => {
					const t = s.tasks.get(taskId);
					if (t !== undefined) t.cancelRequested = false;
				});
			}
		}

		/**
		 * Panel action: re-send a failed/blocked task to the SAME worker
		 * (fallback: original target string). Creates a fresh task record so
		 * history stays append-only.
		 */
		async function retryTask(taskId) {
			const task = state.tasks.get(taskId);
			if (task === undefined || !isTerminalStatus(task.status) || (task.status !== "failed" && task.status !== "blocked")) return;
			const record = state.commanders.get(task.commanderId);
			if (record === undefined) throw new Error("该任务的指挥官已停用，无法重试");
			const target = task.workerId !== "" ? task.workerId : task.alias;
			const text = typeof task.fullText === "string" && task.fullText !== "" ? task.fullText : task.excerpt;
			await dispatchTask(record, { target, title: "", task: text }, null);
		}

		//#region dsh-commander/extras.js
		let lastNotifyAt = 0;

		/** Ask for notification permission inside a user gesture (activation click). */
		function requestNotifyPermission() {
			try {
				if (typeof window === "undefined" || typeof Notification === "undefined") return;
				if (Notification.permission === "default") void Notification.requestPermission();
			} catch {}
		}

		/**
		 * Desktop notification for background awareness (batch settled, stuck,
		 * failed). Throttled and gated on the `notify` setting + permission +
		 * tab-hidden so foreground users are never spammed.
		 */
		function notifyUser(title, body) {
			try {
				if (state.config.notify !== true) return;
				if (typeof window === "undefined" || typeof Notification === "undefined") return;
				if (typeof document !== "undefined" && document.hidden !== true) return;
				if (Notification.permission !== "granted") return;
				const now = Date.now();
				if (now - lastNotifyAt < 5000) return;
				lastNotifyAt = now;
				const n = new Notification(title, { body });
				n.onclick = () => {
					try {
						window.focus();
					} catch {}
				};
			} catch {}
		}

		/**
		 * Manual escape hatch: dispatch straight from the panel without the
		 * model protocol. Still respects the concurrency cap, the worker lock
		 * queue, receipts, and batch accounting.
		 */
		async function directDispatch(commanderId, input) {
			await ensureConfig();
			const record = state.commanders.get(commanderId);
			if (record === undefined) throw new Error("该会话不是激活中的指挥官");
			const task = typeof input?.task === "string" ? input.task.trim() : "";
			if (task === "") throw new Error("任务文本不能为空");
			if (countOutstanding(commanderId) >= positiveInt(state.config.maxOutstanding, 5)) throw new Error("并发任务已达上限，请等待现有任务结算");
			await dispatchTask(record, {
				target: typeof input?.target === "string" ? input.target.trim() : "",
				title: typeof input?.title === "string" ? input.title.trim() : "",
				task,
				fork: "",
				tid: "",
				depends: [],
			}, null);
		}

		/** Settings-panel write-back: merge a whitelisted patch on the host and adopt the resolved result. */
		async function updateConfig(patch) {
			const response = await fetch("/api/dsh-commander/config", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ patch }),
			});
			let data = null;
			try {
				data = await response.json();
			} catch {}
			if (data === null || data.ok !== true) throw new Error(data?.error?.message ?? data?.error?.code ?? "设置保存失败");
			update((s) => {
				s.config = normalizeConfig(data.config);
			});
			return state.config;
		}

		/** One-click Markdown archive of every known task of this commander. */
		function buildReportText(commanderId) {
			const tasks = [...state.tasks.values()].filter((task) => task.commanderId === commanderId).reverse();
			const list = runtime !== null ? runtime.sessions.list.getSnapshot() : undefined;
			const row = list?.byId?.[commanderId];
			const title = row !== undefined && typeof row.displayTitle === "string" && row.displayTitle !== "" ? row.displayTitle : commanderId;
			const lines = [
				"# 指挥官报告 · " + title,
				"生成时间：" + new Date().toLocaleString(),
				"任务数：" + String(tasks.length),
				"",
			];
			for (const task of tasks) {
				lines.push("## [" + (STATUS_LABEL[task.status] ?? task.status) + "] " + ((task.alias !== "" ? task.alias + " " : "") + (task.workerTitle || task.workerId || "待定")));
				lines.push("- 时间：" + fmtTime(task.sentAt));
				lines.push("- 任务：" + String(task.fullText ?? task.excerpt ?? "").replace(/\r?\n/g, " "));
				if (task.detail !== "") lines.push("- 结果：" + String(task.detail).replace(/\r?\n/g, " ⏎ "));
				lines.push("");
			}
			return lines.join("\n");
		}
		//#endregion

		/**
		 * Deliver one receipt into the commander session as a queued prompt —
		 * the closed loop that lets the commander keep orchestrating without
		 * human copy-paste. Skipped when the commander was deactivated meanwhile
		 * or autoReport is off.
		 */
		async function deliverReceipt(task) {
			const record = state.commanders.get(task.commanderId);
			if (record === undefined || !state.config.autoReport) return;
			const label = (task.alias !== "" ? task.alias + " " : "新 ") + "「" + (task.workerTitle || task.workerId) + "」";
			const text =
				"[指挥官回执 · " + label + "]\n状态：" + (task.status === "done" ? "已完成" : "失败") + "\n" +
				(task.detail || "") + "\n" +
				"请根据以上回执继续调度或汇总。";
			const face = runtime.sessions.binding(task.commanderId)?.session;
			if (face === undefined) {
				console.warn(LOG_PREFIX, "无法送达回执：指挥官会话不可达", task.commanderId);
				return;
			}
			try {
				const result = await face.prompt([{ type: "text", text }], "queue");
				if (result === null || typeof result !== "object" || result.ok !== true) {
					console.warn(LOG_PREFIX, "回执被拒绝：", result?.error?.message ?? result?.error?.code ?? "unknown");
				}
			} catch (error) {
				console.warn(LOG_PREFIX, "回执发送失败：", errorMessage(error));
			}
		}
		//#endregion

		//#region dsh-commander/HeaderCommander.js
		/** Human labels + time formatting for the panel. */
		const STATUS_LABEL = { sending: "发送中", running: "运行中", waiting: "排队中", "blocked-dep": "等依赖", done: "已完成", failed: "失败", blocked: "已阻塞", "taken-over": "已接管" };

		function fmtTime(ts) {
			if (!(ts > 0)) return "";
			const d = new Date(ts);
			const pad = (n) => String(n).padStart(2, "0");
			return pad(d.getHours()) + ":" + pad(d.getMinutes());
		}

		/**
		 * The header entry: inactive it offers 「成为指挥官」 with an inline
		 * confirm; active it renders the accent badge (with the live task
		 * counter) toggling the fixed dropdown panel. Session-scoped: rendered
		 * once per staged conversation, reading the engine through the version
		 * tick.
		 */
		const HeaderCommander = react.memo(function HeaderCommander({ useSession }) {
			const snapshot = useSession((s) => s);
			const sessionId = snapshot.sessionId;
			useEngineTick();
			const [phase, setPhase] = react.useState("idle");
			const [error, setError] = react.useState("");

			react.useEffect(() => {
				setPhase("idle");
				setError("");
			}, [sessionId]);

			const isActive = state.active.includes(sessionId);
			const busyRef = react.useRef(false);

			const doActivate = async () => {
				if (busyRef.current) return; // a double click must not inject the briefing twice
				busyRef.current = true;
				setPhase("working");
				setError("");
				requestNotifyPermission(); // user gesture: the right moment to ask
				try {
					await activate(sessionId);
					setPhase("idle");
				} catch (caught) {
					setError(errorMessage(caught));
					setPhase("error");
				} finally {
					busyRef.current = false;
				}
			};

			if (!isActive) {
				if (phase === "confirm") {
					return react_jsx_runtime.jsx("span", {
						className: "dsh-cmdr-confirm",
						"data-commander": true,
						children: [
							react_jsx_runtime.jsx("span", { children: "注入指挥官协议与花名册？" }, "prompt"),
							react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", disabled: phase === "working", onClick: () => void doActivate(), children: "确认" }, "yes"),
							react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", onClick: () => setPhase("idle"), children: "取消" }, "no"),
						],
					}, "confirm");
				}
				if (phase === "working") {
					return react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dsh-cmdr-badge",
						disabled: true,
						"data-commander": true,
						children: "指令注入中…",
					}, "working");
				}
				if (phase === "error") {
					return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
						children: [
							react_jsx_runtime.jsx("span", { className: "dsh-cmdr-error", children: "激活失败：" + error }, "err"),
							react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", onClick: () => void doActivate(), children: "重试" }, "retry"),
							react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", onClick: () => setPhase("idle"), children: "取消" }, "cancel"),
						],
					}, "error");
				}
				return react_jsx_runtime.jsx("button", {
					type: "button",
					className: "dsh-cmdr-badge",
					title: "把当前会话设为指挥官：可在对话中派发任务给其他会话",
					"data-commander": true,
					onClick: () => setPhase("confirm"),
					children: "成为指挥官",
				}, "idle");
			}

			const record = state.commanders.get(sessionId);
			const tasks = [...state.tasks.values()].filter((task) => task.commanderId === sessionId).reverse();
			const runningCount = tasks.filter((task) => task.status === "sending" || task.status === "running").length;
			const open = state.panelOpenFor === sessionId;

			const togglePanel = () => {
				update((s) => {
					s.panelOpenFor = s.panelOpenFor === sessionId ? null : sessionId;
				});
			};

			return react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
				children: [
					react_jsx_runtime.jsxs("button", {
						type: "button",
						className: "dsh-cmdr-badge",
						"data-active": "true",
						"data-commander": true,
						title: "指挥官模式运行中，点击打开任务面板",
						onClick: togglePanel,
						children: [
							"指挥官",
							runningCount > 0 ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-count", children: String(runningCount) }, "count") : null,
						],
					}, "badge"),
					open && record !== undefined
						? react_jsx_runtime.jsx(CommanderPanel, {
								sessionId,
								record,
								tasks,
								runningCount,
							}, "panel")
						: null,
				],
			}, "active");
		});

		/** The fixed dropdown panel: composer, tasks, roster, report, settings. */
		const CommanderPanel = react.memo(function CommanderPanel({ sessionId, record, tasks, runningCount }) {
			const roster = record.roster ?? [];
			const doRefresh = () => {
				refreshRoster(sessionId).catch((error) => console.warn("[dsh-commander]", errorMessage(error)));
			};
			const doStop = () => {
				deactivate(sessionId);
			};
			const openWorker = (workerId) => {
				if (typeof workerId === "string" && workerId !== "") runtime?.sessions.open(workerId);
			};

			// Manual direct dispatch (bypasses the model protocol, keeps all guards).
			const [composeTarget, setComposeTarget] = react.useState("");
			const [composeText, setComposeText] = react.useState("");
			const [composeBusy, setComposeBusy] = react.useState(false);
			const [composeErr, setComposeErr] = react.useState("");
			const doCompose = async () => {
				if (composeBusy || composeText.trim() === "") return;
				setComposeBusy(true);
				setComposeErr("");
				try {
					await directDispatch(sessionId, { target: composeTarget, task: composeText });
					setComposeText("");
				} catch (caught) {
					setComposeErr(errorMessage(caught));
				} finally {
					setComposeBusy(false);
				}
			};

			// Settings editor: draft over the resolved config, saved via host write-back.
			const [showSettings, setShowSettings] = react.useState(false);
			const [draft, setDraft] = react.useState(null);
			const [settingsMsg, setSettingsMsg] = react.useState("");
			const toggleSettings = () => {
				if (!showSettings) {
					setDraft({
						pollIntervalMs: state.config.pollIntervalMs,
						maxOutstanding: state.config.maxOutstanding,
						autoReport: state.config.autoReport,
						autoLabelWorkers: state.config.autoLabelWorkers,
						notify: state.config.notify,
						maxContinuations: state.config.maxContinuations,
					});
					setSettingsMsg("");
				}
				setShowSettings((value) => !value);
			};
			const saveSettings = async () => {
				if (draft === null) return;
				setSettingsMsg("保存中…");
				try {
					await updateConfig({
						pollIntervalMs: Number(draft.pollIntervalMs),
						maxOutstanding: Number(draft.maxOutstanding),
						autoReport: draft.autoReport === true,
						autoLabelWorkers: draft.autoLabelWorkers === true,
						notify: draft.notify === true,
						maxContinuations: Number(draft.maxContinuations),
					});
					setSettingsMsg("已保存并生效");
				} catch (caught) {
					setSettingsMsg("保存失败：" + errorMessage(caught));
				}
			};
			const copyReport = async () => {
				const text = buildReportText(sessionId);
				try {
					if (navigator.clipboard !== undefined) await navigator.clipboard.writeText(text);
					else throw new Error("no clipboard api");
					console.info("[dsh-commander] 报告已复制到剪贴板");
				} catch {
					try {
						const area = document.createElement("textarea");
						area.value = text;
						document.body.appendChild(area);
						area.select();
						document.execCommand("copy");
						area.remove();
						console.info("[dsh-commander] 报告已复制（fallback）");
					} catch (error) {
						console.warn("[dsh-commander] 复制报告失败：", errorMessage(error));
					}
				}
			};

			return react_jsx_runtime.jsxs("div", {
				className: "dsh-cmdr-panel",
				"data-commander-panel": true,
				children: [
					react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-phead", children: [
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-ptitle", children: "指挥官面板" }, "t"),
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-spacer" }, "sp"),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: doRefresh, children: "刷新花名册" }, "rf"),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: doStop, children: "停止指挥" }, "st"),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", title: "关闭", onClick: () => update((s) => { s.panelOpenFor = null; }), children: "×" }, "cl"),
					] }, "head"),
					typeof record.error === "string" && record.error !== ""
						? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-notice", children: record.error }, "notice")
						: null,
					react_jsx_runtime.jsx("div", { className: "dsh-cmdr-sect", children: "手动直派" }, "sect0"),
					react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-compose", "data-commander-compose": true, children: [
						react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-crow", children: [
							react_jsx_runtime.jsxs("select", {
								className: "dsh-cmdr-select",
								value: composeTarget,
								onChange: (event) => setComposeTarget(event.target.value),
								children: [
									react_jsx_runtime.jsx("option", { value: "", children: "➕ 新建会话" }, "new"),
									...roster.map((row) => react_jsx_runtime.jsxs("option", { value: row.id, children: [row.alias + " " + row.title] }, row.id)),
								],
							}, "sel"),
							composeText.trim() !== ""
								? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", disabled: composeBusy, onClick: () => void doCompose(), children: composeBusy ? "派发中…" : "直派" }, "go")
								: null,
						] }, "row1"),
						react_jsx_runtime.jsx("textarea", {
							className: "dsh-cmdr-input",
							rows: 2,
							placeholder: "手动直派：写清任务后点「直派」，无需模型输出协议块",
							value: composeText,
							onChange: (event) => setComposeText(event.target.value),
						}, "ta"),
						composeErr !== "" ? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-notice", children: composeErr }, "cerr") : null,
					] }, "compose"),
					react_jsx_runtime.jsx("div", {
						className: "dsh-cmdr-sect",
						children: "任务（进行中 " + String(runningCount) + " · 共 " + String(tasks.length) + "）",
					}, "sect1"),
					tasks.length === 0
						? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-empty", children: "还没有任务。在下方对话中输出 <dsh-dispatch> 块即可派发。" }, "tempty")
						: null,
					...(tasks.map((task) => react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-task", children: [
								react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-trow", children: [
									react_jsx_runtime.jsx("span", { className: "dsh-cmdr-dot", "data-status": task.status }, "dot"),
									react_jsx_runtime.jsxs("span", { className: "dsh-cmdr-tname", children: [
										STATUS_LABEL[task.status] ?? task.status,
										" · ",
										(task.alias !== "" ? task.alias + " " : "") + (task.workerTitle || task.workerId || "待定"),
									] }, "name"),
									task.stuck === true ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "worker 正在等待权限确认等人工交互", children: "待确认" }, "stuck") : null,
									task.slow === true ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "该任务运行时间已超过 stuckTimeoutMs", children: "超时" }, "slow") : null,
									react_jsx_runtime.jsx("span", { className: "dsh-cmdr-ttime", children: fmtTime(task.sentAt) }, "time"),
									task.settledAt > 0 && task.sentAt > 0
										? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "结算耗时", children: Math.max(1, Math.round((task.settledAt - task.sentAt) / 1000)) + "s" }, "dur")
										: null,
									(task.status === "running" || task.status === "sending")
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => void cancelTask(task.id), children: "停止" }, "cancel")
										: null,
									(task.status === "failed" || task.status === "blocked") && state.commanders.has(task.commanderId)
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => void retryTask(task.id).catch((error) => console.warn("[dsh-commander]", errorMessage(error))), children: "重试" }, "retry")
										: null,
									task.workerId !== ""
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => openWorker(task.workerId), children: "打开" }, "open")
										: null,
								] }, "row"),
								react_jsx_runtime.jsx("div", { className: "dsh-cmdr-tex", children: task.excerpt }, "ex"),
								task.detail !== "" ? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-tdetail", children: truncateText(task.detail, 300) }, "dt") : null,
							] }, task.id))),
					react_jsx_runtime.jsx("div", { className: "dsh-cmdr-sect", children: "花名册（" + String(roster.length) + " 个可用 worker）" }, "sect2"),
					roster.length === 0
						? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-empty", children: "暂无其他会话；派发时省略 target 将自动新建 worker。" }, "rempty")
						: null,
					...(roster.map((row) => react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-rrow", children: [
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-ralias", children: row.alias }, "a"),
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-rtitle", children: row.title }, "t"),
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-rdot", "data-running": row.running === true ? "true" : "false" }, "d"),
					] }, row.id))),
					react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-phead", children: [
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => void copyReport(), children: "复制报告" }, "rep"),
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-spacer" }, "sp"),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: toggleSettings, children: showSettings ? "收起设置" : "设置" }, "cfg"),
					] }, "actions"),
					showSettings && draft !== null
						? react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-settings", "data-commander-settings": true, children: [
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["轮询间隔 (ms)", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 500, max: 60000, value: String(draft.pollIntervalMs), onChange: (event) => setDraft({ ...draft, pollIntervalMs: Number(event.target.value) }) })] }, "pi"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["并发任务上限", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 1, max: 32, value: String(draft.maxOutstanding), onChange: (event) => setDraft({ ...draft, maxOutstanding: Number(event.target.value) }) })] }, "mo"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["中断续跑次数", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 0, max: 5, value: String(draft.maxContinuations), onChange: (event) => setDraft({ ...draft, maxContinuations: Number(event.target.value) }) })] }, "mc"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.autoReport === true, onChange: (event) => setDraft({ ...draft, autoReport: event.target.checked }) }), "自动回执注入"] }, "ar"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.autoLabelWorkers === true, onChange: (event) => setDraft({ ...draft, autoLabelWorkers: event.target.checked }) }), "新 worker 自动标注标题"] }, "al"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.notify === true, onChange: (event) => setDraft({ ...draft, notify: event.target.checked }) }), "后台桌面通知"] }, "nt"),
								settingsMsg !== "" ? react_jsx_runtime.jsx("div", { children: settingsMsg }, "smsg") : null,
								react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", onClick: () => void saveSettings(), children: "保存设置" }, "save"),
							] }, "settings")
						: null,
					react_jsx_runtime.jsx("div", {
						className: "dsh-cmdr-foot",
						children: '派发格式：<dsh-dispatch target="#1" title="标题" fork="commander" depends="a">任务</dsh-dispatch> · 结果将以「[指挥官回执]」注入本会话。',
					}, "foot"),
				],
			});
		});
		//#endregion

		//#region dsh-commander/GlobalIndicator.js
		/**
		 * The global pill (shell.overlay seat): one compact entry per active
		 * commander with its live outstanding-task count, visible from ANY
		 * conversation. Clicking an entry jumps to that commander session.
		 * Renders nothing until a commander is active.
		 */
		const GlobalIndicator = react.memo(function GlobalIndicator() {
			useEngineTick();
			if (runtime === null || state.booted !== true || state.active.length === 0) return null;
			const list = runtime.sessions.list.getSnapshot();
			return react_jsx_runtime.jsxs("div", {
				className: "dsh-cmdr-gpill",
				"data-commander-global": true,
				children: [
					react_jsx_runtime.jsx("span", { className: "dsh-cmdr-glabel", children: "指挥官" }, "label"),
					state.active.map((sessionId) => {
						const count = countOutstanding(sessionId);
						const row = list.byId[sessionId];
						const title = row !== undefined && typeof row.displayTitle === "string" && row.displayTitle !== "" ? row.displayTitle : sessionId;
						return react_jsx_runtime.jsxs("button", {
							type: "button",
							className: "dsh-cmdr-gitem",
							title: "打开指挥官会话：" + title,
							onClick: () => runtime.sessions.open(sessionId),
							children: [
								react_jsx_runtime.jsx("span", { className: "dsh-cmdr-gtitle", children: title }, "t"),
								count > 0 ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-count", children: String(count) }, "c") : null,
							],
						}, sessionId);
					}),
				],
			});
		});
		//#endregion

		//#region dsh-commander/index.js
		/**
		 * Client plugin body: two additive seats —
		 * 1. `conversation.session.header.actions` (the same seat the compressor
		 *    and continue-on-limit ride): the commander badge / panel.
		 * 2. `shell.overlay` (global): the always-visible indicator pill.
		 * The engine lives at module scope, so orchestration continues
		 * regardless of which conversation is staged.
		 * @param ctx - client root context.
		 */
		const inject = ["slots", "sessions"];
		function apply(ctx) {
			const sessions = ctx.get("sessions");
			boot(sessions);
			const Entry = (props) => react_jsx_runtime.jsx(HeaderCommander, { ...props });
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "dsh-commander",
				priority: 10,
			}, Entry));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-commander-global",
				priority: 20,
			}, (props) => react_jsx_runtime.jsx(GlobalIndicator, { ...props })));
		}
		//#endregion

		exports.CONFIG_DEFAULTS = CONFIG_DEFAULTS;
		exports.loadConfig = loadConfig;
		exports.normalizeConfig = normalizeConfig;
		exports.parseDispatchBlocks = parseDispatchBlocks;
		exports.truncateText = truncateText;
		exports.expandBlocks = expandBlocks;
		exports.evaluateBatch = evaluateBatch;
		exports.buildRoster = buildRoster;
		exports.briefingText = briefingText;
		exports.state = state;
		exports.boot = boot;
		exports.activate = activate;
		exports.deactivate = deactivate;
		exports.refreshRoster = refreshRoster;
		exports.countOutstanding = countOutstanding;
		exports.hasOutstanding = hasOutstanding;
		exports.fetchEvents = fetchEvents;
		exports.injectBriefing = injectBriefing;
		exports.poll = poll;
		exports.cancelTask = cancelTask;
		exports.retryTask = retryTask;
		exports.directDispatch = directDispatch;
		exports.updateConfig = updateConfig;
		exports.buildReportText = buildReportText;
		exports.notifyUser = notifyUser;
		exports.requestNotifyPermission = requestNotifyPermission;
		exports.HeaderCommander = HeaderCommander;
		exports.GlobalIndicator = GlobalIndicator;
		exports.apply = apply;
		exports.inject = inject;
	return module.exports;
	}
});
