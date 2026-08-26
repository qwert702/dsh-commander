window.__ModuleLoader__.load({
	id: "dsh-commander",
	factory: (require) => {
// ============================================================================
// dsh-commander — browser half (hand-written bundle, family style).
//
// REGION MAP (search for `#region dsh-commander/<name>`):
//   styles            one injected <style>, all classes prefixed dsh-cmdr-
//   config            CONFIG_DEFAULTS / loadConfig / normalizeConfig clamps
//   protocol          parseDispatchBlocks / expandBlocks(broadcast) / delay
//   policy            evaluateBatch burst gates + timing constants
//   roster            buildRoster(+live load) / briefingText(协议简报)
//   store             module-level state, update()/subscribe, persistence
//   api               fetchEvents / injectBriefing wrappers
//   engine            boot/activate/restore/probeTailWithRetry/poll/
//                     processCommander/openTask/deps gate/dispatchTask/
//                     locks+queue/monitorTasks/batch summaries/cancel/retry
//   extras            notifications/updateConfig/directDispatch/report/stats
//   HeaderCommander   badge + dropdown panel UI (session-scoped seat)
//   GlobalIndicator   shell.overlay pill (root-scoped seat)
//   SettingsSection   native settings.section page (root-scoped seat)
//
// INVARIANTS maintained across the file (soak-tested in test/soak.cjs):
//   - workerLocks ⊆ non-terminal tasks; lock key === task.workerId
//   - every `waiting` task sits in waitQueue[workerId]
//   - terminal statuses are final; cursors never regress
//   - a failed tail-anchor probe NEVER degrades to cursor 0
// ============================================================================
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		// Single-engine takeover guard: HMR or a double seat-mount can inject
		// this bundle twice. Two live engines would EACH poll the host events
		// route with their own cursor and dispatch the same tail — duplicated
		// workers, duplicated receipts, vanishing commander badges. A freshly
		// loaded copy therefore SHUTS THE PREVIOUS ENGINE DOWN (boot() wires
		// window.__dshCommanderShutdown) before bringing itself up.

		/**
		 * Build stamp printed at boot so a STALE SERVED BUNDLE is detectable
		 * from the console: the host webserver may keep serving an older copy
		 * of this file until the harness restarts, and a page refresh alone
		 * then silently runs yesterday's engine. Bump on every shipped edit.
		 */
		const ENGINE_BUILD = "dsh-commander client r27";

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
			'.dsh-cmdr-dot[data-status="scheduled"]{background:#c9a227}' +
			'.dsh-cmdr-dot[data-status="blocked-dep"]{background:#b8860b}' +
			'.dsh-cmdr-dot[data-status="done"]{background:#34a853}' +
			'.dsh-cmdr-dot[data-status="failed"],.dsh-cmdr-dot[data-status="blocked"]{background:var(--dsw-alias-label-danger,#c0392b)}' +
			'.dsh-cmdr-dot[data-status="taken-over"]{background:#f0a000}' +
			".dsh-cmdr-flag{flex:none;font-size:10px;line-height:16px;padding:0 5px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover);color:#b8860b}" +
			".dsh-cmdr-tname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			".dsh-cmdr-ttime{flex:none;margin-left:auto;font-size:10px;color:var(--dsw-alias-label-tertiary)}" +
			".dsh-cmdr-tex{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
			".dsh-cmdr-tdetail{font-size:11px;line-height:1.6;color:var(--dsw-alias-label-tertiary);white-space:pre-wrap}" +
			".dsh-cmdr-tfilelist{display:flex;flex-direction:column;gap:2px}" +
			".dsh-cmdr-file{font-family:var(--dsw-font-code,ui-monospace,monospace);font-size:10px;line-height:1.6;color:var(--dsw-alias-label-secondary);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
			".dsh-cmdr-file:hover{color:var(--dsw-alias-label-primary)}" +
			".dsh-cmdr-full{max-height:240px;overflow:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-primary);white-space:pre-wrap}" +
			".dsh-cmdr-native-settings{display:flex;flex-direction:column;gap:8px;max-width:520px}" +
			".dsh-cmdr-sdesc{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary);margin:0}" +
			".dsh-cmdr-stats{display:flex;flex-direction:column;gap:3px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px}" +
			".dsh-cmdr-statrow{display:flex;gap:10px;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-secondary)}" +
			".dsh-cmdr-statrow-total{border-top:1px solid var(--dsw-alias-border-l2);padding-top:3px;color:var(--dsw-alias-label-primary);font-weight:600}" +
			".dsh-cmdr-statproj{min-width:90px;color:var(--dsw-alias-label-primary)}" +
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
			maxFailovers: 1,
			maxNewWorkersPerBatch: 3,
			confirmDispatch: false,
			panelApprovals: true,
			strictProjectScope: true,
			maxTasksPerWorker: 2,
			reportTakeover: true,
			takeoverFollow: true,
			takeoverOnHuman: false,
			dedupDispatch: true,
			mailHintOnDispatch: true,
			worktreeBase: '',
			worktreeAutoCleanup: false,
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
			config.maxFailovers = zeroAllowedInt(config.maxFailovers, 1, 0, 3);
			config.maxNewWorkersPerBatch = zeroAllowedInt(config.maxNewWorkersPerBatch, 3, 0, 16);
			config.confirmDispatch = config.confirmDispatch === true;
			config.panelApprovals = config.panelApprovals !== false;
			config.strictProjectScope = config.strictProjectScope !== false;
			config.maxTasksPerWorker = zeroAllowedInt(config.maxTasksPerWorker, 2, 0, 32);
			config.reportTakeover = config.reportTakeover !== false;
			config.mailHintOnDispatch = config.mailHintOnDispatch !== false;
			config.takeoverFollow = config.takeoverFollow !== false;
			config.takeoverOnHuman = config.takeoverOnHuman === true;
			config.dedupDispatch = config.dedupDispatch !== false;
			config.worktreeBase = typeof config.worktreeBase === 'string' ? config.worktreeBase : '';
			config.worktreeAutoCleanup = config.worktreeAutoCleanup === true;
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
		const MAIL_RE = /<dsh-mail\b([^>]*)>([\s\S]*?)<\/dsh-mail>/g;
		// Attribute values: double-quoted, single-quoted, or bare token. Models
		// regularly emit `target='#1'` / `target=#1`; only matching one style
		// used to silently degrade such blocks into "auto-create a worker".
		const ATTR_RE = /([a-zA-Z_][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
		/** Pull the matched value out of whichever ATTR_RE alternative hit. */
		function attrValue(match) {
			return match[2] ?? match[3] ?? match[4] ?? "";
		}
		const MAIL_LEASES_MAX = 20;
		const RT_RE = /<dsh-roundtable\b([^>]*)>([\s\S]*?)<\/dsh-roundtable>/g;

		/** Parse roundtable blocks from one assistant text. */
		function parseRoundtableBlocks(text) {
			const blocks = [];
			if (typeof text !== "string" || text.indexOf("<dsh-roundtable") === -1) return blocks;
			RT_RE.lastIndex = 0;
			let match;
			while ((match = RT_RE.exec(text)) !== null) {
				const attrs = {};
				ATTR_RE.lastIndex = 0;
				let attr;
				while ((attr = ATTR_RE.exec(match[1])) !== null) attrs[attr[1].toLowerCase()] = attrValue(attr);
				const body = (match[2] ?? "").trim();
				if (body === "") continue;
				blocks.push({
					topic: typeof attrs.topic === "string" ? attrs.topic.trim().slice(0, 300) : "",
					count: Math.min(Math.max(Number(attrs.count) || 3, 3), 6),
					isolate: typeof attrs.isolate === "string" ? attrs.isolate.trim() : "",
					body,
				});
			}
			return blocks;
		}

		/**
		 * Parse worker/commander mail blocks: identities are roster aliases
		 * (resolved by the engine), `*` broadcasts to every roster row, and
		 * `leases` is an advisory comma list of file paths/globs.
		 */
		function parseMailBlocks(text) {
			const mails = [];
			if (typeof text !== "string" || text.indexOf("<dsh-mail") === -1) return mails;
			MAIL_RE.lastIndex = 0;
			let match;
			while ((match = MAIL_RE.exec(text)) !== null) {
				const attrs = {};
				ATTR_RE.lastIndex = 0;
				let attr;
				while ((attr = ATTR_RE.exec(match[1])) !== null) attrs[attr[1].toLowerCase()] = attrValue(attr);
				const body = (match[2] ?? "").trim();
				if (body === "") continue;
				mails.push({
					to: typeof attrs.to === "string" ? attrs.to.trim() : "",
					subject: typeof attrs.subject === "string" ? attrs.subject.trim().slice(0, 300) : "",
					leases: typeof attrs.leases === "string"
						? attrs.leases.split(",").map((part) => part.trim()).filter((part) => part !== "").slice(0, MAIL_LEASES_MAX)
						: [],
					body,
				});
			}
			return mails;
		}

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
				while ((attr = ATTR_RE.exec(match[1])) !== null) attrs[attr[1].toLowerCase()] = attrValue(attr);
				const task = (match[2] ?? "").trim();
				if (task === "") continue;
				blocks.push({
					target: typeof attrs.target === "string" ? attrs.target.trim() : "",
					title: typeof attrs.title === "string" ? attrs.title.trim() : "",
					fork: typeof attrs.fork === "string" ? attrs.fork.trim() : "",
					isolate: typeof attrs.isolate === "string" ? attrs.isolate.trim() : "",
					tid: typeof attrs.tid === "string" ? attrs.tid.trim() : "",
				delay: typeof attrs.delay === "string" ? attrs.delay.trim() : "",
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
		 * Parse a human delay ("30s" / "10m" / "1h" / plain seconds) to ms.
		 * Returns 0 for anything unparseable — the task simply fires immediately.
		 */
		function parseDelayMs(raw) {
			const s = String(raw ?? "").trim().toLowerCase();
			if (s === "") return 0;
			const match = s.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/);
			if (match === null) return 0;
			const value = Number(match[1]);
			if (!Number.isFinite(value) || value <= 0) return 0;
			const unitMs = match[2] === "ms" ? 1 : match[2] === "m" ? 60000 : match[2] === "h" ? 3600000 : 1000;
			return Math.min(Math.round(value * unitMs), 24 * 3600000);
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
			let src = 0;
			for (const block of Array.isArray(blocks) ? blocks : []) {
				const raw = String(block?.target ?? "").trim();
				// `src` marks the SOURCE protocol block: sibling targets expanded
				// from one broadcast share it, so admission-time dedup can tell
				// intentional fan-out apart from accidental duplicate blocks.
				if (raw.toLowerCase() === "all" || raw === "*") {
					for (const row of roster ?? []) out.push({ ...block, target: row.id, src });
					src += 1;
					continue;
				}
				if (raw.indexOf(",") !== -1) {
					// De-duplicate repeated targets ("#1,#1"): siblings share src,
					// so without this the broadcast exemption would double-fire.
					const seenTargets = new Set();
					for (const part of raw.split(",")) {
						const target = part.trim();
						if (target === "" || seenTargets.has(target)) continue;
						seenTargets.add(target);
						out.push({ ...block, target, src });
					}
					src += 1;
					continue;
				}
				out.push({ ...block, src });
				src += 1;
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
		 * Caps applied, in order of tightness: per-activation cumulative,
		 * concurrent outstanding, per-message block count, and the burst cap on
		 * AUTO-CREATED conversations (target omitted) — "一次性最多开几个对话".
		 * @param blocks - parsed dispatch blocks from new commander output.
		 * @param st - live counters { outstanding, dispatchedTotal }.
		 * @param config - resolved plugin configuration.
		 * @returns { action: 'disabled'|'empty'|'cap'|'execute', items?, dropped?, reason?, autoDropped? }
		 */
		/** Normalize a task text into a dedup key: case/whitespace-insensitive exact match.
		 * Key budget matches openTask's fullText truncation (maxTaskChars) so
		 * admission-side raw tasks and history-side stored fullText stay aligned. */
		function normTaskKey(text) {
			const budget = Math.max(50, positiveInt(state.config.maxTaskChars, 4000));
			return String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, budget);
		}

		/**
		 * Pure admission gate for one parsed reply: caps by message size,
		 * outstanding budget and activation lifetime; bounds auto-created
		 * sessions per reply; and — when `dedupDispatch` is on — drops blocks
		 * whose normalized task text duplicates ANOTHER block in this reply or
		 * a still-active task (the model loves re-sending the same job to a
		 * second worker). One block with multiple targets is intentional
		 * broadcast and can never self-duplicate here.
		 * @param blocks - parsed dispatch blocks from new commander output.
		 * @param st - live counters { outstanding, dispatchedTotal }.
		 * @param config - resolved plugin configuration.
		 * @param activeTaskKeys - optional Set of normalized task texts that are currently non-terminal.
		 * @returns { action: 'disabled'|'empty'|'cap'|'execute', items?, dropped?, reason?, autoDropped?, dedupDropped? }
		 */
		function evaluateBatch(blocks, st, config, activeTaskKeys) {
			if (config.enabled !== true) return { action: "disabled", reason: "插件已在设置中禁用" };
			if (!Array.isArray(blocks) || blocks.length === 0) return { action: "empty" };
			const perMessageRoom = positiveInt(config.maxPerMessage, 8);
			const outstandingRoom = Math.max(0, positiveInt(config.maxOutstanding, 5) - (st.outstanding | 0));
			const activationRoom = Math.max(0, ACTIVATION_TASK_CAP - (st.dispatchedTotal | 0));
			let items = blocks;
			let autoDropped = 0;
			let dedupDropped = 0;
			const newWorkerCap = zeroAllowedInt(config.maxNewWorkersPerBatch, 3, 0, 16);
			if (newWorkerCap < items.filter((block) => (block.target ?? "") === "").length) {
				const limited = [];
				let seenNew = 0;
				for (const block of items) {
					const isNew = (block.target ?? "") === "";
					if (isNew && seenNew >= newWorkerCap) {
						autoDropped += 1;
						continue;
					}
					if (isNew) seenNew += 1;
					limited.push(block);
				}
				items = limited;
			}
			if (config.dedupDispatch !== false && (items.length > 1 || (activeTaskKeys !== undefined && activeTaskKeys.size > 0))) {
				const seen = new Map(); // normKey -> src of the kept copy
				const kept = [];
				for (const block of items) {
					const key = normTaskKey(block.task);
					const firstSrc = seen.get(key);
					if (firstSrc !== undefined) {
						// Same text twice in THIS reply: siblings of ONE broadcast
						// block (shared src) are intentional fan-out — keep them.
						// Two SEPARATE blocks with identical text is exactly the
						// accidental double-dispatch this gate exists to correct.
						if (!(block.src !== undefined && block.src === firstSrc)) { dedupDropped += 1; continue; }
					} else if (activeTaskKeys !== undefined && activeTaskKeys.has(key)) {
						dedupDropped += 1; continue; // same job already in flight
					}
					seen.set(key, block.src);
					kept.push(block);
				}
				items = kept;
			}
			const room = Math.min(perMessageRoom, outstandingRoom, activationRoom, items.length);
			const permanent = activationRoom <= 0; // 单次激活累计上限：不可恢复，必须消费批次
			if (room <= 0 && autoDropped === 0 && dedupDropped === 0) {
				const reason = permanent
					? "单次激活累计派发已达上限（" + ACTIVATION_TASK_CAP + "），请重新激活指挥官"
					: outstandingRoom <= 0
						? "并发任务已达上限（" + positiveInt(config.maxOutstanding, 5) + "）"
						: "单条消息任务块数已达上限";
				return { action: "cap", items: [], dropped: blocks.length, reason, permanent };
			}
			const admitted = items.slice(0, room);
			const droppedCount = Math.max(0, blocks.length - admitted.length - autoDropped - dedupDropped);
			// Action semantics:
			//   admitted>0                                  → execute (dispatch now)
			//   nothing admitted but cap-drops remain        → cap (transient: leave
			//                                                  the cursor so the
			//                                                  batch retries next
			//                                                  tick when room frees)
			//   only dedup/auto drops, nothing cap-blocked   → execute (consume the
			//                                                  tail + surface the
			//                                                  [指挥官提示] notice;
			//                                                  retrying could never
			//                                                  succeed anyway)
			let action = "empty";
			if (admitted.length > 0) action = "execute";
			else if (droppedCount > 0) action = "cap";
			else if (autoDropped > 0 || dedupDropped > 0) action = "execute";
			return {
				action,
				items: admitted,
				dropped: droppedCount,
				autoDropped,
				dedupDropped,
				permanent,
			};
		}
		//#endregion

		//#region dsh-commander/roster.js
		/**
		 * Build the worker roster from one list snapshot: every non-blank
		 * session except the commander itself, aliased `#1..#N` for the model
		 * to reference cheaply. Aliases are DETERMINISTIC (stable session-id
		 * ordering, not locale sorts — the model's mental map of "#N -> session"
		 * lives in one injected briefing). When `loadById` is given, each row
		 * carries its live task load so the briefing can steer the model toward
		 * balanced dispatching.
		 * @param list - sessions.list snapshot { ids, byId }.
		 * @param commanderId - the commander session (excluded).
		 * @param loadById - optional Map workerId -> active/waiting task count.
		 * @returns the roster rows [{ alias, id, title, cwd, running, load }].
		 */
		function buildRoster(list, commanderId, loadById) {
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
					load: loadById !== undefined && loadById !== null ? loadById.get(id) | 0 : 0,
				});
			}
			rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
			return rows.map((row, index) => ({ alias: "#" + String(index + 1), ...row }));
		}

		/** Normalize a cwd string into a comparable project key. */
		function normProj(p) {
			return typeof p === 'string' ? p.replace(/[\\/]+$/, '').toLowerCase() : '';
		}

		/** Active (non-terminal) task count per worker, including scheduled. */
		function activeLoadByWorker() {
			const loads = new Map();
			for (const task of state.tasks.values()) {
				if (!['sending', 'running', 'waiting', 'scheduled'].includes(task.status)) continue;
				const key = typeof task.workerId === 'string' ? task.workerId : '';
				if (key === '') continue;
				loads.set(key, (loads.get(key) | 0) + 1);
			}
			return loads;
		}

		/**
		 * Resolve and deliver mail blocks emitted by one session (commander or
		 * worker). Recipients are roster aliases (#N), '*' (all roster rows),
		 * or full session ids. Strict project scope filters foreign projects.
		 */
		async function deliverMailFromBlocks(record, sourceSessionId, blocks) {
			const list = runtime.sessions.list.getSnapshot();
			for (const mail of blocks) {
				let targets = [];
				const raw = String(mail.to ?? '').trim();
				if (raw.toLowerCase() === 'all') targets = (record.roster ?? []).map((row) => row.id);
				else if (raw.indexOf(',') !== -1) targets = raw.split(',').map((part) => part.trim()).filter((part) => part !== '');
				else targets = [raw];
				const resolved = [];
				for (const target of targets) {
					if (target === '' || target === sourceSessionId) continue;
					const row = (record.roster ?? []).find((r) => r.alias === target || r.id === target)
						?? (list.byId[target] !== undefined ? { id: target, title: list.byId[target].displayTitle || target } : undefined);
					if (row === undefined) continue;
					if (state.config.strictProjectScope === true) {
						const senderProj = normProj(list.byId[sourceSessionId]?.cwd);
						const rowProj = normProj(list.byId[row.id]?.cwd);
						if (senderProj !== '' && rowProj !== '' && senderProj !== rowProj) continue;
					}
					if (!resolved.some((r) => r.id === row.id)) resolved.push(row);
				}
				if (resolved.length === 0) {
					console.warn(LOG_PREFIX, '邮件无有效收件人：', truncateText(raw || mail.subject, 40));
					continue;
				}
				const result = await postMail({
					from: sourceSessionId,
					to: resolved.map((row) => row.id),
					subject: mail.subject,
					body: mail.body,
					leases: mail.leases,
				});
				if (!result.ok) {
					console.warn(LOG_PREFIX, '邮件投递失败：', result.error?.message ?? 'unknown');
					continue;
				}
				console.info(LOG_PREFIX, '邮件已投递：', truncateText(mail.subject || mail.body, 40), '→', resolved.map((row) => row.alias).join(','));
				for (const row of resolved) {
					if (row.id === record.sessionId) continue; // commander sees it in the panel inbox
					const face = runtime.sessions.binding(row.id)?.session;
					if (face === undefined) continue;
					try {
						await face.prompt([{ type: 'text', text: '[指挥官邮箱] 来自「' + (list.byId[sourceSessionId]?.displayTitle || sourceSessionId) + '」的消息\n主题：' + (mail.subject || '(无)') + '\n' + mail.body }], 'queue');
					} catch {}
				}
			}
		}

		/** Active (running/sending/waiting/blocked-dep) task count per worker, for roster load hints. */
		function workerLoadById() {			const loads = new Map();
			for (const task of state.tasks.values()) {
				if (task.status === "done" || task.status === "failed" || task.status === "blocked" || task.status === "taken-over") continue;
				if (typeof task.workerId !== "string" || task.workerId === "") continue;
				loads.set(task.workerId, (loads.get(task.workerId) | 0) + 1);
			}
			return loads;
		}

		/**
		 * Pick the failover target for a failed task: another worker from the
		 * roster — not the commander itself, not an active commander (hop
		 * budget), not the one that just failed — sorted by live load, first
		 * reachable idle candidate wins. null when nobody qualifies.
		 */
		function pickFailoverCandidate(record, excludeWorkerId) {
			const loads = workerLoadById();
			const list = runtime.sessions.list.getSnapshot();
			const cmdProj = normProj(list.byId[record.sessionId]?.cwd);
			const rows = [...(record.roster ?? [])]
				.filter((row) => {
					if (row.id === excludeWorkerId || row.id === record.sessionId || state.active.includes(row.id)) return false;
					if (cmdProj !== '' && normProj(list.byId[row.id]?.cwd) !== cmdProj) return false;
					return true;
				})
				.sort((a, b) => (loads.get(a.id) | 0) - (loads.get(b.id) | 0));
			for (const row of rows) {
				const face = runtime.sessions.binding(row.id)?.session;
				if (face === undefined) continue;
				const listRow = runtime.sessions.list.getSnapshot().byId[row.id];
				if (listRow !== undefined && listRow.running === true) continue;
				return row;
			}
			return null;
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
					lines.push(row.alias + " 「" + row.title + "」 id=" + row.id + (row.cwd !== "" ? " 目录=" + row.cwd : "") + (row.load > 0 ? "（进行中 " + String(row.load) + " 个任务）" : "（空闲）"));
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
				'- 延迟派发：delay="30s" / "10m" / "1h"（或纯秒数），任务到点才发送；',
				"- 负载均衡：相互独立的任务必须派给不同的 worker 并行执行，优先选择「空闲」或进行中计数低的会话；严禁把所有任务都压给同一个 worker（除非后续任务依赖它）；",
				"- 单条回复自动新建的 worker 会话数有上限（默认 3，设置页「一次最多开窗数」可调）；超限的块不会执行，你会收到「[指挥官提示]」，此时应复用花名册中的现有空闲会话或分批派发；",
				"- 不要重复派发已经完成或正在进行的同一任务——重复块会被拦截并收到「[指挥官提示]」；确需重跑请修改任务文本表述。",
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
		/** Commanders awaiting self-healed restoration (boot snapshot missed them / probe flaked). sessionId -> poll ticks waited. */
		const pendingRestore = new Map();

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

		/** Mirror the task table into localStorage, pruning to the newest N entries.
		 * Non-terminal (running/waiting/sending/blocked-dep) tasks are NEVER
		 * pruned — evicting one would leak its worker lock and wedge that
		 * worker's FIFO queue forever. Overflow trims OLDEST TERMINAL first. */
		function persistTasks() {
			try {
				const all = [...state.tasks.values()].sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
				let keep = all;
				if (all.length > TASK_HISTORY_LIMIT) {
					const terminal = all.filter((task) => isTerminalStatus(task.status));
					const overflow = all.length - TASK_HISTORY_LIMIT;
					const droppedTerminals = new Set(terminal.slice(0, Math.min(overflow, terminal.length)).map((task) => task.id));
					// No hard backstop: if live tasks alone exceed the limit they
					// are ALL kept — evicting a running task leaks its worker lock.
					state.tasks = new Map(all.filter((task) => !droppedTerminals.has(task.id)).map((task) => [task.id, task]));
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

		/** Clipboard with a legacy fallback; resolves false when both paths fail. */
		async function copyTextToClipboard(text) {
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
					await navigator.clipboard.writeText(text);
					return true;
				}
			} catch {}
			try {
				const area = document.createElement("textarea");
				area.value = text;
				document.body.appendChild(area);
				area.select();
				document.execCommand("copy");
				area.remove();
				return true;
			} catch {
				return false;
			}
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

		/** Deliver one collaboration message into the host mailbox. */
		async function postMail(payload) {
			const response = await fetch("/api/dsh-commander/mail", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			let data = null;
			try {
				data = await response.json();
			} catch {}
			if (data === null || data.ok !== true) {
				return { ok: false, error: data?.error ?? { code: "transport", message: "mail delivery failed (" + response.status + ")" } };
			}
			return { ok: true, id: data.id, to: data.to };
		}

		async function fetchMailbox(boxId) {
			const response = await fetch("/api/dsh-commander/mail?box=" + encodeURIComponent(boxId), { method: "GET" });
			let data = null;
			try {
				data = await response.json();
			} catch {}
			if (data === null || data.ok !== true) return { ok: false, inbox: [], sent: [], unread: 0 };
			return { ok: true, inbox: data.inbox ?? [], sent: data.sent ?? [], unread: data.unread ?? 0 };
		}

		async function markMailRead(boxId, mailIds) {
			try {
				await fetch("/api/dsh-commander/mail", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ op: "read", box: boxId, mailIds }),
				});
			} catch {}
		}

		/** Call the host git assistant (worktree lifecycle / diff / merge). */
		async function postGit(payload) {
			const response = await fetch("/api/dsh-commander/git", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload),
			});
			let data = null;
			try {
				data = await response.json();
			} catch {}
			if (data === null) throw new Error("git route returned non-JSON (" + response.status + ")");
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

		/**
		 * Merge the durable host registry with the localStorage fallback into
		 * one candidate set (host first — it survives harness restarts and port
		 * changes, which localStorage cannot).
		 */
		async function collectRestoreIds() {
			const ids = [...readPersistedActive()];
			try {
				const response = await fetch("/api/dsh-commander/registry", { method: "GET" });
				const data = await response.json();
				if (data?.ok === true && Array.isArray(data.ids)) {
					for (const id of data.ids) {
						if (typeof id === "string" && id !== "" && !ids.includes(id)) ids.unshift(id);
					}
				}
			} catch {}
			return ids;
		}

		/** The list store starts `pending`; give it a bounded window to become ready. */
		async function waitForListReady(sessions, timeoutMs) {
			const deadline = Date.now() + (timeoutMs | 0 || 20000);
			while (Date.now() < deadline) {
				const phase = sessions.list.getSnapshot().phase;
				if (phase === undefined || phase === "ready") return true;
				await new Promise((resolve) => setTimeout(resolve, 150));
			}
			console.warn(LOG_PREFIX, "会话列表持续未就绪（20s），按当前快照尝试恢复");
			return false;
		}

		/**
		 * Probe a session's tail anchor with retries. A FAILED probe must NEVER
		 * degrade to cursor 0: that would replay the whole history as fresh
		 * dispatches on the next poll. Returns { ok, cursor } — ok=false means
		 * callers must skip/abort rather than guess.
		 */
		async function probeTailWithRetry(sessionId, attempts) {
			const total = Math.max(1, attempts | 0 || 3);
			for (let attempt = 1; attempt <= total; attempt++) {
				try {
					const probe = await fetchEvents(sessionId, 0, 1);
					if (probe.ok === true) {
						return { ok: true, cursor: Number(probe.lastAssistantSeq ?? probe.lastSeq ?? 0) };
					}
					if (probe.error?.code === "session-not-found") {
						return { ok: false, gone: true };
					}
				} catch {}
				if (attempt < total) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
			}
			return { ok: false };
		}

		/** Seed reportedBatches with every batch this commander ALREADY has, so a reload cannot re-report history. */
		function seedReportedBatches(sessionId) {
			const seen = new Set();
			for (const task of state.tasks.values()) {
				if (task.commanderId === sessionId && typeof task.batchId === "string" && task.batchId !== "") seen.add(task.batchId);
			}
			return seen;
		}

		/**
		 * Post-restore reconciliation for gate state that lives outside the
		 * localStorage-backed maps:
		 * - `waiting` tasks: re-enqueue into the per-worker FIFO (the queue map
		 *   is intentionally module-local and dies with the page).
		 * - `blocked-dep` tasks: rebuild the waiter index AND settle the score
		 *   against what happened while the page was closed — predecessors that
		 *   finished OK release the task, failed/vanished ones fail it fast,
		 *   fully satisfied tasks promote immediately.
		 */
		async function reconcileRestoredTasks() {
			const promotions = [];
			for (const task of [...state.tasks.values()]) {				if (task.status === "waiting") {
					const workerId = typeof task.workerId === "string" ? task.workerId : "";
					if (workerId !== "" && !state.workerLocks.has(workerId)) enqueueWaiting(workerId, task.id);
					continue;
				}
				if (task.status !== "blocked-dep") continue;
				const record = state.commanders.get(task.commanderId);
				if (record === undefined) {
					markTask(task.id, "failed", "指挥官未恢复，依赖任务作废");
					continue;
				}
				const dead = [];
				const still = [];
				for (const name of Array.isArray(task.depsRemaining) ? task.depsRemaining : []) {
					const prior = latestTaskWithTid(name);
					if (prior === undefined) {
						dead.push(name);
						continue;
					}
					if (isTerminalStatus(prior.status)) {
						if (prior.status !== "done") dead.push(name);
						continue;
					}
					still.push(name);
				}
				if (dead.length > 0) {
					unregisterDeps(task.id, [...(task.depsRemaining ?? [])]);
					markTask(task.id, "failed", "恢复对账：前置任务「" + dead.join(",") + "」未成功");
					continue;
				}
				if (still.length === 0) {
					update((s) => {
						const t = s.tasks.get(task.id);
						if (t === undefined || t.status !== "blocked-dep") return;
						t.depsRemaining = [];
						t.status = "sending";
					});
					console.info(LOG_PREFIX, "恢复对账：依赖已全部满足，重新派发", task.id);
					promotions.push(resolveAndSend(record, task.id).catch((error) => console.warn(LOG_PREFIX, "恢复派发异常：", errorMessage(error))));
					continue;
				}
				update((s) => {
					const t = s.tasks.get(task.id);
					if (t === undefined || t.status !== "blocked-dep") return;
					t.depsRemaining = still;
				});
				registerDeps(task.id, still);
			}
			if (promotions.length > 0) await Promise.all(promotions);
		}

		async function restoreFromSources() {
			const sessions = runtime.sessions;
			const [ids] = await Promise.all([collectRestoreIds(), waitForListReady(sessions)]);
			const snapshot = sessions.list.getSnapshot();
			const present = [];
			for (const id of ids) {
				// A session missing from the boot-time snapshot is usually just
				// lazily unloaded, NOT gone: queue it for self-healing instead of
				// silently dropping the commander forever.
				if (snapshot.byId[id] !== undefined) present.push(id);
				else pendingRestore.set(id, 0);
			}
			if (present.length > 0) {
				const failed = await restoreCommanders(present);
				for (const id of failed) pendingRestore.set(id, 0);
			}
			reconcileRestoredTasks();
			// Restoration may have armed commanders while loadConfig was still in
			// flight — make sure a poll timer EXISTS for them either way.
			ensureTimer();
		}

		/** Mirror one activation change into the durable host registry (best-effort). */
		async function persistActiveToHost(sessionId, active) {
			try {
				await fetch("/api/dsh-commander/registry", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ sessionId, active }),
				});
			} catch (error) {
				console.warn(LOG_PREFIX, "注册表同步失败（本地缓存仍生效）：", errorMessage(error));
			}
		}

		/** Capture the sessions runtime once and restore persisted activations. */
		function boot(sessions) {
			if (runtime !== null || sessions === undefined || sessions === null) return;
			// Single-engine takeover: stop a previously injected copy BEFORE
			// bringing this one up, so two pollers never race on the same tail.
			if (typeof window !== "undefined" && typeof window.__dshCommanderShutdown === "function") {
				try {
					window.__dshCommanderShutdown();
				} catch {}
			}
			runtime = { sessions };
			state.booted = true;
			if (typeof window !== "undefined") {
				try {
					window.__dshCommanderShutdown = shutdownEngine;
				} catch {}
			}
			restoreTasks();
			void restoreFromSources();
			loadConfig().then((config) => {
				update((s) => {
					s.config = config;
					s.configLoaded = true;
				});
				rearmTimer();
			});
			ensureTimer();
			console.info(LOG_PREFIX, "引擎已启动 [" + ENGINE_BUILD + "]");
		}

		/** Re-register commanders after a reload: fresh roster, cursor pinned to the current tail.
		 * @returns ids that FAILED this pass (probe flaked / transport error) so the caller can re-queue them. */
		async function restoreCommanders(ids) {
			const failed = [];
			for (const sessionId of ids) {
				try {
					const roster = buildRoster(runtime.sessions.list.getSnapshot(), sessionId, workerLoadById());
					const probe = await probeTailWithRetry(sessionId, 3);
					if (!probe.ok) {
						// Fail closed: restoring with a guessed cursor could replay
						// the entire history as fresh dispatches. Report back so the
						// caller re-queues this id instead of dropping it forever.
						console.warn(LOG_PREFIX, "游标探测失败，本轮跳过恢复该指挥官以防历史重放：", sessionId);
						failed.push(sessionId);
						continue;
					}
					update((s) => {
						s.commanders.set(sessionId, { sessionId, cursor: probe.cursor, roster, outstanding: 0, dispatchedTotal: 0, lastBatchAt: 0, error: "", commanderHops: 0, missCount: 0, reportedBatches: seedReportedBatches(sessionId) });
						if (!s.active.includes(sessionId)) s.active.push(sessionId);
					});
				} catch (error) {
					console.warn(LOG_PREFIX, "恢复指挥官失败：", errorMessage(error));
					failed.push(sessionId);
				}
			}
			persistActive();
			return failed;
		}

		/** Retry budget: poll ticks a not-yet-restorable commander may stay pending before we give up loudly. */
		const PENDING_RESTORE_MAX_TICKS = 40;

		/**
		 * Self-heal restoration: sessions absent from the boot-time list snapshot
		 * (lazily unloaded) or whose tail probe flaked are retried every tick
		 * until they come back — a commander must NEVER silently vanish just
		 * because the host was not ready yet. Give up loudly after the budget.
		 */
		async function drainPendingRestores() {
			if (pendingRestore.size === 0 || runtime === null) return;
			const snapshot = runtime.sessions.list.getSnapshot();
			for (const [sessionId, attempts] of [...pendingRestore]) {
				if (snapshot.byId[sessionId] === undefined) {
					const next = attempts + 1;
					if (next >= PENDING_RESTORE_MAX_TICKS) {
						pendingRestore.delete(sessionId);
						console.warn(LOG_PREFIX, "恢复重试超限（会话迟迟未出现），放弃：", sessionId);
						notifyUser("指挥官 · 自动恢复失败", "会话迟迟未出现，已放弃恢复；请在该会话重新点「成为指挥官」。");
					} else pendingRestore.set(sessionId, next);
					continue;
				}
				const failed = await restoreCommanders([sessionId]);
				if (failed.includes(sessionId)) {
					const next = attempts + 1;
					if (next >= PENDING_RESTORE_MAX_TICKS) {
						pendingRestore.delete(sessionId);
						console.warn(LOG_PREFIX, "恢复重试超限（游标探测持续失败），放弃：", sessionId);
						notifyUser("指挥官 · 自动恢复失败", "游标探测持续失败，已放弃恢复；请在该会话重新点「成为指挥官」。");
					} else pendingRestore.set(sessionId, next);
				} else {
					pendingRestore.delete(sessionId);
					console.info(LOG_PREFIX, "延迟恢复成功：", sessionId);
					ensureTimer();
				}
			}
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
			const roster = buildRoster(list, sessionId, workerLoadById());
			const result = await injectBriefing(sessionId, briefingText(roster));
			if (result.ok !== true) throw new Error(result.error?.message ?? result.error?.code ?? "简报注入失败");
			const probe = await probeTailWithRetry(sessionId, 3);
			if (!probe.ok) {
				// Fail closed: a guessed cursor would replay the session's whole
				// history as fresh dispatches on the next poll.
				throw new Error("无法确认会话尾部（游标探测失败），请稍后重试激活");
			}
			update((s) => {
				s.commanders.set(sessionId, { sessionId, cursor: probe.cursor, roster, outstanding: 0, dispatchedTotal: 0, lastBatchAt: 0, error: "", commanderHops: 0, missCount: 0, reportedBatches: seedReportedBatches(sessionId) });
				if (!s.active.includes(sessionId)) s.active.push(sessionId);
			});
			persistActive();
			void persistActiveToHost(sessionId, true);
			ensureTimer();
			console.info(LOG_PREFIX, "指挥官已激活：", sessionId, "（花名册 " + roster.length + " 个会话）");
		}

		/** Deactivate: stop parsing/dispatching for this commander. In-flight tasks finish reporting status only. */
		function deactivate(sessionId) {
			update((s) => {
				s.active = s.active.filter((id) => id !== sessionId);
				s.commanders.delete(sessionId);
				// Close any take-over follow windows driven by this commander.
				for (const task of s.tasks.values()) {
					if (task.commanderId === sessionId && task.status === "taken-over") task.follow = false;
				}
				if (s.panelOpenFor === sessionId) s.panelOpenFor = null;
			});
			persistActive();
			void persistActiveToHost(sessionId, false);
			stopTimerIfIdle();
			console.info(LOG_PREFIX, "指挥官已停用：", sessionId);
		}

		/** Re-inject an updated roster briefing (aliases may have shifted). */
		async function refreshRoster(sessionId) {
			await ensureConfig();
			const record = state.commanders.get(sessionId);
			if (record === undefined) throw new Error("该会话不是激活中的指挥官");
			const previous = record.roster;
			const roster = buildRoster(runtime.sessions.list.getSnapshot(), sessionId, workerLoadById());
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
				if (task.status === "sending" || task.status === "running" || task.status === "waiting" || task.status === "scheduled") return true;
			}
			return false;
		}

		function ensureTimer() {
			if (timer !== null || !state.booted) return;
			if (state.active.length === 0 && pendingRestore.size === 0) return;
			const period = Math.min(Math.max(positiveInt(state.config.pollIntervalMs, 2000), 500), 60000);
			timer = setInterval(() => {
				poll().catch((error) => console.warn(LOG_PREFIX, "轮询异常：", errorMessage(error)));
			}, period);
		}

		function stopTimerIfIdle() {
			if (timer !== null && state.active.length === 0 && !hasOutstanding() && pendingRestore.size === 0) {
				clearInterval(timer);
				timer = null;
			}
		}

		/**
		 * Handed to the NEXT bundle copy via window.__dshCommanderShutdown:
		 * kills this engine's poll timer and freezes its state so a freshly
		 * injected copy can take over as THE single engine without two pollers
		 * ever dispatching the same commander tail in parallel.
		 */
		function shutdownEngine() {
			try {
				if (timer !== null) {
					clearInterval(timer);
					timer = null;
				}
				state.booted = false;
				polling = false;
				console.warn(LOG_PREFIX, "旧引擎实例已停止，交由新实例接管（防重复派发）");
			} catch {}
		}

		function rearmTimer() {
			stopTimerIfIdle();
			ensureTimer();
		}

		/** One poll pass: drain every active commander's tail, then settle workers. Reentrancy-guarded. */
		async function poll() {
			if (polling) return;
			if (state.active.length === 0 && !hasOutstanding() && pendingRestore.size === 0) {
				stopTimerIfIdle();
				return;
			}
			polling = true;
			try {
				for (const commanderId of [...state.active]) {
					await processCommander(commanderId).catch((error) => console.warn(LOG_PREFIX, "处理指挥官输出失败：", errorMessage(error)));
				}
				await fireScheduledTasks();
				await monitorTasks();
				await pollTakenOverWatch();
				await drainPendingRestores();
				await drainWaitingQueues();
			} finally {
				polling = false;
			}
			stopTimerIfIdle();
		}

		/**
		 * Make block-level admission drops impossible to miss. Dropped blocks
		 * used to vanish into a browser-console warn (the full-batch 「cap」
		 * branch didn't even get that) while the model believed its work was
		 * dispatched. Now one queued 「[指挥官提示]」 lands IN the commander
		 * session — the model learns which tail never became tasks and can
		 * re-dispatch (reusing existing workers bypasses the new-session cap)
		 * — plus a desktop notification and the console line.
		 */
		async function reportDroppedBlocks(commanderId, verdict) {
			const notes = [];
			if ((verdict.autoDropped | 0) > 0) {
				notes.push(String(verdict.autoDropped) + " 个「自动新建 worker」任务块因单批新建上限（maxNewWorkersPerBatch=" + String(zeroAllowedInt(state.config.maxNewWorkersPerBatch, 3, 0, 16)) + "）未执行");
			}
			if ((verdict.dedupDropped | 0) > 0) {
				notes.push(String(verdict.dedupDropped) + " 个任务块因与已派发过的任务重复而被拦截（同一任务不重复执行，结果以已有回执为准；确需重跑请修改任务文本或临时关闭「拦截重复派发的任务」）");
			}
			if ((verdict.dropped | 0) > 0) {
				notes.push(String(verdict.dropped) + " 个任务块因并发/单条消息/累计派发上限未执行");
			}
			if (notes.length === 0 && verdict.action === "cap" && typeof verdict.reason === "string" && verdict.reason !== "") {
				notes.push("本批全部任务块未执行：" + verdict.reason);
			}
			if (notes.length === 0) return;
			const text = "[指挥官提示] 本回复中有 " + notes.join("；") +
				"。它们没有派发、也不会自动补发：请为这些任务重新输出 <dsh-dispatch> 块（复用花名册中现有的空闲 worker 可避开新建上限），或在设置中调高相应上限。";
			console.warn(LOG_PREFIX, text);
			notifyUser("指挥官 · 有任务块未执行", truncateText(text.replace(/\n/g, " "), 90));
			const face = runtime?.sessions.binding(commanderId)?.session;
			if (face === undefined) return;
			try { await face.prompt([{ type: "text", text }], "queue"); } catch {}
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
					// ONE 404 must not permanently off-board a commander: the host
					// may lazily unload an idle session for a tick or two. Require
					// THREE consecutive misses before giving up, and always tell
					// the human when the off-board finally happens.
					record.missCount = (record.missCount | 0) + 1;
					if (record.missCount >= 3) {
						console.warn(LOG_PREFIX, "指挥官会话连续多次不可见，自动停用：", commanderId);
						notifyUser("指挥官 · 会话已消失自动停用", "会话持续不可见，该指挥官已下线；请在其原会话重新点「成为指挥官」上岗。");
						deactivate(commanderId);
					} else {
						console.warn(LOG_PREFIX, "指挥官会话暂不可见（第 " + String(record.missCount) + "/3 次），暂不下线：", commanderId);
					}
				}
				return;
			}
			record.missCount = 0;
			const lastSeq = Number(data.lastSeq ?? record.cursor);
			// Broadcast expansion: `target="#1,#2"` / `target="all"` become
			// single-target items so every downstream gate (caps, cooldown,
			// dispatch) treats them uniformly.
			const blocks = expandBlocks(
				(data.events ?? []).flatMap((event) => parseDispatchBlocks(event.text)),
				record.roster ?? [],
			);
			// Tail side effects (worker <dsh-mail> delivery + roundtable kickoff)
			// must run EXACTLY ONCE per CONSUMED tail. They used to execute before
			// the cap/cooldown decisions, so every transiently-deferred tick
			// re-delivered the same mails and re-fired the same debate.
			const deliverTailSideEffects = async () => {
				const mailBlocks = (data.events ?? []).flatMap((event) => parseMailBlocks(event.text));
				if (mailBlocks.length > 0) await deliverMailFromBlocks(record, commanderId, mailBlocks).catch((error) => console.warn(LOG_PREFIX, '邮件投递异常（不影响任务派发）：', errorMessage(error)));
				const rtBlocks = (data.events ?? []).flatMap((event) => parseRoundtableBlocks(event.text));
				for (const rt of rtBlocks) {
					console.info(LOG_PREFIX, "圆桌讨论启动：", rt.topic, "（" + String(rt.count) + " 人）");
					update((s) => {
						const rec = s.commanders.get(commanderId);
						if (rec !== undefined) rec.roundtableActive = { topic: rt.topic, startedAt: Date.now() };
					});
					const face = runtime.sessions.binding(commanderId)?.session;
					if (face === undefined) continue;
					face.prompt([{ type: "text", text: "[系统] 圆桌讨论「" + rt.topic + "」已启动，" + String(rt.count) + " 位讨论员正在分析中，纪要稍后注入。" }], "queue").catch(() => {});
					// The route answers JSON: parse it BEFORE reading fields — a raw
					// Response never carries `.minutes`, which silently disabled the
					// whole feature (every call took the failure branch).
					void fetch("/api/dsh-commander/roundtable", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: rt.topic, body: rt.body, count: rt.count }) }).then(async (result) => {
						let payload = null;
						try { payload = await result.json(); } catch {}
						if (payload?.ok !== true || typeof payload.minutes !== "string") {
							console.warn(LOG_PREFIX, "圆桌讨论失败：", payload?.error?.message ?? 'unknown');
							update((s) => {
								const r = s.commanders.get(commanderId);
								if (r !== undefined && r.roundtableActive?.topic === rt.topic) r.roundtableActive = undefined;
							});
							return;
						}
						await face.prompt([{ type: "text", text: payload.minutes }], "queue");
						console.info(LOG_PREFIX, "圆桌纪要已注入指挥官会话");
					}).catch((error) => console.warn(LOG_PREFIX, "圆桌讨论异常：", errorMessage(error))).finally(() => {
						update((s) => {
							const r = s.commanders.get(commanderId);
							if (r !== undefined && r.roundtableActive?.topic === rt.topic) r.roundtableActive = undefined;
						});
					});
				}
			};
			if (blocks.length === 0) {
				record.cursor = Math.max(record.cursor, lastSeq);
				await deliverTailSideEffects();
				return;
			}
			// Dedup correction: the model tends to re-send an identical task to a
			// second worker — or to re-emit a block for work that ALREADY
			// finished. Compare against THIS commander's ENTIRE known task
			// history (in-flight AND settled): identical text never runs twice.
			const activeTaskKeys = new Set();
			for (const t of state.tasks.values()) {
				if (t.commanderId !== commanderId) continue;
				const key = normTaskKey(t.fullText ?? t.excerpt);
				if (key !== "") activeTaskKeys.add(key);
			}
			const verdict = evaluateBatch(blocks, { outstanding: countOutstanding(commanderId), dispatchedTotal: record.dispatchedTotal }, state.config, activeTaskKeys);
			if (verdict.action === "cap") {
				// A permanent cap (activation budget exhausted) must consume the
				// batch or it would re-warn every tick; a transient one (all
				// workers busy) leaves the cursor alone so tasks run next tick.
				if (verdict.permanent === true) {
					record.cursor = Math.max(record.cursor, lastSeq);
					console.warn(LOG_PREFIX, verdict.reason, "，丢弃 " + verdict.dropped + " 个任务块");
					await deliverTailSideEffects();
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
			// The tail is consumed from here on: fire mail/roundtable ONCE.
			await deliverTailSideEffects();
			if (verdict.action !== "execute") return;
			record.lastBatchAt = Date.now();
			if ((verdict.dropped | 0) > 0 || (verdict.autoDropped | 0) > 0 || (verdict.dedupDropped | 0) > 0) {
				await reportDroppedBlocks(commanderId, verdict).catch((error) => console.warn(LOG_PREFIX, "丢弃提示发送失败：", errorMessage(error)));
			}
			const batchId = "b-" + String(++state.batchSeq);
			// Confirmation mode: park the whole batch for one-click release in
			// the panel instead of dispatching immediately.
			if (state.config.confirmDispatch === true && verdict.items.length > 0) {
				update((s) => {
					const rec = s.commanders.get(commanderId);
					if (rec === undefined) return;
					// MERGE with an already-parked batch: overwriting it silently
					// deleted the first reply's tasks with no notice at all.
					const previous = rec.awaitingConfirm?.items ?? [];
					rec.awaitingConfirm = { items: [...previous, ...verdict.items], batchId, at: Date.now() };
				});
				console.info(LOG_PREFIX, "确认模式：批次挂起等待放行（" + verdict.items.length + " 项）");
				notifyUser("指挥官 · 任务待放行", String(verdict.items.length) + " 个任务等待你放行");
				return;
			}
			const batchTids = new Set(verdict.items.map((item2) => item2.tid).filter((tid) => typeof tid === "string" && tid !== ""));
			for (const item of verdict.items) {
				await dispatchTask(record, item, batchId, batchTids).catch((error) => console.warn(LOG_PREFIX, "派发异常：", errorMessage(error)));
			}
		}

		/** Create the task record up-front so the panel shows the attempt even when resolution fails. */
		function openTask(record, item, batchId, initialFailovers) {
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
					stalled: false,
					humanPresent: false,
					cancelRequested: false,
					continuations: 0,
					failovers: Math.max(0, Number(initialFailovers) | 0),
					delayMs: parseDelayMs(item.delay),
					fireAt: 0,
					files: [],
					toolCounts: [],
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

		/**
		 * Turn-end reasons that genuinely mean "the worker died mid-task".
		 * ONLY a token-cap truncation auto-resumes: it is the single case where
		 * the worker was provably still mid-sentence. 「completed」/「stop」 mean
		 * done; 「aborted」 is usually a HUMAN stopping the turn on purpose;
		 * 「error」 settles as failed so the panel's 重试/failover stays in
		 * charge. Anything unknown also settles normally — fail closed.
		 */
		const RESUMABLE_END_REASONS = ["max-tokens"];

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
		async function dispatchTask(record, item, batchId, batchTids, initialFailovers) {
			// Load balancing: if the model funnels into one busy worker,
			// transparently redirect to the least-loaded idle same-scope candidate.
			const wCap = positiveInt(state.config.maxTasksPerWorker, 2);
			if (wCap > 0 && item.target !== "") {
				const loads = activeLoadByWorker();
				// The rebalance candidate filter below reads the list snapshot —
				// bind it HERE: this used to reference an undefined `list` and
				// threw a swallowed ReferenceError that silently lost the task.
				const list = runtime.sessions.list.getSnapshot();
				const preview = (record.roster ?? []).find((r) => r.alias === item.target || r.id === item.target);
				if (preview !== undefined) {
					const currentLoad = loads.get(preview.id) | 0;
					if (currentLoad >= wCap) {
						const candidates = (record.roster ?? [])
							.filter((r) => r.id !== preview.id && !state.active.includes(r.id))
							.sort((a, b) => (loads.get(a.id) | 0) - (loads.get(b.id) | 0));
						const free = candidates.find((r) => (loads.get(r.id) | 0) < wCap && runtime.sessions.binding(r.id)?.session !== undefined && normProj(list.byId[r.id]?.cwd) === normProj(list.byId[record.sessionId]?.cwd));
						if (free !== undefined) {
							console.info(LOG_PREFIX, "负载均衡：", preview.alias || item.target, "已有 " + currentLoad + " 个任务 → 改派至", free.alias, "「" + free.title + "」");
							item = { ...item, target: free.id };
						}
					}
				}
			}
			const taskId = openTask(record, item, batchId, initialFailovers);
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
				// Strict project scope: reject cross-project dispatch targets.
				if (state.config.strictProjectScope === true) {
					const tRow = list.byId[workerId];
					const cRow = list.byId[record.sessionId];
					const tProj = normProj(tRow?.cwd);
					const cProj = normProj(cRow?.cwd);
					if (tProj !== '' && cProj !== '' && tProj !== cProj) {
						markTask(taskId, 'failed', '跨项目目标已拒绝（目标 cwd=' + truncateText(tRow.cwd, 60) + '）');
						return;
					}
				}
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
			// Delayed dispatch: park as 「定时中」 until fireAt, then fall through
			// to the normal lock/queue pipeline on a later tick.
			const delayMs = Math.max(0, Number(task.delayMs) || 0);
			if (delayMs > 0 && task.status === "sending") {
				const fireAt = Date.now() + delayMs;
				update((s) => {
					const t = s.tasks.get(taskId);
					if (t === undefined || isTerminalStatus(t.status)) return;
					t.fireAt = fireAt;
					t.status = "scheduled";
				});
				console.info(LOG_PREFIX, "任务定时派发：" + truncateText(task.excerpt, 40) + " → " + new Date(fireAt).toLocaleTimeString());
				return;
			}
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
					t.waitingSince = Date.now();
				});
				enqueueWaiting(task.workerId, taskId);
				console.info(LOG_PREFIX, "worker 忙，任务排队：", truncateText(task.excerpt, 30), "→", task.workerId);
				return;
			}
			await performSend(record, taskId);
		}

		/**
		 * Manual escape hatch for a parked task: force-send it even though the
		 * HOST still reports its worker busy. Our own FIFO slot is still
		 * respected (a predecessor mid-turn keeps the task queued at the FRONT);
		 * only the human-busy/stale-flag stall is overridden.
		 */
		async function forceDispatchWaiting(taskId) {
			const task = state.tasks.get(taskId);
			if (task === undefined || task.status !== "waiting") return;
			const record = state.commanders.get(task.commanderId);
			if (record === undefined) {
				markTask(taskId, "failed", "指挥官已停用，排队任务作废");
				return;
			}
			dequeueWaiting(task.workerId, taskId);
			if (state.workerLocks.has(task.workerId)) {
				// Our own predecessor holds the slot: re-queue at the FRONT.
				const rest = (waitQueue.get(task.workerId) ?? []).filter((id) => id !== taskId);
				waitQueue.set(task.workerId, [taskId, ...rest]);
				return;
			}
			state.workerLocks.set(task.workerId, taskId);
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
			let probeOk = false;
			try {
				const probe = await fetchEvents(task.workerId, 0, 1);
				if (probe.ok === true) {
					const parsed = Number(probe.lastAssistantSeq ?? probe.lastSeq ?? 0);
					baseline = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
					probeOk = true;
				}
			} catch {}
			if (!probeOk) {
				// Trade-off note (audited): a brand-new auto-created session may
				// legitimately answer without any seq yet, so failing hard here
				// broke valid dispatches. Proceed with baseline 0 but leave an
				// auditable marker — receipts for such tasks carry a caveat.
				console.warn(LOG_PREFIX, "基线锚点探测失败，baseline=0 继续（回执可能含历史输出）：", task.workerId);
				update((s) => { const t = s.tasks.get(taskId); if (t !== undefined) t.baselineUnverified = true; });
			}

			// Legacy records restored from old localStorage may lack fullText —
			// falling back to the excerpt keeps them from sending EMPTY prompts.
			const taskText = truncateText(
				typeof task.fullText === "string" && task.fullText !== "" ? task.fullText : (task.excerpt || ""),
				positiveInt(state.config.maxTaskChars, 4000),
			);
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
				t.slow = false; // queue-stall marker no longer applies once running
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

		/** Fire scheduled tasks whose time has come (runs every poll before settling). */
		async function fireScheduledTasks() {
			const due = [...state.tasks.values()].filter((task) => task.status === "scheduled" && Number(task.fireAt) <= Date.now());
			for (const task of due) {
				const record = state.commanders.get(task.commanderId);
				if (record === undefined) {
					markTask(task.id, "failed", "指挥官已停用，定时任务作废");
					continue;
				}
				update((s) => {
					const t = s.tasks.get(task.id);
					if (t === undefined || t.status !== "scheduled") return;
					t.status = "sending";
					// Clear the delay budget: otherwise sendOrQueue re-parks the task
					// forever (delayMs>0 ∧ sending) and auto-created targets leak a
					// fresh session on every retry cycle.
					t.delayMs = 0;
					t.fireAt = 0;
					t.sentAt = Date.now();
				});
				await resolveAndSend(record, task.id).catch((error) => console.warn(LOG_PREFIX, "定时派发异常：", errorMessage(error)));
			}
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
					// Parked too long (permission hang, stale running flag, …):
					// surface it once so the user knows to use 「立即发送」.
					if (task.stalled !== true && Date.now() - task.sentAt > 30000) {
						update((s) => {
							const t = s.tasks.get(taskId);
							if (t !== undefined) t.stalled = true;
						});
						notifyUser("指挥官 · 任务排队较久", (task.workerTitle || task.workerId) + "：" + task.excerpt);
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
				// Artifacts + tool stats over this span. The baseline never moves
				// across continuations, so every settle re-projects the WHOLE span
				// and the latest write/edit set naturally accumulates.
				update((s) => {
					const t = s.tasks.get(task.id);
					if (t === undefined) return;
					if (Array.isArray(data.files)) t.files = data.files;
					if (Array.isArray(data.tools)) t.toolCounts = data.tools;
				});
				// A human started driving this worker directly: no automatic
				// receipt (it would fight the human's own input).
				// Worker-emitted mail: deliver at most once per task to prevent
				// infinite relay loops when two workers keep replying to each other.
				if (task.mailDelivered !== true) {
					const wMails = (data.events ?? []).flatMap((event) => parseMailBlocks(event.text));
					if (wMails.length > 0) {
						update((s) => { const t = s.tasks.get(task.id); if (t !== undefined) t.mailDelivered = true; });
						const cmdRecord = state.commanders.get(task.commanderId);
						if (cmdRecord !== undefined) await deliverMailFromBlocks(cmdRecord, task.workerId, wMails);
					}
				}
				const humanAround = (data.humanMessages ?? 0) > 0;
				if (humanAround && state.config.takeoverOnHuman !== true) {
					// DEFAULT (不打断): a human chiming into the worker session does
					// NOT kill the automated pipeline. Note their presence for the
					// panel and keep running — receipts and settlement proceed as
					// if nobody had typed.
					if (task.humanPresent !== true) {
						update((s) => { const t = s.tasks.get(task.id); if (t !== undefined && t.status === "running") t.humanPresent = true; });
						console.info(LOG_PREFIX, "检测到人工消息，任务不打断继续跟进：", task.workerTitle || task.workerId);
					}
				} else if (humanAround) {
					if (state.commanders.get(task.commanderId) === undefined) {
						// Commander deactivated mid-run: settle silently — no arm,
						// no receipt injection into a dead conversation.
						finishTask(task, "taken-over", "人工接管：指挥官已停用，不再播报");
						continue;
					}
					// Legacy opt-in semantics: a human driving the worker ends the
					// task. Arm the read-only follow window BEFORE settling: the
					// watcher resumes from the log tail captured HERE, never
					// replaying old output (same fail-closed spirit as the probe).
					update((s) => {
						const t = s.tasks.get(task.id);
						if (t === undefined) return;
						t.follow = s.config.takeoverFollow === true;
						t.followCursor = Math.max(0, Number(data.lastAssistantSeq ?? t.baseline ?? 0));
						t.followCheckedAt = 0;
					});
					finishTask(task, "taken-over", "人工接管：结果以该会话为准");
					if (state.config.reportTakeover !== false) {
						const cmdFace = runtime.sessions.binding(task.commanderId)?.session;
						if (cmdFace !== undefined) {
							const followNote = state.config.takeoverFollow === true
								? "插件转入只读观察，该 worker 有新进展时将以「[指挥官观察]」推送。"
								: "插件不再自动跟进度。";
							try { await cmdFace.prompt([{ type: "text", text: "[指挥官回执 · " + (task.alias || task.workerTitle || task.workerId) + "]\n状态：人工已接管。" + followNote }], "queue"); } catch {}
						}
					}
					continue;
				}
				const reason = typeof data.lastEnd?.reason === "string" ? data.lastEnd.reason : "stop";
				// Interruption recovery: ONLY known interruption reasons may trigger
				// a continuation prompt. The real harness names NORMAL completion
				// 「completed」 (mocks say 「stop」), so the old open-ended
				// `reason !== "stop"` test resumed workers that had just delivered
				// their final answer. Fail closed the other way instead: anything
				// outside the whitelist settles as a normal finish. Manual cancels
				// never resume.
				const interrupted = RESUMABLE_END_REASONS.includes(reason);
				if (interrupted && task.cancelRequested !== true && (task.continuations | 0) < zeroAllowedInt(state.config.maxContinuations, 2, 0, 5)) {
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
					// Resume rejected/unreachable: fall through — classification
					// below records this as a token-truncated completion.
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
				} else if (reason !== "stop" && reason !== "completed") {
					// Any OTHER end reason (aborted / error / unknown) is an abnormal
					// termination: settle failed so 面板重试/failover stay in charge.
					// Normal finishes are exactly: "stop" · "completed" · max-tokens.
					status = "failed";
					note = (task.continuations | 0) > 0
						? "回合异常结束（reason=" + reason + "）· 已自动继续 " + String(task.continuations) + " 次仍未恢复"
						: "回合异常结束（reason=" + reason + "）";
				}
				const contNote = (task.continuations | 0) > 0 ? " · 续跑 " + String(task.continuations) + " 次" : "";
				const metaLine = "（耗时 " + String(durationSec) + "s" + (tokens > 0 ? " · ~" + String(tokens) + " tok" : "") + contNote + "）";
				const fileList = Array.isArray(task.files) ? task.files : [];
				const fileNote = fileList.length > 0 ? "\n变更文件(" + String(fileList.length) + ")：" + fileList.map((entry) => entry.path).join("、") : "";
				let detail = note + metaLine + fileNote + "\n摘要：" + summary;
				// Read-side of the probe trade-off: when the send-time baseline
				// could not be verified, the summary may include pre-task output.
				if (task.baselineUnverified === true) detail += "\n[!] 基线未验证：摘要可能混有任务前的历史输出，可点「全文」核对。";

				// Failover: a genuinely failed task gets ONE automatic reassignment
				// to the least-loaded other worker before giving up. Manual cancels
				// and human takeovers never fail over.
				if (
					status === "failed" &&
					task.cancelRequested !== true &&
					(task.failovers | 0) < zeroAllowedInt(state.config.maxFailovers, 1, 0, 3)
				) {
					const record = state.commanders.get(task.commanderId);
					const candidate = record === undefined ? null : pickFailoverCandidate(record, task.workerId);
					if (candidate !== null) {
						update((s) => {
							const t = s.tasks.get(task.id);
							if (t === undefined) return;
							t.failovers = (t.failovers | 0) + 1;
						});
						markTask(task.id, "failed", detail + "\n→ 已自动改派给 " + candidate.alias + " 「" + candidate.title + "」 重试");
						await dispatchTask(
							record,
							{
								target: candidate.id,
								title: "",
								task: typeof task.fullText === "string" && task.fullText !== "" ? task.fullText : task.excerpt,
								fork: typeof task.pendingFork === "string" ? task.pendingFork : "",
								tid: typeof task.tid === "string" ? task.tid : "",
								depends: [],
							},
							typeof task.batchId === "string" ? task.batchId : null,
							new Set(typeof task.tid === "string" && task.tid !== "" ? [task.tid] : []),
							(task.failovers | 0), // child inherits the spent budget (already incremented above)
						).catch((error) => console.warn(LOG_PREFIX, "failover 派发异常：", errorMessage(error)));
						continue;
					}
				}
				finishTask(task, status, detail);
				await deliverReceipt(task);
			}
			maybeBatchSummaries();
		}

		/** Minimum gap between two watch probes of one taken-over worker (ms). */
		const FOLLOW_CHECK_MIN_MS = 5000;

		/**
		 * Take-over follow: a task settled as taken-over may keep a READ-ONLY
		 * observation window open on its worker. Every time that worker finishes
		 * another turn, the assistant output newer than the window's own cursor
		 * is queued into the commander as one 「[指挥官观察]」 note — progress
		 * visibility for human-driven sessions without ever writing to them.
		 */
		async function pollTakenOverWatch() {
			if (runtime === null || state.config.takeoverFollow !== true) return;
			// Honor the master injection switch: a commander that opted out of
			// 自动回执注入 wants silence — the watch stream must not bypass it.
			if (state.config.autoReport !== true) return;
			const list = runtime.sessions.list.getSnapshot();
			const now = Date.now();
			for (const task of [...state.tasks.values()]) {
				if (task.status !== "taken-over" || task.follow !== true) continue;
				if (typeof task.workerId !== "string" || task.workerId === "") continue;
				if (state.commanders.get(task.commanderId) === undefined || list.byId[task.workerId] === undefined) {
					update((s) => { const t = s.tasks.get(task.id); if (t !== undefined && t.status === "taken-over") t.follow = false; });
					continue; // commander stopped / worker gone — close the window
				}
				if (list.byId[task.workerId].running === true) continue; // mid-turn — observe at turn granularity
				if (now - (task.followCheckedAt ?? 0) < FOLLOW_CHECK_MIN_MS) continue; // per-task probe throttle
				update((s) => { const t = s.tasks.get(task.id); if (t !== undefined) t.followCheckedAt = now; });
				const since = Math.max(0, Number(task.followCursor ?? task.baseline ?? 0));
				const data = await fetchEvents(task.workerId, since, 50).catch(() => null);
				if (data === null || data.ok !== true) continue; // transport hiccup — retry next tick
				const parts = [];
				let tokens = 0;
				let newest = since;
				for (const event of data.events ?? []) {
					const seq = Number(event.seq) || 0;
					if (seq <= since) continue; // defensive: never replay below our own cursor
					if (seq > newest) newest = seq;
					if (typeof event.text === "string" && event.text.trim() !== "") parts.push(event.text);
					if (event.usage !== undefined && event.usage !== null) {
						for (const [key, value] of Object.entries(event.usage)) {
							if (typeof value === "number" && Number.isFinite(value) && /token/i.test(key)) tokens += value;
						}
					}
				}
				update((s) => {
					const t = s.tasks.get(task.id);
					if (t === undefined || t.status !== "taken-over" || t.follow !== true) return;
					t.followCursor = newest; // monotonic; >limit overflow continues next tick
					const mergedFiles = Array.isArray(t.files) ? [...t.files] : [];
					for (const entry of Array.isArray(data.files) ? data.files : []) {
						if (!mergedFiles.some((existing) => existing.path === entry.path)) mergedFiles.push(entry);
					}
					if (mergedFiles.length > 0) t.files = mergedFiles;
				});
				if (parts.length === 0) continue; // nothing new worth waking the commander for
				const summary = truncateText(parts.join("\n\n").trim(), positiveInt(state.config.summaryMaxChars, 800));
				const freshFiles = Array.isArray(data.files) ? data.files : [];
				const metaLine = tokens > 0 ? "（~" + String(tokens) + " tok）" : "";
				const fileNote = freshFiles.length > 0 ? "\n新增变更文件(" + String(freshFiles.length) + ")：" + freshFiles.map((entry) => entry.path).join("、") : "";
				const face = runtime.sessions.binding(task.commanderId)?.session;
				if (face !== undefined) {
					try {
						await face.prompt([{ type: "text", text: "[指挥官观察 · " + (task.alias !== "" ? task.alias + " " : "") + (task.workerTitle || task.workerId) + "]\n状态：已接管（人工操作中），该会话有新进展" + metaLine + "：\n" + summary + fileNote }], "queue");
						console.info(LOG_PREFIX, "观察进展已推送：", task.workerTitle || task.workerId);
					} catch {}
				}
			}
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

		/** Panel action: close the read-only observation window of a taken-over task. */
		function stopFollowing(taskId) {
			update((s) => {
				const t = s.tasks.get(taskId);
				if (t === undefined || t.status !== "taken-over") return;
				t.follow = false;
			});
			console.info(LOG_PREFIX, "停止观察：", taskId);
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
			if (task.status === "scheduled") {
				markTask(taskId, "failed", "已取消（定时未到）");
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

		/** In-memory full-result cache (big text — deliberately not persisted). */
		const fullResultCache = new Map();

		/**
		 * Panel 全文: pull the COMPLETE task output from the host (the receipt
		 * only carries a truncated summary) and toggle its display.
		 */
		async function fetchFullResult(taskId) {
			const task = state.tasks.get(taskId);
			if (task === undefined || runtime === null) return;
			if (typeof task.workerId !== "string" || task.workerId === "") return;
			update((s) => {
				const t = s.tasks.get(taskId);
				if (t === undefined) return;
				t.showFull = t.showFull !== true;
				t.fullLoading = t.showFull === true && !fullResultCache.has(taskId);
			});
			if (!fullResultCache.has(taskId)) {
				try {
					const query = "?sessionId=" + encodeURIComponent(task.workerId) + "&baseline=" + String(task.baseline | 0);
					const response = await fetch("/api/dsh-commander/fullresult" + query, { method: "GET" });
					const data = await response.json();
					if (data?.ok !== true) throw new Error(data?.error?.message ?? data?.error?.code ?? "fullresult failed");
					fullResultCache.set(taskId, { text: String(data.text ?? ""), truncated: data.truncated === true });
				} catch (error) {
					console.warn(LOG_PREFIX, "全文获取失败：", errorMessage(error));
					update((s) => {
						const t = s.tasks.get(taskId);
						if (t === undefined) return;
						t.showFull = false;
					});
				} finally {
					update((s) => {
						const t = s.tasks.get(taskId);
						if (t === undefined) return;
						t.fullLoading = false;
					});
				}
			}
		}

		function getFullResultText(taskId) {
			const cached = fullResultCache.get(taskId);
			return cached === undefined ? null : cached;
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

		/** Release (or drop) a confirmation-mode batch parked by the panel. */
		async function releaseAwaiting(sessionId, release) {
			const record = state.commanders.get(sessionId);
			const pending = record === undefined ? undefined : record.awaitingConfirm;
			if (record === undefined || pending === undefined) return;
			update((s) => {
				const rec = s.commanders.get(sessionId);
				if (rec !== undefined) rec.awaitingConfirm = undefined;
			});
			if (release !== true) {
				console.info(LOG_PREFIX, "确认模式批次已忽略（" + pending.items.length + " 项）");
				return;
			}
			// Release-time dedup: items parked in awaitingConfirm never passed
			// evaluateBatch, so identical texts could stack up across replies and
			// all fire here. Compare against live tasks AND each other.
			const seenKeys = new Set();
			for (const t of state.tasks.values()) {
				if (t.commanderId !== sessionId || isTerminalStatus(t.status)) continue;
				const key = normTaskKey(t.fullText ?? t.excerpt);
				if (key !== "") seenKeys.add(key);
			}
			for (const item of pending.items) {
				const key = normTaskKey(item.task ?? item.excerpt);
				if (key !== "" && seenKeys.has(key)) {
					console.warn(LOG_PREFIX, "放行去重：跳过与在跑任务重复的挂起项——", truncateText(item.excerpt ?? key, 40));
					continue;
				}
				if (key !== "") seenKeys.add(key);
				await dispatchTask(record, item, pending.batchId, null).catch((error) => console.warn(LOG_PREFIX, "放行派发异常：", errorMessage(error)));
			}
		}

		/** Find the live approval wait for one task's worker, if any. */
		function getApprovalWait(task) {
			if (runtime === null) return null;
			const face = runtime.sessions.binding(task.workerId)?.session;
			if (face === undefined || typeof face.getSnapshot !== "function") return null;
			const pendingList = face.getSnapshot().pending ?? [];
			return pendingList.find((wait) => wait.kind === "approval") ?? null;
		}

		/**
		 * One-click approval decision from the panel: answers the worker's
		 * pending permission interaction without visiting that window.
		 */
		async function respondApproval(taskId, outcome) {
			const task = state.tasks.get(taskId);
			if (task === undefined || task.status !== "running") return;
			const wait = getApprovalWait(task);
			if (wait === null) {
				console.warn(LOG_PREFIX, "该任务当前没有可应答的审批");
				return;
			}
			try {
				await wait.respond({
					ok: true,
					value: { sessionId: wait.sessionId, approvalId: wait.payload.approvalId, outcome },
				});
				console.info(LOG_PREFIX, "审批已应答 [" + String(outcome) + "]：", task.workerTitle || task.workerId);
				notifyUser("指挥官 · 审批已" + (outcome === "approved" ? "批准" : "拒绝"), truncateText(task.excerpt, 60));
			} catch (error) {
				console.warn(LOG_PREFIX, "审批应答失败：", errorMessage(error));
			}
		}

		/**
		 * Worker-pool spawner: create `count` fresh workers named after the role
		 * and dispatch the same warm-up template to each. Sequential so the
		 * per-worker locks and caps stay honest.
		 */
		async function spawnPool(sessionId, spec) {
			await ensureConfig();
			const record = state.commanders.get(sessionId);
			if (record === undefined) throw new Error("该会话不是激活中的指挥官");
			const count = Math.min(Math.max(positiveInt(spec?.count, 2), 1), 5);
			const role = String(spec?.role ?? "").trim() || "worker";
			const template = String(spec?.template ?? "").trim();
			if (template === "") throw new Error("初始指令不能为空");
			for (let i = 1; i <= count; i++) {
				if (countOutstanding(sessionId) >= positiveInt(state.config.maxOutstanding, 5)) {
					console.warn(LOG_PREFIX, "开池提前结束：并发已达上限（完成 " + String(i - 1) + "/" + String(count) + "）");
					break;
				}
				const rendered = template.replace(/\{role\}/g, role).replace(/\{i\}/g, String(i)).replace(/\{n\}/g, String(count));
				await dispatchTask(record, { target: "", title: "[" + role + " " + String(i) + "/" + String(count) + "]", task: rendered, fork: "", tid: "", depends: [] }, null).catch((error) => console.warn(LOG_PREFIX, "开池异常：", errorMessage(error)));
			}
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
		const STATUS_LABEL = { sending: "发送中", scheduled: "定时中", running: "运行中", waiting: "排队中", "blocked-dep": "等依赖", done: "已完成", failed: "失败", blocked: "已阻塞", "taken-over": "已接管" };

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
						confirmDispatch: state.config.confirmDispatch,
						panelApprovals: state.config.panelApprovals,
						takeoverFollow: state.config.takeoverFollow,
						takeoverOnHuman: state.config.takeoverOnHuman,
						dedupDispatch: state.config.dedupDispatch,
						maxContinuations: state.config.maxContinuations,
						maxFailovers: state.config.maxFailovers,
						maxNewWorkersPerBatch: state.config.maxNewWorkersPerBatch,
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
						confirmDispatch: draft.confirmDispatch === true,
						panelApprovals: draft.panelApprovals === true,
						takeoverFollow: draft.takeoverFollow === true,
						takeoverOnHuman: draft.takeoverOnHuman === true,
						dedupDispatch: draft.dedupDispatch === true,
						maxContinuations: Number(draft.maxContinuations),
						maxFailovers: Number(draft.maxFailovers),
						maxNewWorkersPerBatch: Number(draft.maxNewWorkersPerBatch),
					});
					setSettingsMsg("已保存并生效");
				} catch (caught) {
					setSettingsMsg("保存失败：" + errorMessage(caught));
				}
			};
			const copyReport = async () => {
				const text = buildReportText(sessionId);
				const ok = await copyTextToClipboard(text);
				if (ok) console.info("[dsh-commander] 报告已复制到剪贴板");
				else console.warn("[dsh-commander] 复制报告失败");
			};

			// Worker-pool spawner form.
			const [showPool, setShowPool] = react.useState(false);
			const [poolRole, setPoolRole] = react.useState("");
			const [poolCount, setPoolCount] = react.useState(2);
			const [poolTemplate, setPoolTemplate] = react.useState("");
			const [poolBusy, setPoolBusy] = react.useState(false);
			const [poolMsg, setPoolMsg] = react.useState("");
			const doSpawn = async () => {
				if (poolBusy || poolTemplate.trim() === "") return;
				setPoolBusy(true);
				setPoolMsg("开池中…");
				try {
					await spawnPool(sessionId, { role: poolRole, count: Number(poolCount), template: poolTemplate });
					setPoolMsg("已按模板开池");
					setPoolTemplate("");
				} catch (caught) {
					setPoolMsg(errorMessage(caught));
				} finally {
					setPoolBusy(false);
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
					record.awaitingConfirm !== undefined && record.awaitingConfirm !== null
						? react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-compose", "data-awaiting-confirm": true, children: [
								react_jsx_runtime.jsx("div", { className: "dsh-cmdr-notice", children: "确认模式：" + String(record.awaitingConfirm.items.length) + " 个任务等待放行" }, "acmsg"),
								react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-crow", children: [
									react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", onClick: () => void releaseAwaiting(sessionId, true), children: "全部放行" }, "go"),
									react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", onClick: () => void releaseAwaiting(sessionId, false), children: "忽略" }, "drop"),
								] }, "row"),
							] }, "awaiting")
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
										task.status === "taken-over" && task.follow === true ? "已接管 · 观察中" : (STATUS_LABEL[task.status] ?? task.status),
										" · ",
										(task.alias !== "" ? task.alias + " " : "") + (task.workerTitle || task.workerId || "待定"),
									] }, "name"),
									task.stuck === true ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "worker 正在等待权限确认等人工交互", children: "待确认" }, "stuck") : null,
									task.humanPresent === true && task.status === "running"
										? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "检测到人工在该 worker 会话中发言；按当前设置任务未被打断，插件继续跟进", children: "人工在场" }, "hp")
										: null,
									(task.failovers | 0) > 0 ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "原 worker 失败后自动改派重试", children: "已换人" + String(task.failovers) }, "fo") : null,
									Array.isArray(task.files) && task.files.length > 0
										? react_jsx_runtime.jsx("span", {
												className: "dsh-cmdr-flag",
												title: "变更文件（点击复制路径）：\n" + task.files.map((entry) => entry.path).join("\n"),
												style: { cursor: "pointer" },
												onClick: () => void copyTextToClipboard(task.files.map((entry) => entry.path).join("\n")),
												children: "📄" + String(task.files.length),
											}, "files")
										: null,
									task.slow === true && task.status !== "waiting"
										? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "该任务运行时间已超过 stuckTimeoutMs", children: "超时" }, "slow")
										: null,
									task.stalled === true && task.status === "waiting"
										? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "目标会话长时间未空闲——可点「立即发」强制投递", children: "排队久" }, "stall")
										: null,
									react_jsx_runtime.jsx("span", { className: "dsh-cmdr-ttime", children: fmtTime(task.sentAt) }, "time"),
									task.settledAt > 0 && task.sentAt > 0
										? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-flag", title: "结算耗时", children: Math.max(1, Math.round((task.settledAt - task.sentAt) / 1000)) + "s" }, "dur")
										: null,
									(task.status === "running" || task.status === "sending")
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => void cancelTask(task.id), children: "停止" }, "cancel")
										: null,
									task.status === "running" && task.stuck === true && state.config.panelApprovals === true
										? [
												react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", title: "批准该 worker 的权限请求", onClick: () => void respondApproval(task.id, "approved"), children: "✓批" }, "ok"),
												react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", title: "拒绝该 worker 的权限请求", onClick: () => void respondApproval(task.id, "denied"), children: "✗拒" }, "no"),
											]
										: null,
									task.status === "waiting"
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", title: "worker 被标记忙碌但可能只是卡住了；忽略占用标志立即发送", onClick: () => void forceDispatchWaiting(task.id), children: "强发" }, "force")
										: null,
									task.status === "taken-over" && task.follow === true
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", title: "不再向本会话推送该 worker 的观察进展", onClick: () => stopFollowing(task.id), children: "停止观察" }, "unfollow")
										: null,
									(task.status === "failed" || task.status === "blocked") && state.commanders.has(task.commanderId)
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => void retryTask(task.id).catch((error) => console.warn("[dsh-commander]", errorMessage(error))), children: "重试" }, "retry")
										: null,
									isTerminalStatus(task.status) && typeof task.workerId === "string" && task.workerId !== ""
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => void fetchFullResult(task.id), children: task.fullLoading === true ? "加载中…" : task.showFull === true ? "收起全文" : "全文" }, "full")
										: null,
									task.workerId !== ""
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => openWorker(task.workerId), children: "打开" }, "open")
										: null,
								] }, "row"),
								react_jsx_runtime.jsx("div", { className: "dsh-cmdr-tex", children: task.excerpt }, "ex"),
								task.detail !== "" ? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-tdetail", children: truncateText(task.detail, 300) }, "dt") : null,
								Array.isArray(task.files) && task.files.length > 0
									? react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-tfilelist", children: [
											...(task.files.map((entry, index) =>
												react_jsx_runtime.jsx("div", {
													className: "dsh-cmdr-file",
													title: "点击复制路径",
													onClick: () => void copyTextToClipboard(entry.path),
													children: "· " + entry.path,
												}, String(index)),
											)),
										] }, "flist")
									: null,
								task.showFull === true
									? (() => {
											const cached = getFullResultText(task.id);
											if (cached === null) return react_jsx_runtime.jsx("div", { className: "dsh-cmdr-tdetail", children: "加载中…" }, "fullopen");
											return react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-full", children: [
												cached.truncated ? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-notice", children: "结果过长，已截断到 200KB。" }, "ftrunc") : null,
												cached.text.trim() === "" ? "（无输出）" : cached.text,
											] }, "fullopen");
										})()
									: null,
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
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: () => setShowPool((v) => !v), children: "开池" }, "pool"),
						react_jsx_runtime.jsx("span", { className: "dsh-cmdr-spacer" }, "sp"),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-mini", onClick: toggleSettings, children: showSettings ? "收起设置" : "设置" }, "cfg"),
					] }, "actions"),
					showPool
						? react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-compose", "data-commander-pool": true, children: [
								react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-crow", children: [
									react_jsx_runtime.jsx("input", { className: "dsh-cmdr-select", style: { flex: "1" }, placeholder: "角色（如 测试手）", value: poolRole, onChange: (event) => setPoolRole(event.target.value) }, "role"),
									react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 1, max: 5, value: String(poolCount), onChange: (event) => setPoolCount(Number(event.target.value)) }, "n"),
									poolTemplate.trim() !== ""
										? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-cmdr-act", disabled: poolBusy, onClick: () => void doSpawn(), children: poolBusy ? "开池中…" : "开池" }, "go")
										: null,
								] }, "row"),
								react_jsx_runtime.jsx("textarea", {
									className: "dsh-cmdr-input",
									rows: 2,
									placeholder: "热身指令模板，可用占位符 {role} {i} {n}。示例：你是{role}（第{i}/{n}个），请先通读仓库结构并总结你负责的部分",
									value: poolTemplate,
									onChange: (event) => setPoolTemplate(event.target.value),
								}, "ta"),
								poolMsg !== "" ? react_jsx_runtime.jsx("div", { className: "dsh-cmdr-tdetail", children: poolMsg }, "pmsg") : null,
							] }, "poolform")
						: null,
					showSettings && draft !== null
						? react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-settings", "data-commander-settings": true, children: [
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["轮询间隔 (ms)", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 500, max: 60000, value: String(draft.pollIntervalMs), onChange: (event) => setDraft({ ...draft, pollIntervalMs: Number(event.target.value) }) })] }, "pi"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["并发任务上限", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 1, max: 32, value: String(draft.maxOutstanding), onChange: (event) => setDraft({ ...draft, maxOutstanding: Number(event.target.value) }) })] }, "mo"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["中断续跑次数", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 0, max: 5, value: String(draft.maxContinuations), onChange: (event) => setDraft({ ...draft, maxContinuations: Number(event.target.value) }) })] }, "mc"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["失败自动换人", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 0, max: 3, value: String(draft.maxFailovers), onChange: (event) => setDraft({ ...draft, maxFailovers: Number(event.target.value) }) })] }, "mf"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: ["一次最多开窗数", react_jsx_runtime.jsx("input", { type: "number", className: "dsh-cmdr-input dsh-cmdr-snum", min: 0, max: 16, value: String(draft.maxNewWorkersPerBatch), onChange: (event) => setDraft({ ...draft, maxNewWorkersPerBatch: Number(event.target.value) }) })] }, "mw"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.autoReport === true, onChange: (event) => setDraft({ ...draft, autoReport: event.target.checked }) }), "自动回执注入"] }, "ar"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.autoLabelWorkers === true, onChange: (event) => setDraft({ ...draft, autoLabelWorkers: event.target.checked }) }), "新 worker 自动标注标题"] }, "al"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.confirmDispatch === true, onChange: (event) => setDraft({ ...draft, confirmDispatch: event.target.checked }) }), "派发前需人工放行"] }, "cd"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.panelApprovals === true, onChange: (event) => setDraft({ ...draft, panelApprovals: event.target.checked }) }), "面板一键批准/拒绝"] }, "pa"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.takeoverFollow === true, onChange: (event) => setDraft({ ...draft, takeoverFollow: event.target.checked }) }), "接管后继续观察汇报"] }, "tf"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.takeoverOnHuman === true, onChange: (event) => setDraft({ ...draft, takeoverOnHuman: event.target.checked }) }), "人工插话即终止任务（旧版接管）"] }, "toh"),
								react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsh-cmdr-scheck", checked: draft.dedupDispatch === true, onChange: (event) => setDraft({ ...draft, dedupDispatch: event.target.checked }) }), "拦截重复派发的任务"] }, "dd"),
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

		//#region dsh-commander/SettingsSection.js
		/**
		 * The native settings page (`settings.section` seat): the SAME fields as
		 * the panel's 设置区, rendered inside dsh's own settings chrome. Reads
		 * and writes go through the shared loadConfig/updateConfig pair, so the
		 * yaml namespace stays the single source of truth no matter which
		 * surface edited it.
		 */
		const SETTINGS_FIELDS = [
			{ key: "pollIntervalMs", label: "轮询间隔 (ms)", type: "number", min: 500, max: 60000 },
			{ key: "maxOutstanding", label: "并发任务上限", type: "number", min: 1, max: 32 },
			{ key: "maxNewWorkersPerBatch", label: "一次最多开几个对话", type: "number", min: 0, max: 16 },
			{ key: "maxContinuations", label: "中断续跑次数", type: "number", min: 0, max: 5 },
			{ key: "maxFailovers", label: "失败自动换人", type: "number", min: 0, max: 3 },
			{ key: "autoReport", label: "自动回执注入", type: "checkbox" },
			{ key: "confirmDispatch", label: "派发前需人工放行", type: "checkbox" },
			{ key: "panelApprovals", label: "面板一键批准/拒绝", type: "checkbox" },
			{ key: "takeoverFollow", label: "接管后继续观察汇报", type: "checkbox" },
			{ key: "takeoverOnHuman", label: "人工插话即终止任务（旧版接管）", type: "checkbox" },
			{ key: "dedupDispatch", label: "拦截重复派发的任务", type: "checkbox" },
			{ key: "autoLabelWorkers", label: "新 worker 自动标注标题", type: "checkbox" },
			{ key: "notify", label: "后台桌面通知", type: "checkbox" },
		];

		/**
		 * Aggregate finished+active task stats grouped by worker project
		 * (cwd basename), with a pinned 总计 row — rendered inside the native
		 * settings page.
		 */
		function buildTaskStats() {
			const list = runtime !== null ? runtime.sessions.list.getSnapshot() : undefined;
			const groups = new Map();
			let tokens = 0;
			for (const task of [...state.tasks.values()].reverse()) {
				const row = list?.byId?.[task.workerId];
				const cwd = typeof row?.cwd === 'string' && row.cwd !== '' ? row.cwd : '';
				const project = cwd === '' ? '未知项目' : (cwd.split(/[\\/]/).filter(Boolean).pop() || cwd);
				const bucket = groups.get(project) ?? { project, total: 0, done: 0, failed: 0, active: 0, durationSum: 0, durationN: 0, files: 0 };
				bucket.total += 1;
				if (task.status === 'done') { bucket.done += 1; }
				else if (task.status === 'failed') { bucket.failed += 1; }
				const dur = task.settledAt > 0 && task.sentAt > 0 ? Math.round((task.settledAt - task.sentAt) / 1000) : null;
				if (dur !== null && task.status === 'done') { bucket.durationSum += dur; bucket.durationN += 1; }
				if (Array.isArray(task.files)) bucket.files += task.files.length;
				groups.set(project, bucket);
			}
			const rows = [...groups.values()];
			const totalRow = { project: '总计', total: 0, done: 0, failed: 0, active: 0, durationSum: 0, durationN: 0, files: 0 };
			for (const r of rows) {
				totalRow.total += r.total; totalRow.done += r.done; totalRow.failed += r.failed;
				totalRow.durationSum += r.durationSum; totalRow.durationN += r.durationN; totalRow.files += r.files;
			}
			rows.sort((a, b) => b.total - a.total);
			return { rows, totalRow };
		}

		const CommanderSettingsSection = react.memo(function CommanderSettingsSection() {
			useEngineTick();
			const [draft, setDraft] = react.useState(null);
			const [msg, setMsg] = react.useState("");
			const loadedRef = react.useRef(false);
			react.useEffect(() => {
				if (loadedRef.current || !state.configLoaded) return;
				loadedRef.current = true;
				setDraft({ ...state.config });
			});
			function buildTaskStatsView() {
				const { rows, totalRow } = buildTaskStats();
				if (totalRow.total === 0) return react_jsx_runtime.jsx("div", { className: "dsh-cmdr-empty", children: "暂无任务统计。" }, "stats-empty");
				const rate = (bucket) => {
					const settled = bucket.done + bucket.failed;
					return settled > 0 ? Math.round((bucket.done / settled) * 100) + "%" : "—";
				};
				const avg = (bucket) => bucket.durationN > 0 ? Math.round(bucket.durationSum / bucket.durationN) + "s" : "—";
				const rowView = (bucket, key, highlight) => react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-statrow" + (highlight ? " dsh-cmdr-statrow-total" : ""), children: [
					react_jsx_runtime.jsx("span", { className: "dsh-cmdr-statproj", children: bucket.project }, "p"),
					react_jsx_runtime.jsx("span", { children: String(bucket.total) + " 任务" }, "t"),
					react_jsx_runtime.jsx("span", { children: "成功 " + rate(bucket) }, "r"),
					bucket.failed > 0 ? react_jsx_runtime.jsx("span", { className: "dsh-cmdr-notice", children: "失败 " + String(bucket.failed) }, "f") : null,
					react_jsx_runtime.jsx("span", { children: "均 " + avg(bucket) }, "a"),
					bucket.files > 0 ? react_jsx_runtime.jsx("span", { children: "📄" + String(bucket.files) }, "fl") : null,
				] }, key);
				return react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-stats", "data-commander-stats": true, children: [
					react_jsx_runtime.jsx("div", { className: "dsh-cmdr-sect", children: "任务统计（按项目）" }, "stats-title"),
					...rows.map((bucket) => rowView(bucket, bucket.project, false)),
					rowView(totalRow, "__total__", true),
				] });
			}
			if (!state.configLoaded) {
				return react_jsx_runtime.jsx("div", { className: "dsh-cmdr-empty", children: "配置加载中…" }, "loading");
			}
			// Effective draft: local edits once the user touches a field, resolved
			// config otherwise. Avoids render-phase setState entirely.
			const eff = draft ?? state.config;
			return react_jsx_runtime.jsxs("div", { className: "dsh-cmdr-native-settings", "data-commander-settings-page": true, children: [
				react_jsx_runtime.jsx("p", { className: "dsh-cmdr-sdesc", children: "指挥官模式的全局设置：与面板「设置」区共用同一份 ~/.dsh/settings.yaml 命名空间，保存即时生效。" }, "desc"),
				buildTaskStatsView(),
				react_jsx_runtime.jsx("div", { className: "dsh-cmdr-sect", children: "设置" }, "sect-title"),
				...(SETTINGS_FIELDS.map((field) => {
					if (field.type === "number") {
						return react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [
							field.label,
							react_jsx_runtime.jsx("input", {
								type: "number",
								className: "dsh-cmdr-input dsh-cmdr-snum",
								min: field.min,
								max: field.max,
								value: String(eff?.[field.key] ?? ""),
								onChange: (event) => setDraft((current) => ({ ...current, [field.key]: Number(event.target.value) })),
							}),
						] }, field.key);
					}
					return react_jsx_runtime.jsxs("label", { className: "dsh-cmdr-srow", children: [
						react_jsx_runtime.jsx("input", {
							type: "checkbox",
							className: "dsh-cmdr-scheck",
							checked: eff?.[field.key] === true,
							onChange: (event) => setDraft((current) => ({ ...current, [field.key]: event.target.checked })),
						}),
						field.label,
					] }, field.key);
				})),
				msg !== "" ? react_jsx_runtime.jsx("div", { className: msg.indexOf("失败") !== -1 ? "dsh-cmdr-notice" : "dsh-cmdr-empty", children: msg }, "msg") : null,
				react_jsx_runtime.jsx("button", {
					type: "button",
					className: "dsh-cmdr-act",
					onClick: () => {
						const source = draft ?? eff;
						const patch = {};
						for (const field of SETTINGS_FIELDS) patch[field.key] = field.type === "number" ? Number(source[field.key]) : source[field.key] === true;
						setMsg("保存中…");
						updateConfig(patch)
							.then(() => setMsg("已保存并生效"))
							.catch((error) => setMsg("保存失败：" + errorMessage(error)));
					},
					children: "保存设置",
				}, "save"),
			] });
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
		const inject = ["slots", "sessions", "remote"];
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
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dsh-commander",
				order: 30,
				label: "指挥官",
			}, (props) => react_jsx_runtime.jsx(CommanderSettingsSection, { ...props })));
			// yaml 手改后的实时回读（原生设置文档更新广播）
			try {
				ctx.remote?.$on?.("settings/document-updated", (ns) => {
					if (ns !== "dsh-commander") return;
					loadConfig().then((config) => {
						update((s) => {
							s.config = config;
						});
					}).catch(() => {});
				});
			} catch {}
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
		exports.restoreCommanders = restoreCommanders;
		exports.reconcileRestoredTasks = reconcileRestoredTasks;
		exports.__gates = function () { return { waitQueue, depIndex }; };
		exports.probeTailWithRetry = probeTailWithRetry;
		exports.refreshRoster = refreshRoster;
		exports.countOutstanding = countOutstanding;
		exports.hasOutstanding = hasOutstanding;
		exports.fetchEvents = fetchEvents;
		exports.injectBriefing = injectBriefing;
		exports.poll = poll;
		exports.cancelTask = cancelTask;
		exports.retryTask = retryTask;
		exports.forceDispatchWaiting = forceDispatchWaiting;
		exports.directDispatch = directDispatch;
		exports.releaseAwaiting = releaseAwaiting;
		exports.respondApproval = respondApproval;
		exports.spawnPool = spawnPool;
		exports.updateConfig = updateConfig;
		exports.fetchFullResult = fetchFullResult;
		exports.buildReportText = buildReportText;
		exports.notifyUser = notifyUser;
		exports.requestNotifyPermission = requestNotifyPermission;
		exports.HeaderCommander = HeaderCommander;
		exports.GlobalIndicator = GlobalIndicator;
		exports.CommanderSettingsSection = CommanderSettingsSection;
		exports.apply = apply;
		exports.inject = inject;
	return module.exports;
	}
});
