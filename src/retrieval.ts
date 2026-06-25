// 法律条文联网检索 —— demo 临时方案,免 key Bing(国内直连可达,无需代理)。
// ⚠️ 联网结果可能不准、有幻觉风险;正式版必须换可控、可溯源的法条库。
//
// 设计:检索由代码**确定性调用**(非 LLM tool-call),结果作为上下文喂给律师 LLM。
// 说明:曾用 DuckDuckGo,但该域名在当前网络需代理(Node fetch 默认不走代理),
// 故改用直连可达的 Bing。

export interface LawResult {
  title: string;
  url: string;
  snippet: string;
}

export class RetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetrievalError";
  }
}

const BING_ENDPOINT = "https://www.bing.com/search";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** 联网搜索与法律相关的网页结果(Bing,免 key)。 */
export async function searchLaws(
  query: string,
  maxResults = 5,
  signal?: AbortSignal
): Promise<LawResult[]> {
  const url = `${BING_ENDPOINT}?q=${encodeURIComponent(query)}&setlang=zh-CN&count=20`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    signal,
  });
  if (!resp.ok) {
    throw new RetrievalError(`Bing 搜索失败:HTTP ${resp.status}`);
  }
  const html = await resp.text();
  const results = parseBingHtml(html);
  if (results.length === 0) {
    throw new RetrievalError(
      `Bing 未返回结果(可能被反爬或页面结构变化),查询:${query}`
    );
  }
  return results.slice(0, maxResults);
}

/** 抓取指定 URL 的正文(去标签,截断)。best-effort,失败抛 RetrievalError。 */
export async function fetchPageText(
  url: string,
  maxChars = 4000,
  signal?: AbortSignal
): Promise<string> {
  const resp = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "zh-CN,zh;q=0.9" },
    signal,
  });
  if (!resp.ok) {
    throw new RetrievalError(`抓取失败 HTTP ${resp.status}:${url}`);
  }
  const html = await resp.text();
  return stripHtml(html).slice(0, maxChars);
}

// ---- Bing 结果页解析 ----

function parseBingHtml(html: string): LawResult[] {
  const results: LawResult[] = [];
  // 每个自然结果块:<li class="b_algo"> ... </li>
  const blockRe = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1];
    // 标题链接在 <h2><a ...>title</a></h2>;块内首个 a 可能是 cite,故优先取 h2 内
    const h2 = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? block;
    const aMatch = h2.match(
      /<a[^>]*href="(https?:[^"]*)"[^>]*>([\s\S]*?)<\/a>/
    );
    if (!aMatch) continue;
    const url = aMatch[1];
    const title = stripHtml(aMatch[2]).trim();
    const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const snippet = pMatch ? stripHtml(pMatch[1]).trim() : "";
    if (title && url) results.push({ title, url, snippet });
  }
  return results;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const __test = { parseBingHtml, stripHtml };
