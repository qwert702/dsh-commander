# dsh-commander

DeepSeek Harness Web GUI 的**指挥官**插件：把任意一个对话升级成「指挥官」，它的模型可以在回复里派发任务给其他对话（worker）并行执行；插件自动送达任务、监视 worker、把结果摘要以「回执」注入指挥官会话，形成无人值守的多窗口协作闭环。

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

  - `target` 填花名册别名（`#1`）或完整会话 id；**省略则自动新建 worker 会话**（继承指挥官工作目录，有 `title` 则同步改侧边栏标题）。
  - 一次回复可含多个块，逐个送达。
- **结果自动回流**：worker 完成回合后，插件从 host 事件日志提取其新增输出，截为摘要，以 `[指挥官回执 · #N 「标题」] 状态：…` 的消息 queue 进指挥官会话——指挥官被唤醒继续汇总或继续派发，无需人工复制粘贴。
- **任务面板**：头部徽章显示进行中任务数，点击下拉面板：任务列表（状态点 / 目标 / 摘要 / 时间 / 打开会话）、花名册（各会话运行状态点）、刷新花名册（重注入最新名单）。
- **后台运行**：引擎挂在模块层而不是组件层——轮询走 host 事件日志路由，**不依赖当前浏览器停留在哪个对话**；页面刷新后激活状态自动恢复（游标重置到最新尾部，历史输出绝不重复执行）。

## 安全护栏

- 仅当指挥官空闲时才解析新输出；同一批输出只处理一次（游标推进，at-most-once）。
- 上限：并发任务 5 / 单条消息块数 8 / 单任务字数 4000 / 单次激活累计派发 50（防失控循环），批次间隔 ≥1s。
- 拒绝自指（target=指挥官自己）；prompt 被拒标记为「已阻塞」并在面板可见，不做重试风暴。
- 简报注入在 host 端 fail-closed：会话不存在 / 回合进行中 / 超长文本一律拒绝。

## 工作原理

1. **host 半区**（`lib/index.js`）：设置命名空间 `dsh-commander` + 三条路由：
   - `GET /api/dsh-commander/config` — 解析后的配置；
   - `POST /api/dsh-commander/inject {sessionId,text}` — 把简报作为一条 plugin 来源的 user 消息静默追加进会话（context-compressor 同款 checkpoint 手法，不开回合）；
   - `GET /api/dsh-commander/events?sessionId&cursor&limit` — 只读投影：cursor 之后已定型的 assistant 文本 + 最后一个 `turn/end` 原因 + 全日志尾部锚点。
2. **浏览器半区**（`lib/client.js`）：模块级引擎单例以 ~2s 轮询每个激活指挥官的 events 尾部 → 正则解析 `<dsh-dispatch>` 块 → 纯函数策略闸门（并发/条数/累计上限）→ 经客户端 sessions 运行时 `binding(target).prompt(task,'queue')` 送达（或 `create({cwd})` 新建）→ 订阅 `sessions.list` 快照监视 worker 的 running 标志（侧边栏同源信号）→ 结算后把回执 prompt 回指挥官。
3. **UI**：挂载在与 context-compressor / continue-on-limit 相同的 `conversation.session.header.actions` 坐席，纯增量，不替换任何原厂组合。

## 设置（可选）

在 `~/.dsh/settings.yaml` 添加命名空间 `dsh-commander`：

```yaml
dsh-commander:
  enabled: true          # 总开关
  maxOutstanding: 5      # 并发进行中任务上限
  maxPerMessage: 8       # 单条回复最多解析的任务块数
  maxTaskChars: 4000     # 单个任务文本截断长度
  summaryMaxChars: 800   # 回执摘要截断长度
  pollIntervalMs: 2000   # 引擎轮询间隔（毫秒）
  autoReport: true       # 是否把结果回执注入指挥官会话
```

不配置即用以上默认值；改完刷新页面生效。

## 使用建议

- 给指挥官下达的总目标请说清「可以拆分派发给多个 worker」；模型自己决定拆几个任务、要不要开新窗口。
- 任务文本务必自包含——worker 看不到指挥官的任何上下文（简报里已反复提醒模型）。
- worker 弹出权限确认等交互时会一直「运行中」，需要你手动去对应会话处理；面板里点「打开」直达。
- 多个会话可各自激活为指挥官互派任务，但请注意这会真的互相烧 token。

## 仓库布局

- `lib/index.js` — 插件 host 半区：设置命名空间 + 注入/事件两条路由。
- `lib/client.js` — 浏览器半区：协议解析、策略闸门、花名册、引擎（激活/轮询/派发/监视/回执）、头部徽章与下拉面板（手写 bundle，与家族其他插件同技术路线）。
- `test/smoke.cjs` — `node test/smoke.cjs`：语法检查 + host 三路由全分支（校验矩阵/checkpoint 追加/尾投影锚点）+ client 纯函数全分支 + 完整编排回路（激活→注入→解析派发→结算回执→自动新建）+ SSR 渲染断言。

## 已知限制

- **浏览器在线才有调度**：轮询和派发都发生在网页端；关掉标签页任务不会派发（已在跑的回合在 host 侧不受影响）。harness 重启同理。
- **worker 需要人工确认时不代答**：权限请求等 pending interaction 会让任务停在「运行中」。
- **任务表不持久化**：刷新后任务历史清空（回合本身照常进行，激活状态会恢复）。
- **摘要来自文本块**：worker 若只产出工具调用没有最终文字，回执摘要是「（该回合没有产生文本输出）」。
- **同名目标按精确匹配**：target 写会话标题时必须与侧边栏显示名完全一致，推荐用别名或 id。
- **配置读取一次**：浏览器半区页面加载时读一次配置，改设置需刷新。

## License

MIT
