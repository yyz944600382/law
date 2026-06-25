# 0002 · 重型 agent 平台不可直接复用;deterministic engine 控幻觉

## 问题现象
为 law agent 选型时,deerflow(无 PyPI 包,要 clone 整个应用)和 clowder-ai(产品级平台:Redis/SQLite/Fastify/Next.js/Electron + 外部 CLI 适配)都**过重、深度耦合**,无法作为轻量库复用于一个「程序内编排 4 个 LLM 角色」的 demo。

## 根因
这类项目是**产品**(带持久化 / Web / Desktop / IM),核心编排逻辑与基础设施(Redis、前端、credentials、CLI spawn)缠在一起,没有可独立 `npm/pip install` 的编排核心。

## 解决方案
- 轻量多 agent 需求 → **纯自写**(TS/Python)或选**轻框架**,不要套重型平台。
- 参考 clowder-ai 的**设计**而非代码:`LlmAIProvider`(直连 API)、`WerewolfEngine`(**LLM 出结构化意图 + 纯代码裁决**)、`a2a-mentions`(路由)。
- **控幻觉关键模式**:把不可信的 LLM 输出约束为「结构化意图」,由 deterministic engine 做流程 / 合法性 / 完整性校验(如法官裁决必须含引用法条,否则重产 / 标注)。

## 相关链接
- devlog/0003(技术栈定案)、[docs/plans/0001-ts-rewrite-plan.md](../plans/0001-ts-rewrite-plan.md)
- clowder-ai:`packages/api/src/domains/cats/services/game/werewolf/WerewolfEngine.ts`
