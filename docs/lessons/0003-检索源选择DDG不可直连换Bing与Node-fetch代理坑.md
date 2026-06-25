# 0003 · 联网检索源选择:DDG 国内不可直连,换 Bing;Node fetch 不走系统代理

## 问题现象
retrieval.ts 初版用 DuckDuckGo(`html.duckduckgo.com`),Node `fetch` 报 `ConnectTimeoutError`。但同一环境 `curl` 同一 URL 返回 200。

## 根因
- 当前网络配了 **HTTP 代理**:`curl` 自动读 `http_proxy`/`https_proxy` 走代理;**Node 的 `fetch`(undici)默认不读代理环境变量**,直连被墙的 DDG → 超时。
- DeepSeek API、gov.cn 等可达端点 Node 直连正常(llm 测试不受影响)。

## 解决方案
- **换直连可达的搜索源**:Bing(`https://www.bing.com/search`)国内可直连、免 key,结果 URL 是真实链接(解析比 DDG 的重定向链接更简单)。
- 解析:`b_algo` 结果块;标题取 `<h2><a>` 内 —— 块内首个 `<a>` 可能是 cite,直接取会把 URL 混进 title。
- 若将来必须用被墙源(DDG/Google):给 Node fetch 装 `undici` ProxyAgent 读 `HTTPS_PROXY`,或 Node 24+ 设 `NODE_USE_ENV_PROXY=1`。

## 触发条件 / 如何复现
Node `fetch` 外网域名超时但 `curl` 通 → 基本就是代理问题。

## 相关链接
- [src/retrieval.ts](../../src/retrieval.ts)、[tests/retrieval.test.ts](../../tests/retrieval.test.ts)
- Bing 解析:`parseBingHtml`
