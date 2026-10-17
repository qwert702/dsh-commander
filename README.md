# dsh-commander v2.2

DeepSeek Harness Web GUI 的**指挥官**插件：把任意一个对话升级成「指挥官」，它的模型可以在回复里派发任务给其他对话（worker）并行执行；插件自动送达任务、监视 worker、把结果摘要以「回执」注入指挥官会话，形成无人值守的多窗口协作闭环。

> **v2.2 适配 harness 0.2.0-rc.2**：配置通道从已删除的 `settings.register()` 命名空间改为 **导出 `Config` + `apply(ctx, config)`**（写回改走插件自己的持久覆盖层）；会话读取改用 `session.snapshotEvents()`；客户端会话访问改为 **`retain → ready → binding.session → release`**（0.2.0 的 `binding()` 只对已 retain 的会话有效）；会话跳转改用 `uiWorkspace.openSession()`；待应答交互改读 `uiSession.sessionStatus`；消息 source 改为插件自有 kind `dsh-commander`；圆桌讨论按 0.2.0 的 `GenerateOptions` 解析 provider/model。详见 CHANGELOG 的 2.2.0 条目。

> **一键安装：**
> ```
> dsh plugin add qwert702/dsh-commander
> ```
> 装完重启 harness（`dsh web`）、刷新页面即可生效。会话头部会出现「成为指挥官」按钮。

## 功能

- **一键激活/停用**：会话头部点「成为指挥官」→ 确认后，插件把一份**协议简报**（指挥官规则 + 从会话列表实时生成的 worker 花名册）静默注入该会话（不触发模型回合、不烧 token）；再次点击徽章可打开面板「停止指挥」。
- **协议派发**：指挥官的模型在回复中原样输出任务块，插件解析后自动执行：

  ```xml
  <dsh-dispatch target="#1" title="新会话标题(可选)">
  交给 worker 的完整、自包含的任务描述
  </dsh-dispatch>
  ```

  - `target` 填花名册别名（`#1`）或完整会话 id；**省略则自动新建 worker 会话**（继承指挥官工作目录，并自动标注 `[T3] 任务摘要…` 式侧边栏标题；有 `title` 则以 title 为准）。
  - **广播派发**：`target="#1,#2"` 同一任务发给多个 worker 并行；`target="all"` 发给花名册全部会话。
  - **上下文继承**：`fork="commander"`（或 `fork="<会话id>"`）配合省略 target 时改走会话分叉——新 worker 天然携带源会话的全部背景，任务文本不必再自包含（代价：继承前缀消耗更多 token）。
  - **依赖编排**：块可带 `tid="a"` 命名自己；另一块 `depends="a,b"` 会等这些前序任务全部完成后才派发，任一前序失败则连锁取消（fail-fast）。
  - 一次回复可含多个块，逐个送达。
- **同 worker 串行化**：引擎按 worker 加发送锁——同一 worker 上一次任务未结算时后续任务自动排队（面板显示「排队中」），baseline 探针在持锁后才执行，**回执归因永不串台**；人类正在占用 worker 时同样让位。
- **负载均衡简报**：协议简报自带每个 worker 的实时任务负载（空闲 / 进行中 N 个），并明确要求相互独立的任务分散到不同 worker、优先低负载会话——杜绝「全部压给同一个对话」。
- **循环防护**：派发给另一个激活中的指挥官允许但计入 `commanderHops` 预算（默认 10），超限拒绝，杜绝 A→B→A 乒乓烧 token。
- **用量统计**：回执自动附带耗时与输出 token 数（聚合自回合 usage），面板每行可见 `⏱12s · ~579 tok`。
- **结果自动回流**：worker 完成回合后，插件从 host 事件日志提取其新增输出，截为摘要，以 `[指挥官回执 · #N 「标题」] 状态：…` 的消息 queue 进指挥官会话——指挥官被唤醒继续汇总或继续派发，无需人工复制粘贴。
- **产物回收**：回执自动附带 worker 的**变更文件清单**（从 write/edit 工具调用投影，去重保序），面板任务行显示 📄N 徽标、路径点击即复制——产出不再只是一段话。
- **全文结果**：面板「全文」按钮拉取该任务的完整输出（200KB 上限内不截断），摘要之外随时可查原文。
- **中断自动续跑**：worker 回合被截断（token 上限）或异常中止（aborted/error）时，插件自动向该 worker 发送续跑指令（"从中断处继续执行原始任务"），最多 `maxContinuations` 次；最终回执聚合中断前后全部输出并标注续跑次数。手动取消与人工接管永不触发续跑。
- **延迟派发**：`<dsh-dispatch delay="10m" ...>` 支持 `30s / 10m / 1h` 或纯秒数；任务进入「定时中」，到点自动走完整派发管线（含锁/排队/回执），重启后未到点的任务照常计时。
- **失败自动换人（failover）**：续跑仍救不回来的失败任务，自动改派给负载最低的空闲 worker 重跑同一任务（`maxFailovers` 预算沿链继承，杜绝无限换人）；面板标注「已换人」，回执注明改派去向。
- **审批一键操作**：worker 卡在权限确认时，任务行出现 ✓批 / ✗拒 按钮——在指挥官面板里直接应答（0.2.0 下经由 `uiSession` 发布的可应答审批对象），不用跳进 worker 窗口。
- **开池模板**：面板「开池」表单输入角色 + 数量 + 热身指令模板（支持 `{role} {i} {n}` 占位符），一键批量创建同角色 worker 并预派热身任务。
- **派发前确认模式**：`confirmDispatch: true` 时每批任务先挂起，面板点「全部放行」才真正发送——给自动化加一道总闸。
- **批次汇总回执**：一次派发的多个任务全部结算后，额外注入一条 `[指挥官批次汇总 · N 项已全部结算]`，逐项带状态与结果预览，指挥官一眼消化整波结果。
- **任务面板**：头部徽章显示进行中任务数，点击下拉面板：
  - 任务列表：状态点（排队/等依赖/运行/完成/失败/已接管）/ 目标 / 摘要 / 耗时与 token / 打开会话；
  - **手动直派**：选 worker + 输任务直接发送，绕过模型协议的逃生门（仍受并发上限、worker 锁、回执闭环约束）；
  - **停止**：运行中任务随时取消；**重试**：失败/阻塞任务一键重发；排队任务可 **立即发** 强制投递；
  - 徽标：「待确认」（worker 在等权限确认）/「超时」（超过 `stuckTimeoutMs`）/「排队久」（目标长时间未空闲，提示用立即发）；
  - 花名册区：各会话运行状态点 + 刷新花名册。
- **设置面板**：「设置」展开即可调轮询间隔/并发上限/回执开关/通知等，保存后写入插件自己的配置覆盖层并即时生效，无需手动改文件重启。
- **原生设置页**：dsh 侧边栏「设置」面板新增**「指挥官」导航页**——轮询间隔、并发上限、**一次最多开几个对话**、续跑/换人次数、确认模式、回执与通知等全部字段就地编辑，保存写回覆盖层并即时生效；手动改 profile 配置也会通过 `settings/document-updated` 广播实时同步到界面。
- **任务统计（按项目 / 总计）**：同一设置页顶部实时汇总各项目（按 worker 工作目录）的任务数、成功率、平均耗时与变更文件数，底部固定「总计」行。
- **报告导出**：一键把全部任务+结果复制为 Markdown 归档。
- **人工在场不打断（默认）**：worker 会话里出现真人消息（非插件注入）时，任务**不会**被终止——仅标注「人工在场」徽章，插件照常跟进、照常结算回执；如需旧版「插话即接管」，开启 `takeoverOnHuman`：任务转终态「已接管」、依赖连锁取消，且 `takeoverFollow` 开启时附带**只读观察**——人工操作的每回合新进展以 `[指挥官观察 · #N]` 注入指挥官（含新增变更文件），面板显示「已接管 · 观察中」并可一键「停止观察」。
- **重复任务纠错（默认开）**：`dedupDispatch` 拦截同一任务文本的重复派发——本回复内跨块重复、或与已派发过的任务（进行中/已完成）重复时只保留一个，并向指挥官注入「[指挥官提示]」说明缘由；单块多目标（`target="#1,#2"`）的有意广播不受影响。续跑机制同步收紧为白名单判定：仅 token 截断（`max-tokens`）触发自动续跑；人为停止（`aborted`）与报错（`error`）按失败结算，由面板重试/failover 接管，正常完工（含 `completed`）绝不再误触发。
- **全局悬浮指示器**：任何会话右下角都有小挂件列出各激活指挥官及其进行中任务数，点击直达对应会话——人在别处干活也不漏进度。
- **后台桌面通知**：标签页在后台时，批次结算/任务失败/worker 卡住会发系统通知（首次激活时请求权限）。
- **负载均衡简报**：花名册注入时附带每个 worker 的实时任务数（空闲/进行中 N），并明确要求模型"独立任务必须派给不同 worker、优先选空闲会话"——杜绝把所有任务压给同一个对话。
- **重启不丢指挥官**：激活状态双写持久——浏览器 localStorage（页面刷新恢复）+ host 端 `<dsh-home>/dsh-commander/registry.json`（**harness 重启、换端口、换浏览器都照常恢复**）。引擎启动时合并两个来源，会话仍存在的指挥官自动重新上岗（游标钉在最新尾部，历史输出绝不重复执行）。
- **任务历史持久化**：任务表实时镜像到 localStorage（保留最近 100 条），页面刷新后自动恢复；未完成任务由监视器重新结算补发回执。
- **后台运行**：引擎挂在模块层而不是组件层——轮询走 host 事件日志路由，**不依赖当前浏览器停留在哪个对话**。

## 安全护栏

- 仅当指挥官空闲时才解析新输出；同一批输出只处理一次（游标推进，at-most-once）。
- **游标探测失败即拒绝上岗**：恢复/激活时若无法确认会话尾部锚点（重试 3 次仍失败），该指挥官跳过恢复或激活中止——绝不回退到 cursor 0，从根上杜绝"重启后历史任务被当新指令重放"。
- 上限：并发任务 5 / 单条消息块数 8 / 单任务字数 4000 / 单次激活累计派发 50（防失控循环），批次间隔 ≥1s。
- 拒绝自指（target=指挥官自己）；prompt 被拒标记为「已阻塞」并在面板可见，不做重试风暴。
- 简报注入在 host 端 fail-closed：会话不存在 / 回合进行中 / 超长文本一律拒绝。
- 所有改写路由带跨源（Origin/Host）校验；host 侧写回配置一律先白名单过滤再钳制数值区间。

## 工作原理

1. **host 半区**（`lib/index.js`）：导出 `Config`（配置 schema，由 loader 校验 profile 条目的 `config` 后经 `apply(ctx, config)` 传入）+ `inject: ['webServer','sessions','llm']`，并注册八条路由：
   - `GET|POST /api/dsh-commander/config` — 解析后的配置（默认值 ⊕ profile 条目 config ⊕ 面板覆盖层）；POST 为白名单写回（写入 `<dsh-home>/dsh-commander/overrides.json`，记录写入时的 profile 基准值，profile 改同一键时以 profile 为准）；
   - `POST /api/dsh-commander/inject {sessionId,text}` — 把简报作为一条 **source.kind = `dsh-commander`** 的 user 消息静默追加进会话（context-compressor 同款 checkpoint 手法，不开回合）；
   - `GET /api/dsh-commander/events?sessionId&cursor&limit` — 只读投影（走 0.2.0 的 `session.snapshotEvents()`）：cursor 之后已定型的 assistant 文本 + 最后一个 `turn/end` 原因 + 真人消息计数（接管信号，插件自有 source 不算真人）+ **变更文件与工具统计** + 全日志尾部锚点；
   - `GET /api/dsh-commander/fullresult?sessionId&baseline` — 任务完整输出（面板「全文」数据源）；
   - `GET|POST /api/dsh-commander/registry` — 持久指挥官注册表（`<dsh-home>/dsh-commander/registry.json`），重启存活的关键；
   - `GET|POST /api/dsh-commander/mail`、`POST /api/dsh-commander/git`、`POST /api/dsh-commander/roundtable` — 协作邮箱、worktree 操作、圆桌讨论（圆桌按 0.2.0 `GenerateOptions` 解析 provider/model：请求体 → `agentDefaultModel` → 首个已注册 provider 路由，全都解析不到则明确 503 而不是猜模型 id）。
2. **浏览器半区**（`lib/client.js`）：模块级引擎单例以 ~2s 轮询每个激活指挥官的 events 尾部 → 正则解析 `<dsh-dispatch>` 块 → 广播展开（`#1,#2` / `all`）→ 纯函数策略闸门（并发/条数/累计上限）→ 经客户端 sessions 运行时送达。0.2.0 的 `binding(id)` 只对**已 retain** 的会话有效，因此每次投递/改名/取消/回执都走 `retain(id,{source:'commander'}) → await reference.ready → reference.binding.session → release()`（一个操作一个引用，绝不泄漏）；新建 worker 用 `sessions.create({ cwd })`，fork 用 `sessions.fork({ sessionId })`；会话导航用 `uiWorkspace.openSession(id)`（`sessions.open()` 已删除）；worker 待应答交互与审批一键操作读 `uiSession.sessionStatus`。
3. **UI**：三个增量坐席——`conversation.session.header.actions`（徽章+面板，与家族其他插件同款）、`shell.overlay`（全局悬浮指示器）、`settings.section`（原生设置页），不替换任何原厂组合。坐席组件只用 0.2.0 的标准 props（`useSession`），sessions 运行时与导航动词在 `apply(ctx)` 里捕获后交给引擎。

## 配置

harness 0.2.0 起不再有 `~/.dsh/settings.yaml` 的设置命名空间。配置写在 **profile 的 `cordis.patch.yml`**，覆盖插件条目 `ui-dsh-commander` 的 `config`：

```yaml
# ~/.dsh/profiles/<profile>/cordis.patch.yml
# 覆盖插件自带补丁插入的条目（id: ui-dsh-commander）；补丁是「整体替换该条目的 config」，
# 只写想改的键即可，其余键回落到 Config 默认值 / 插件内置默认值。
- id: ui-dsh-commander
  config:
    enabled: true           # 总开关
    maxOutstanding: 5       # 并发进行中任务上限
    maxPerMessage: 8        # 单条回复最多解析的任务块数
    maxTaskChars: 4000      # 单个任务文本截断长度
    summaryMaxChars: 800    # 回执摘要截断长度
    pollIntervalMs: 2000    # 引擎轮询间隔（毫秒）
    autoReport: true        # 是否把结果回执/批次汇总注入指挥官会话
    stuckTimeoutMs: 600000  # 运行多久后标记「超时」（毫秒）
    autoLabelWorkers: true  # 自动新建的 worker 是否标注 [T#n] 标题
    maxCommanderHops: 10    # 跨指挥官派发预算（防循环）
    notify: true            # 后台桌面通知
    maxContinuations: 2     # 回合中断后自动续跑次数上限（0=关闭）
    maxFailovers: 1         # 失败后自动换人重试次数（0=关闭）
    maxNewWorkersPerBatch: 3  # 单条回复最多自动新建几个对话（0=禁止自动新建）
    strictProjectScope: true  # 拒绝跨项目派发
    maxTasksPerWorker: 2      # 单 worker 并发任务上限（0=不限制）
    reportTakeover: true      # 人工接管时向指挥官播报
    takeoverFollow: true      # 接管后继续只读观察并推送进展
    takeoverOnHuman: false    # 旧版语义：人工插话即终止任务
    dedupDispatch: true       # 拦截重复派发的任务
    mailHintOnDispatch: true  # 在简报/任务提示里附带 <dsh-mail> 协作协议
    worktreeBase: ''          # worktree 隔离的基准目录
    worktreeAutoCleanup: false # merge 后自动清理 worktree/分支
    panelApprovals: true      # 面板一键批准/拒绝
    confirmDispatch: false    # 派发前需人工在面板「放行」
```

不配置即用内置默认值。**面板/设置页保存**改为写入插件覆盖层 `<dsh-home>/dsh-commander/overrides.json`：

- 覆盖层优先级高于 profile（面板保存立刻生效、跨重启保留）；
- 但每个覆盖项都记录了写入时的 profile 基准值——一旦你在 `cordis.patch.yml` 里改了同一个键，profile 改动立即胜出（过期覆盖自动失效）；
- 想整体回到 profile 配置，删除该文件即可。

## 使用建议

- 给指挥官下达的总目标请说清「可以拆分派发给多个 worker」；模型自己决定拆几个任务、要不要开新窗口。
- 任务文本务必自包含——worker 看不到指挥官的任何上下文（简报里已反复提醒模型）。
- 面板出现「待确认」徽标时，说明 worker 在等权限确认，点「打开」去处理即可。
- 不想让它继续跑的任务随时「停止」；跑挂了的点「重试」。
- 多个会话可各自激活为指挥官互派任务，但请注意这会真的互相烧 token。

## 仓库布局

- `lib/index.js` — 插件 host 半区：`Config` 导出 + `apply(ctx, config)` + 注入/事件/全文/注册表/邮箱/git/圆桌八条路由。
- `lib/client.js` — 浏览器半区：协议解析、广播展开、策略闸门、花名册、引擎（激活/轮询/派发/监视/回执/批次汇总/取消重试）、头部徽章面板、全局指示器、原生设置页（手写 bundle，与家族其他插件同技术路线）。
- `test/smoke.cjs` — `node test/smoke.cjs`：语法检查 + host 全路由分支（校验矩阵/checkpoint 追加/尾投影锚点/真人消息计数（含插件 source kind）/配置默认值+白名单钳制+覆盖层+profile 优先/持久注册表/圆桌路由解析）+ client 纯函数与完整编排回路（激活→派发→结算回执→自动新建→广播+批次汇总→同 worker 串行化归因→跳数防护→fork 继承→tid/depends 依赖链→用量聚合→人工接管→审批一键应答→中断续跑→取消重试→强发→直派→报告→通知节流→持久化→retain/release 无泄漏）+ 0.2.0 导航与配置广播 + SSR 断言。无 harness 安装时（CI）自动降级为语法+结构标记检查。
- `test/soak.cjs` — `node test/soak.cjs`：随机种子多轮压测引擎不变量（锁/队列/游标/终态/任务表上限/会话引用无泄漏），可用 `SOAK_CYCLES`、`SOAK_SEED` 调整规模。
- `.github/workflows/smoke.yml` — push/PR 自动跑冒烟（windows-latest，无私有依赖也能过）。

## 已知限制

- **浏览器在线才有调度**：轮询和派发都发生在网页端；关掉标签页任务不会派发（已在跑的回合在 host 侧不受影响）。harness 重启同理。
- **worker 需要人工确认时不代答**：权限请求会让任务停在「待确认」，需要你手动处理——这是有意设计，插件绝不代替人做决定（面板 ✓批/✗拒 是人工点击的快捷方式）。
- **任务历史保留最近 100 条**：更早的记录会被裁剪掉（回合本身照常进行）。
- **摘要来自文本块**：worker 若只产出工具调用没有最终文字，回执摘要是「（该回合没有产生文本输出）」。
- **同名目标按精确匹配**：target 写会话标题时必须与侧边栏显示名完全一致，推荐用别名或 id。
- **配置读取时机**：页面加载时读一次；之后面板保存会即时生效，profile 手改会通过 `settings/document-updated` 广播刷新（广播 payload 是 profile 条目 id）。
- **人工接管的判定是启发式**：只要 baseline 后出现过真人消息就算接管；若那只是巧合插话而模型仍期望回执，可在指挥官里手动让它询问 worker 进度。
- **0.2.0 会话引用开销**：指向未在界面打开的会话投递时，插件必须 `retain` 一次（会触发该会话的初始历史打开），操作结束立即 `release`。这是 0.2.0 的契约要求（`binding()` 只对已 retain 的会话有效），代价是后台派发比 0.1.x 多一次会话打开。
- **审批一键操作依赖 `uiSession`**：若宿主没有提供 `uiSession.sessionStatus`（裁剪过的组合），插件降级为只显示旧式「待确认」标记，面板按钮不可用；`stuck` 标记仍可从列表行旧字段读取。
- **圆桌讨论需要模型路由**：0.2.0 的 `GenerateOptions` 必填 provider/model。插件按「请求体 → `agentDefaultModel` → 首个已注册 provider 路由」解析；三者都没有时该路由明确返回 `no-model-route`（503），不会猜模型。
- **多会话真实联调未在此环境验证**：本工作区只能跑 node 层的 mock 冒烟与 soak；真实的 `retain/ready` 时序、`uiSession` 审批对象、多窗口并发派发需要在装好 harness 的桌面环境里人工验证（下文「工作原理」描述的是 0.2.0 契约，不是本机实测结论）。

## License

MIT
