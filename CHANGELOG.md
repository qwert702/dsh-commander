# Changelog

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
