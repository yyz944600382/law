
# 目标
1.先把deerflow启动起来，使用uv管理，先搭建一个简单4agent框架，全部用deepseekkey，在环境变量有。法律条文agent你先找一个mcpskill凑合用着
2.我需要可以运行测试的demo。
3.需要详细的日志系统可以追溯。
4.你有什么不确定的一定要及时问我并记录

---

## 澄清记录(2026-06-25)

经与用户确认,关键技术决策:

| 决策项 | 选择 | 说明 |
|--------|------|------|
| DeerFlow 集成 | **在 deerflow 上开发**(law = deer-flow 定制版) | 直接用 deerflow 做开发框架 |
| 运行方式 | **Docker** | `make docker-init` / `make docker-start`,访问 :2026 |
| 法律检索(demo) | **联网搜索法条凑合** | 用 deer-flow 自带 web-search / web-fetch skill;**临时方案,有幻觉风险**,后续替换为可控法条库 |
| Demo 形态 | **Web UI(:2026)** | 用 deer-flow 自带前端 |

### Claude 自行确定、用户未否决的默认
- **模型**:4 个 agent 全用 `deepseek-chat`(DeepSeek-V3),base_url 用默认 `https://api.deepseek.com/v1`,key 取自 `DEEPSEEK_API_KEY`。
- **辩论深度**:demo 先做**各 1 轮**(法官拆解 → 律师 A/B 各陈词 → 法官裁决),多轮对抗后续迭代。
- **日志**:DeerFlow 内置 tracing(LangSmith / Langfuse,按需)+ 本地结构化日志(每轮发言 / 检索法条 / 裁决)。

### Agent → DeerFlow 映射
- 法官 = **lead agent**(主入口 / 编排 / 综合裁决)
- 律师 A、律师 B = **sub-agents**(隔离上下文,严格对立立场 prompt)
- 法律条文 = **skill**(web-search / web-fetch,临时)

---

## 澄清记录 #2(2026-06-25)· 技术栈切换 TS(纯自写)

⚠️ **上文「澄清记录 #1」的 deerflow / Docker / WebUI 决策已被本 #2 取代。**

### 评估链
1. **deerflow**:无 PyPI 包,必须 clone 整个应用才能用 SDK → 否决。
2. **python 框架(CrewAI/LangGraph/AutoGen)**:可行,但确定性法官控制层不如自写灵活。
3. **clowder-ai**(本地参考):产品级重平台(Redis/SQLite/Fastify/CLI 适配),深度耦合,不可直接复用;但验证了纯 TS 可干净实现「程序内调 LLM / agentic loop / 确定性裁决 / 消息路由」。

### 最终决策
- **语言/框架**:TypeScript 纯自写(不引 agent 框架),参考 clowder-ai 设计。
- **包管理**:npm(Node 自带)。**运行**:`npx tsx`(无 Docker)。
- **LLM**:全 agent 用 `deepseek-chat`(OpenAI 兼容,`$DEEPSEEK_API_KEY`)。
- **法官**:确定性 JudgeEngine(纯 TS 控流程/校验)+ LLM 结构化输出(吸收 WerewolfEngine 范式)。
- **律师**:LLM + 检索 tool,严格对立立场,轮流陈词(demo 各 1 轮)。
- **法律检索**:联网免 key 搜索凑合(临时,有幻觉风险)。
- **Demo 形态**:CLI + 结构化日志(Web UI 留作可选后续)。
- **测试**:vitest,禁止 mock。

详见 `docs/plans/0001-ts-rewrite-plan.md`。