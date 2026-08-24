# dsh-commander 插件开发全记录（AI 交接文档）

> **目的**：本文档完整记录 dsh-commander 插件从零到 v2.0.0 的开发全过程，包括所有设计决策、已修复的 bug、架构说明和已知限制。供后续 AI 或开发者接手时快速了解上下文。

---

## 一、项目概况

| 项目 | 说明 |
|---|---|
| **名称** | dsh-commander |
| **版本** | 2.0.0 |
| **仓库** | https://github.com/qwert702/dsh-commander |
| **平台** | DeepSeek Harness Web GUI 插件 |
| **核心功能** | 多会话编排：一个对话作为「指挥官」，通过协议标记将任务派发给其他对话（worker）并行执行，自动回收结果并回注指挥官形成闭环 |
| **技术路线** | 与 qwert702/dsh-plugin 家族一致：host 半区（Node.js ESM，cordis 插件）+ 浏览器半区（手写 bundle 通过 `window.__ModuleLoader__` 加载） |

### 目录结构
```
dsh-commander( 指挥官模式)/
├── package.json              # 清单（bundle.patch + client 声明）
├── dsh-commander.yml         # 增量坐席 patch（不替换原厂组合）
├── lib/index.js              # host 半区：设置命名空间 + 8 条路由
├── lib/client.js             # 浏览器半区：引擎单例 + 协议解析 + 调度监视 + UI（~3000 行）
├── test/smoke.cjs            # 冒烟测试（40+ 断言组）
├── test/soak.cjs             # 不变量压测（60 轮随机场景）
├── .github/workflows/smoke.yml # CI（windows-latest）
└── README.md / README.en.md
```

---

## 二、功能全景

### 2.1 核心调度

| 功能 | 实现方式 |
|---|---|
| **协议派发** | 模型输出 `<dsh-dispatch target="#N" title="..." fork="..." tid="..." depends="..." delay="...">任务</dsh-dispatch>`，引擎解析后执行 |
| **花名册** | 从 `sessions.list` 快照生成 `#1..#N` 别名映射，注入指挥官简报；带实时负载标注（空闲/进行中 N 个） |
| **广播派发** | `target="#1,#2"` 逗号展开 / `target="all"` 全花名册 |
| **自动新建 worker** | 省略 target 时 `sessions.create({cwd})` 继承指挥官工作目录；自动标注 `[T3] 任务摘要…` 侧边栏标题 |
| **上下文继承** | `fork="commander"` → 改走 `sessions.fork()`，worker 天然携带源会话全部背景 |
| **依赖编排** | `tid="a"` 命名 + `depends="a,b"` 门控；前序失败连锁取消 |
| **延迟派发** | `delay="30s|10m|1h"` → 新状态 `scheduled`「定时中」；fireAt 持久化，重启后照常计时 |
| **圆桌讨论** | `<dsh-roundtable topic count>` → host 端并行 LLM 调用（两轮辩论），纪要注入指挥官 |

### 2.2 韧性保障

| 功能 | 实现方式 |
|---|---|
| **同 worker 串行化** | 引擎按 worker 加发送锁（`workerLocks` Map），同一 worker 未结算时后续排队「等待空闲」；baseline 探针在持锁后执行——回执归因永不串台 |
| **负载均衡强制** | `maxTasksPerWorker`(默认2)：准入时统计每个目标活跃数，超限**透明改派**到最空闲同项目候选 |
| **中断自动续跑** | 回合异常结束（token截断/aborted/error）→ 自动发续跑指令（`maxContinuations` 默认2次）；最终回执聚合中断前后全部输出 |
| **失败自动换人** | 续跑仍失败的失败任务自动改派给最低负载空闲 worker 重跑（`maxFailovers` 默认1，预算沿链继承防乒乓） |
| **跨指挥官循环防护** | 目标是另一个激活中的指挥官时计入 `commanderHops` 预算（默认10），超限拒绝 |
| **人工接管检测** | worker baseline 后出现真人消息（非插件来源）→ 任务标「已接管」，不再自动回执 |
| **游标 fail-closed** | 恢复/激活时尾部锚点探测失败（重试3次）→ 跳过恢复或中止激活，**绝不回退到 cursor=0 导致历史重放** |
| **重启持久化** | 双写持久：localStorage（页面刷新恢复）+ host 注册表 `~/.dsh/dsh-commander/registry.json`（harness 重启/换端口恢复） |

### 2.3 结果回收

| 功能 | 实现方式 |
|---|---|
| **回执注入** | worker 完成后从 host events 路由提取输出摘要 + 耗时 + token 数，以 `[指挥官回执 · #N 「标题」]` queue 进指挥官会话 |
| **批次汇总** | 一波任务全结算后额外注入 `[指挥官批次汇总 · N 项]`，逐项带状态与结果预览 |
| **产物回收** | events 投影提取 write/edit 工具调用的文件路径清单，回执附变更文件列表，面板显示 📄N 徽标 |
| **全文查看** | 面板「全文」按钮 → host `/fullresult` 路由按 baseline 拉取完整输出（200KB 上限） |
| **审批一键操作** | worker 卡权限确认时面板出现 ✓批 / ✗拒 按钮，调用 `PendingWait.respond()` 直接应答（可关断 `panelApprovals`） |

### 2.4 协作与隔离

| 功能 | 实现方式 |
|---|---|
| **协作总线 `<dsh-mail>`** | worker 与 commander 均可发邮件到其他 worker（别名/ID/*）；host 端 `mailbox.json` 存储 + 推送唤醒收件者；支持 `leases` 文件租约声明 |
| **项目边界 `strictProjectScope`** | 派发目标 cwd ≠ 指挥官 cwd 时拒绝；failover 候选和负载均衡改派同样过滤；花名册只展示同项目会话 |
| **worktree 隔离 `isolate`** | 新建 worker 可选 git worktree+独立分支（host 端 execFile 封装），天然防写冲突；结算附 diff --stat |
| **合并与丢弃** | 隔离任务完成后可一键合并（merge --no-ff）或丢弃（worktree remove + branch -D）；冲突保留现场报错 |
| **开池模板** | 面板「开池」表单：角色 + 数量(1-5) + 热身指令模板（`{role} {i} {n}` 占位符），批量创建同角色 worker |

### 2.5 设置与 UI

| 功能 | 实现方式 |
|---|---|
| **双设置面** | 会话面板「设置」抽屉 + dsh 原生设置面板「指挥官」导航页（`settings.section` 坐席）；共用 `~/.dsh/settings.yaml` 命名空间，保存即时生效 |
| **任务统计** | 原生设置页顶部实时汇总各项目的任务数/成功率/平均耗时/变更文件数 + 总计行 |
| **全局悬浮指示器** | shell.overlay 坐席右下角挂件列出各激活指挥官及其进行中任务数，点击直达会话 |
| **后台桌面通知** | 批次完成/失败/worker 卡住时系统通知（标签页在后台才触发） |
| **报告导出** | 「复制报告」生成 Markdown 归档进剪贴板 |
| **手动直派** | 面板表单绕过模型协议直接发送任务给指定 worker |
| **派发前确认模式** | `confirmDispatch: true` 时每批先挂起等面板放行 |

---

## 三、Host 半区路由清单（8 条）

| 路由 | 方法 | 用途 |
|---|---|---|
| `/api/dsh-commander/config` | GET/POST | 读配置 / 白名单写回（POST 为原生设置页服务） |
| `/api/dsh-commander/inject` | POST | 静默注入简报为 user/message（不开回合） |
| `/api/dsh-commander/events` | GET | 只读投影：assistant 尾文本 + turn/end 原因 + 真人消息计数 + 变更文件 + 工具统计 + 尾部锚点 |
| `/api/dsh-commander/fullresult` | GET | 按 baseline 拉取任务完整输出（200KB 上限） |
| `/api/dsh-commander/registry` | GET/POST | 持久指挥官注册表（重启存活的关键） |
| `/api/dsh-commander/mail` | GET/POST | 协作邮箱（投递/收件/已读标记） |
| `/api/dsh-commander/git` | POST | worktree 生命周期 + diff/merge/discard（execFile 参数化、仓库级互斥锁） |
| `/api/dsh-commander/roundtable` | POST | 两轮辩论圆桌讨论（并行 ctx.llm.stream() 调用） |

---

## 四、设置项完整清单

```yaml
dsh-commander:
  enabled: true               # 总开关
  maxOutstanding: 5           # 并发进行中任务上限
  maxPerMessage: 8            # 单条回复最多解析的任务块数
  maxTaskChars: 4000          # 单个任务文本截断长度
  summaryMaxChars: 800        # 回执摘要截断长度
  pollIntervalMs: 2000        # 引擎轮询间隔 (ms)
  autoReport: true            # 是否把结果回执/批次汇总注入指挥官
  stuckTimeoutMs: 600000      # 运行多久后标「超时」(ms)
  autoLabelWorkers: true      # 自动新建的 worker 是否标注 [T#n] 标题
  maxCommanderHops: 10        # 跨指挥官派发预算（防循环）
  notify: true                # 后台桌面通知
  maxContinuations: 2         # 回合中断后自动续跑次数上限（0=关闭）
  maxFailovers: 1             # 失败后自动换人重试次数（0=关闭）
  maxNewWorkersPerBatch: 3    # 单条回复最多自动新建几个对话（0=禁止）
  strictProjectScope: true    # 跨项目派发拒绝 + 花名册过滤
  confirmDispatch: false      # 派发前需人工在面板「放行」
  panelApprovals: true        # 面板一键批准/拒绝按钮
  worktreeBase: ''            # worktree 存放根目录（空=默认 ~/.dsh 下）
  worktreeAutoCleanup: false  # 合并成功后是否自动清理 worktree
```

所有键均在 `WRITABLE_KEYS` 白名单中，可通过 POST /config 写回。

---

## 五、协议格式完整参考

```xml
<!-- 基础派发 -->
<dsh-dispatch target="#1" title="新会话标题">任务描述</dsh-dispatch>

<!-- 广播：多目标 -->
<dsh-dispatch target="#1,#2" >同一任务发给两个 worker</dsh-dispatch>
<dsh-dispatch target="all" >发给花名册全部会话</dsh-dispatch>

<!-- 上下文继承 -->
<dsh-dispatch fork="commander" title="分身">继承指挥官上下文的任务</dsh-dispatch>

<!-- 依赖编排 -->
<dsh-dispatch tid="step1" target="#1">第一步</dsh-dispatch>
<dsh-dispatch tid="step2" depends="step1" target="#2">第二步（等 step1 完成）</dsh-dispatch>

<!-- 延迟派发 -->
<dsh-dispatch delay="10m" target="#1">10分钟后执行</dsh-dispatch>

<!-- 工作区隔离 -->
<dsh-dispatch isolate="true" title="隔离任务">独立分支上执行</dsh-dispatch>

<!-- 圆桌讨论 -->
<dsh-roundtable topic="方案讨论" count="3">
  讨论背景与目标
</dsh-roundtable>

<!-- 协作消息（worker 和 commander 均可用） -->
<dsh-mail to="#2,#3" subject="接口定了" leases="src/api.ts,types/*">
  我开始写 API 层了...
</dsh-mail>
```

---

## 六、引擎状态机

```
任务状态流转：
sending ──→ scheduled（定时中，fireAt 到期后晋升）
sending ──→ running（发送成功，持锁）
sending ──→ waiting（worker 忙，入 FIFO 队列）
waiting ──→ sending（drain 晋升，重新走锁+探针+prompt）
running ──→ done | failed | taken-over | blocked（终态，释放锁）
blocked-dep ──→ sending（前置全部 done）| failed（前置 failed 或不存在）

worker 锁规则：
- 发送前必须持有锁（acquireWorkerLock）
- 锁条件：无其他任务持锁 AND host 行 running=false
- 终态结算释放锁
- 强发(forceDispatchWaiting)绕过 host busy 但仍遵守 FIFO
```

---

## 七、全部已修复 Bug 清单（按发现顺序）

| # | Bug 描述 | 严重性 | 根因 | 修复方式 |
|---|---|---|---|---|
| 1 | 命名空间缺席时 config 返回 null 导致 TypeError | 中 | handleConfig 直接 source() 无兜底 | 加 resolveConfig 包装返回 DEFAULTS |
| 2 | events 路由漏传 ctx 参数 | 高 | 函数签名遗漏 | 补传 ctx |
| 3 | 冷却闸门在游标推进后才检查——整批任务被静默丢弃 | 高 | 条件顺序错误 | 移到游标推进之前 |
| 4 | openTask 未携带 item.title 导致自动新建标题覆盖 | 低 | 字段遗漏 | openTask 记录 item.title |
| 5 | PowerShell 误操作导致 index.js 中文注释乱码 | 低 | 编码问题 | node -e 替换修复 |
| 6 | boot() 在 list pending 阶段过滤持久化 ID → 刷新后指挥官全丢 | 🔴 严重 | 过滤时机过早 | 等 list ready 再恢复 + 20s 兜底 |
| 7 | 结算宽限期未生效——刚发送的任务可能被误判完成产出空回执 | 🔴 严重 | 缺少 SETTLE_GRACE_MS 检查 | 加 2500ms 宽限窗 |
| 8 | refreshRoster 失败后新别名生效但模型上下文还是旧的 | 中 | 失败未回滚 | 失败即回滚旧 roster |
| 9 | 双击「确认」重复注入两份简报 | 低 | 缺重入锁 | busyRef + activate 幂等守卫 |
| 10 | registry 路由重复注册两次 | 中 | 编辑事故 | 去重 |
| 11 | **跳数预算永不消耗**——isHop 标记链在重构中丢失 | 🔴 严重 | resolveAndSend 不打标 + performSend 不累加 | 恢复标记链 + 成功后递增 |
| 12 | **排队晋升绕过结算宽限窗**——sentAt 未刷新导致空摘要错配回执 | 🔴 严重 | performSend 成功后不更新 sentAt | 发送落锁后 sentAt=Date.now() |
| 13 | **strictProjectScope 未接入派发路径**——跨项目目标不被拦截 | 🔴 严重 | resolveAndSend 无检查 | 加 cwd 归属比对 |
| 14 | **pickFailoverCandidate 不过滤异项目** | 🔴 严重 | 同上 | 候选过滤加 cwd 匹配 |
| 15 | **maxTasksPerWorker 改派不过滤异项目** | 🔴 严重 | 同上 | 同上 |
| 16 | **邮件投递失败阻断同批任务派发** | 高 | deliverMailFromBlocks 无独立 catch | 加独立 catch |
| 17 | **worker 互发邮件可无限循环烧 token** | 🔴 严重 | 无深度限制 | mailDelivered 标志每任务限一次 |
| 18 | **圆桌第二轮交叉评审包含自己观点** | 中 | string replace 移除自身不可靠 | 按人 filter 构建 |
| 19 | **恢复的 waiting 任务永不晋升**——waitQueue 不持久化且无重建逻辑 | 🔴 严重 | reconcileRestoredTasks 缺失 | 实现 reconcileRestoredTasks() |
| 20 | **恢复的 blocked-dep 任务永远卡住**——depIndex 不重建且无对账 | 🔴 严重 | 同上 | reconcileRestoredTasks 对账（done→解除 / failed→连锁取消 / 消失→failed） |
| 21 | **刷新后历史批次重复汇报**——reportedBatches 集合随 record 重建清空 | 中 | seedReportedBatches 缺失 | record 创建时播种已终态批次 ID |

---

## 八、关键设计决策与理由

### D1: 为什么用 host 事件日志轮询而非浏览器快照订阅？
浏览器快照只在会话被 staged（用户正在看）时才有数据。host 路由读原始事件日志，与浏览器停留在哪个对话无关——指挥官切走了照样收单。

### D2: 为什么简报用 user/message 注入而不触发回合？
参考 context-compressor 的 checkpoint 手法：追加一条 plugin 来源的 user 消息（surfaceOp:'append'），不开回合不烧 token，模型下次请求时自然看到。

### D3: 为什么用 per-worker 锁而不是全局并发限制？
全局限制只能控制总量，无法保证同一 worker 的多个任务串行执行。per-worker 锁确保 baseline 探针始终新鲜，归因不出错。

### D4: 为什么游标探测要 fail-closed？
如果探测失败就设 cursor=0，下一轮会把整个对话历史当新指令解析执行——灾难性重放。宁可不上岗也不冒险。

### D5: 为什么 roundtable 用并行 LLM 调用而非真实 worker 会话？
讨论员只需要推理不需要工具。并行 LLM 调用零会话创建、零清理负担、响应更快，且两轮辩论编排更简单（纯 Promise.all）。

### D6: 为什么 reportedBatches 要播种？
record 是每次激活/恢复新建的对象。如果不播种已存在的 batchId，第一轮 poll 就会对历史已完成批次重发汇总，污染指挥官上下文。

---

## 九、已知限制

| 限制 | 影响 | 缓解措施 |
|---|---|---|
| 浏览器在线才有调度 | 关标签页不派发（已在跑的不受影响） | 桌面通知提醒用户回来 |
| worker 权限确认不代答 | 任务停在「待确认」需要人工处理 | 设计意图：插件绝不代替人做决定 |
| 任务历史最多保留 100 条 | 更早记录被裁剪 | 回合本身照常进行 |
| 摘要来自文本块 | worker 若只产工具调用没有文字，摘要是占位符 | 可点「全文」查看完整输出 |
| 配置读取一次 | 页面加载时读一次，改 yaml 需刷新或用设置页 | 原生设置页保存即时生效 |
| 人工接管判定是启发式 | baseline 后出现真人消息即算接管 | 如果只是巧合插话可在指挥官里手动询问 |
| 所有测试基于 mock | 无真实 harness E2E | 首次实战暴露的问题优先级最高 |

---

## 十、竞品对标结论（2026 年调研）

| 流派 | 代表 | 核心差异 | dsh-commander 的优势 | dsh-commander 的短板 |
|---|---|---|---|---|
| 终端复用 | Claude Squad (8.3k⭐) | tmux+worktree，人是大脑 | 回执闭环+续跑/换人自动化 | ✗ 无 worktree 隔离 |
| GUI 编排器 | Conductor ($22M), Crystal | worktree-per-agent+统一 diff 审查 | 内嵌 harness 已有 UI | ✗ 无 diff 审查/合并闭环 |
| Swarm 框架 | Ruflo/Claude Flow (31k⭐) | queen-worker 共享记忆 SPARC | worker 是真实 harness 会话 | ✗ 无共享记忆 ✗ 星型拓扑 |
| MCP 协作总线 | mcp_agent_mail (1.9k⭐) | inbox/outbox 文件租约 Git 审计 | 同步推送+回执闭环 | ✗ 通信占对话 token |

---

## 十一、测试基础设施

### smoke.cjs（40+ 断言组，CI 自动运行）
覆盖：语法检查 → host 8 路由全分支 → client 纯函数全分支 → 完整编排回路（激活→派发→串行→依赖→广播→续跑→换人→接管→取消→重试→直派→报告→持久化→对账）→ SSR 断言。
无 harness 安装时自动降级为语法+结构标记检查（CI 模式）。

### soak.cjs（60 轮随机不变量压测，本地运行）
驱动随机场景连续 poll，逐轮断言五项不变量：锁零泄漏 / 终态不逃逸 / 游标单调 / FIFO 一致 / 历史上限。通过环境变量 SOAK_SEED / SOAK_CYCLES 控制。

### CI (.github/workflows/smoke.yml)
push/PR 触发 windows-latest + node 20 + npm test。无私有依赖也能过（降级模式）。

---

## 十二、后续建议

1. **真实实战检验**（最高优先级）：找一个实际项目跑一局多窗口协作，暴露 mock 测试覆盖不到的集成问题
2. **client.js TS 迁移**：2600+ 行手写 bundle 建议迁移到 tsdown 构建（token-viewer 已示范路线）
3. **截图/GIF**：README 缺少视觉演示
4. **i18n 英文界面**：locale 系统已在 inject 列表但未使用
5. **审批转发到指挥官**：当前只有面板按钮代答，可以进一步把审批问题描述转发进指挥官会话由其决定
