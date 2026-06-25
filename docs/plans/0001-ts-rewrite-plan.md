# Law Agent · 实现计划(TS 纯自写)

> 归档版本(2026-06-25,已审批)。临时计划文件见 `.claude/plans/`。

## Context(为什么这样做)

spec-001 要求跑通一个「法官主控 + 两个对立律师辩论 + 法律条文检索」的多 agent 法律推理 demo,全用 DeepSeek,可运行测试 + 可追溯日志。

技术栈经多轮评估后定案:
- **deerflow**:无 PyPI 包、必须 clone 整个应用才能用 SDK → 否决。
- **clowder-ai**(用户本地参考):是产品级平台(Redis/SQLite/Fastify/Next.js/Electron + 外部 CLI 适配),深度耦合,**不能也不该直接复用**。但用纯 TS 验证了 4 件关键事可干净实现,作为设计蓝本。
- **最终:TypeScript 纯自写**,不引框架,按 clowder-ai 的轻量模块模式自建。包管理用 **npm**(Node 23 自带)。

最关键的设计决策(吸收 clowder `WerewolfEngine` 范式):**法官 = 确定性 JudgeEngine(纯 TS 控流程/举证/合法性)+ LLM 只产结构化裁决意图**。这直接强化 CLAUDE.md「法条幻觉是最高风险」的底线 —— LLM 不可信的部分由代码兜底。

> 对先前决策的调整:
> - 包管理:`uv` → **npm**(语言从 Python 切 TS)。
> - 运行方式:Docker → **直接 `npx tsx` 运行**(无需 Docker)。
> - Demo 形态:Web UI(:2026,deerflow 提供)→ **CLI + 结构化日志**(Web UI 留作可选后续)。

## 目标(spec-001 验收)
1. 4-agent 骨架(法官 / 原告律师 / 被告律师 / 法律检索)跑通,全 DeepSeek。
2. 可运行 demo(CLI):输入完整法律场景 → 输出结构化裁决。
3. 详细可追溯日志(每轮发言 / 检索法条 / 裁决)。
4. vitest 真实测试(禁 mock):真实 DeepSeek + 真实联网检索 + 端到端。

## 架构

```
用户输入(完整法律场景)
        │
  ┌─────▼─────────── ─ ─ ─  JudgeEngine(纯 TS 状态机,控流程/校验)
  │  1. 法官 LLM 拆解 → {争议焦点, 原告立场, 被告立场}
  │  2. 派发两位律师(各检索法条 + 陈词)
  │  3. 控辩论轮次(demo 各 1 轮)
  │  4. 收集双方论点
  │  5. 法官 LLM 产 {裁决结论, 事实认定, 引用法条}
  │  6. JudgeEngine 校验裁决完整性(必须有引用法条、必须结构化),不合规→重产/标注
  └─────┬─────────── ─ ─ ─
        │
   结构化裁决 + 日志文件 → 返回用户
```

- **法官**:deterministic JudgeEngine + LLM(结构化输出)。
- **律师 A/B**:LLM,严格对立立场,各自调检索 tool,轮流陈词(律师 B 能看到 A 的发言做反驳)。
- **法律检索**:demo 阶段联网凑合(免 key),标注临时 + 幻觉风险。

## 项目结构(law 仓库 = TS 项目本体)

```
law/
├── package.json            # npm, TS, tsx, vitest, zod
├── tsconfig.json
├── .env.example            # DEEPSEEK_API_KEY=...
├── .gitignore              # node_modules, .env, logs/
├── src/
│   ├── llm.ts              # DeepSeek(OpenAI 兼容)调用:chat + tool calling + JSON 结构化输出
│   ├── agents/
│   │   ├── types.ts        # Agent 角色接口(systemPrompt/model/tools)
│   │   └── roles.ts        # 4 角色定义(数据驱动,参考 cat-template.json 思路)
│   ├── retrieval.ts        # 法律联网检索(免 key DDG + 正文抓取)
│   ├── judge-engine.ts     # 确定性法官引擎(参考 WerewolfEngine):流程状态机/举证/合法性校验
│   ├── router.ts           # 辩论调度:轮次/发言顺序/上下文传递(参考 a2a-mentions 极简版)
│   ├── session.ts          # 对话历史(thread,内存)
│   ├── logging.ts          # 结构化日志(可追溯):每轮发言/检索法条/裁决 → logs/
│   └── index.ts            # orchestrator:串联 法官→律师辩论→裁决
├── cli.ts                  # demo 入口:输入场景 → 跑流程 → 输出裁决 + 日志路径
├── tests/
│   ├── llm.test.ts         # 真实 DeepSeek 调用(禁 mock)
│   ├── retrieval.test.ts   # 真实联网检索
│   ├── judge-engine.test.ts# 确定性逻辑单测(无需 LLM,快)
│   └── e2e.test.ts         # 端到端:真实场景 → 结构化裁决
├── examples/scenarios.md   # 标注好的真实法律场景用例
└── README.md               # 装/跑/测
```

## 核心模块设计(附 clowder-ai 参考文件)

| 模块 | 设计要点 | 参考 clowder-ai |
|------|----------|-----------------|
| `llm.ts` | `fetch` 打 `https://api.deepseek.com/v1/chat/completions`;封装 chat / tool-calling loop / `response_format:{json}` 结构化输出;模型 `deepseek-chat`;key 取 `process.env.DEEPSEEK_API_KEY` | `packages/api/src/domains/cats/services/game/LlmAIProvider.ts`、`.../providers/catagent/CatAgentService.ts` |
| `agents/roles.ts` | 单一配置源定义 judge / lawyer_plaintiff / lawyer_defendant 四角色:systemPrompt(立场)+ model + 可用 tools;两律师 prompt 严格对立 | `cat-template.json`(数据驱动人设) |
| `retrieval.ts` | 免 key DDG 搜索 + fetch 正文;返回 `[{法条/出处, url, 摘要}]`;**标注:demo 临时,有幻觉风险** | (不碰 clowder memory 子系统) |
| `judge-engine.ts` | 纯 TS 状态机:拆解→派发→辩论→裁决→**校验**(裁决须含引用法条、结构完整);LLM 只产结构化意图 | `.../game/werewolf/WerewolfEngine.ts`(LLM 出意图 + 代码裁决) |
| `router.ts` | 律师轮流(A 陈词→B 看到 A 反驳);轮次上限可配(demo=1) | `.../routing/a2a-mentions.ts` + `AgentRouter.ts`(极简版) |
| `logging.ts` | 结构化 JSONL:每条 = {turn, agent, content, retrieved_laws[], decision};写 `logs/<timestamp>.jsonl` + 控制台摘要 | (自写) |

## 复用与依赖
- 原生 `fetch`(Node 20+ 内置)、`zod`(结构化校验)、`tsx`(运行 TS)、`vitest`(测试)、`typescript`。
- 法律检索:选一个**免 key** DDG 的 npm 包(实现时验证);若不稳,停下来找用户(禁止 mock)。
- **不引入** agent 框架、不引入 clowder-ai 代码(只借鉴设计)。

## 测试(vitest,禁止 mock)
- `judge-engine.test.ts`:确定性流程/校验逻辑,纯单测(快、不需 key)。
- `llm.test.ts`:真实调 DeepSeek,断言响应。
- `retrieval.test.ts`:真实联网搜法条,断言有结果。
- `e2e.test.ts`:`examples/scenarios.md` 中真实场景端到端,断言法官输出**结构化裁决 + 至少 1 条引用法条**。
- 缺 key / 缺网络时**停下找用户**,绝不 mock。

## 实现顺序(每步独立分支 → 真实测试 → 合并 main → 及时推送)
1. `docs/pivot-to-ts`:先把所有文档切到 TS(本步)。
2. `feat/ts-skeleton`:package.json/tsconfig/.gitignore/.env.example + `llm.ts` + `llm.test.ts`(先真实调通 DeepSeek)。
3. `feat/retrieval`:`retrieval.ts` + 真实检索测试(定免 key 方案;不稳则找用户)。
4. `feat/agents-roles`:`agents/roles.ts`(4 角色定义)。
5. `feat/judge-engine`:`judge-engine.ts` + 纯单测。
6. `feat/orchestration`:`router.ts` + `session.ts` + `index.ts`(串联辩论)。
7. `feat/cli-demo`:`cli.ts` + `logging.ts`(可运行 demo + 可追溯日志)。
8. `feat/e2e-test`:`e2e.test.ts` + `examples/scenarios.md`。

(各 feat 完成后即时更新对应 doc,合并前文档与代码同步。)

## 验证(端到端)
```bash
npm install
cp .env.example .env        # 填 DEEPSEEK_API_KEY
npx tsx cli.ts              # 输入法律场景 → 输出裁决 + 日志路径
npm test                    # 全量真实测试(含 e2e)
npm test -- e2e             # 单跑端到端
```
成功标准:CLI 输入真实法律场景 → 法官产出结构化裁决(结论 + 事实 + 双方论点摘要 + ≥1 引用法条),`logs/` 有完整可追溯 JSONL,所有真实测试通过。

## 待确认 / 风险
- [ ] 免 key DDG npm 包选型与稳定性(实现时验证,不稳则找用户)。
- [ ] demo 形态:CLI 够不够,是否后续补 Web UI。
- [ ] 法律知识库正式数据来源(demo 联网凑合;正式版需可控法条库)。
