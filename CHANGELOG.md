# Changelog

## 2.2.0 — 2026-10-17

### 适配 harness 0.2.0-rc.2

- **配置通道迁移**：删除 `ctx.inject(['settings'])` + `settings.register('dsh-commander', SCHEMA)`（0.2.0 已移除该 API），改为导出 `Config = SCHEMA`，由 loader 校验 profile 条目 `ui-dsh-commander` 的 `config` 后经 `apply(ctx, config)` 传入；`inject` 收敛为 `['webServer', 'sessions', 'llm']`。
- **面板写回改为插件自有覆盖层**：`POST /api/dsh-commander/config` 不再写设置命名空间，而是白名单 + 区间钳制后写入 `<dsh-home>/dsh-commander/overrides.json`（原子写）。每项记录写入时的 profile 基准值：`cordis.patch.yml` 事后改同一键时 profile 立即胜出，过期覆盖自动失效；删除该文件即回到 profile 配置。
- **会话日志读取迁移**：`session.events` 在 0.2.0 已删除，`hasOpenTurn` / `projectAssistantTail` 改用 `session.snapshotEvents()`（旧属性仅作兜底）。
- **消息 source 迁移**：0.2.0 的消息来源没有通用 `plugin` kind，简报注入改为 `{ kind: 'dsh-commander' }`；真人消息计数同时把新 kind 与旧 `plugin` kind 视为插件消息（不误判为人工接管）。
- **圆桌讨论对齐 `GenerateOptions`**：0.2.0 必填 `provider`/`model`。解析顺序为「请求体 → `agentDefaultModel` → 首个已注册 provider 路由（含 `listModels` 首项）」，都解析不到时返回 503 `no-model-route`，不再把缺省路由交给适配器；调用同时带上 `AbortSignal` 超时。
- **客户端会话访问改为引用生命周期**：0.2.0 的 `sessions.binding(id)` 只对已 retain 的会话有效。新增 `acquireSessionFace` / `withSessionFace`：已绑定则直接使用，否则 `retain(id, { source: 'commander' })` → `await reference.ready` → `reference.binding.session` → `release()`。投递、改名（fork/新建 worker）、续跑、取消、回执、批次汇总、观察推送、邮箱投递全部改走该路径；负载均衡与 failover 的「可达性」判定改用列表行，不再把「未 retain」误判为不可达。
- **导航迁移**：`sessions.open()` 已删除，跳转改用 `ctx.get('uiWorkspace').openSession(id)`（面板「打开」与全局指示器）。
- **待应答交互迁移**：列表行不再有 `pendingInteraction`，改为读 `uiSession.sessionStatus` 的 `pendingInteraction`；面板一键审批改调 0.2.0 的 `PendingApproval.answer('allowed-once' | 'rejected')`，旧快照 `pending` 数组保留兜底。
- **`settings/document-updated` 对齐**：0.2.0 广播携带 profile 条目 id（`ui-dsh-commander`），不再比较旧命名空间名。
- **`package.json`**：`dsh.client.inject` 移除已删除的 `@deepseek-ai/dsh-client-runtime`，改列属主包（gateway / api-session-controller / ui-session / ui-conversation / ui-layout / ui-settings / ui-workspace / locale）；描述与版本 2.1.0 → 2.2.0。
- **测试跟进**：`test/smoke.cjs` 的 host 段不再 mock `settings.register`，改为 `apply(ctx, config)` 驱动 + 覆盖层文件断言 + `snapshotEvents()` 专用会话 mock + 圆桌路由解析矩阵；client 段重写 sessions mock（binding 仅对已 retain 生效、retain/ready/release 计数、uiSession、uiWorkspace），新增「无引用泄漏」「导航」「配置广播」「审批一键应答」断言，原有断言全部保留。`test/soak.cjs` 同步新契约并新增「回合之间无残留会话引用」不变量。

## 2.1.0 — 2026-09-19

### 适配 harness ≥ 0.1.6

- **host 半区注入 `llm` 服务**。新版沙箱 ctx 只允许访问 `inject` 里声明过的服务——此前 `handleRoundtable` 的 `ctx.llm.stream` 会被守卫以 "service llm is not injected" 拒绝，圆桌讨论整体不可用。
- 测试基建跟进新版 harness：react/react-dom 转为插件 devDependencies（新版 harness 前端不再把 react 装进 `profiles/node_modules`），私有 `@deepseek-ai` 作用域按需 junction，react 不可用时自动降级。

### 修复（审计遗留清单）

- `enabled=false` 后 `fullresult` / `mail` / `git` 三条路由不再放行。
- registry / mailbox 读改写加写锁，并发写不再互相覆盖；mail id 加随机后缀，同毫秒投递不再碰撞。
- git `execFile` 增加 120s 硬超时（挂起的 worktree 操作不再永久占住仓库锁）；仓库锁键在 Windows 下大小写归一。
- config 写回数值键全部钳制到安全区间（与客户端 normalizeConfig 对齐）。
- roundtable 上下文 32KB 封顶；单次 LLM 调用 180s 超时。
- worker 复述简报中的 `<dsh-mail>` 示例不再被当真投递：围栏代码块内的 mail/roundtable 块忽略 + 精确匹配简报示例体忽略（真实派发的 `<dsh-dispatch>` 解析保持原样，含围栏）。
- dedup 键对齐：准入侧与历史侧统一先按 `maxTaskChars` 截断再归一化，超长任务文本的重复判定不再漂移。
- 确认模式挂起批持久化到 localStorage，页面刷新不再蒸发；放行时复查并发上限，超限部分重新挂起而不是丢弃。
- HMR 接管：旧实例在途 poll 通过 epoch 守卫在阶段边界中止，杜绝秒级窗口内的重复派发。
- 徽章 / 全局指示器计数改为「未结算任务数」（含排队/定时/等依赖），与准入用的并发计数分离。
- events 路由新增 `filesTruncated` 信号（变更文件清单达到 20 条截断上限时可见）。

### 安全

- 所有改写路由（config / inject / mail / git / registry / roundtable）增加跨源（Origin/Host 不匹配 → 403）写保护，阻断浏览器侧 CSRF。

## 2.0.0

初版全功能：协议派发 / 广播 / fork 继承 / 依赖编排 / 延迟派发 / worktree 隔离 / 协作邮箱 / 圆桌讨论 / 续跑与换人 / 双写持久化 / 双设置面 / 任务统计 / 报告导出。
