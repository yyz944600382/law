import { describe, it, expect } from "vitest";
import { searchLaws, fetchPageText, __test } from "../src/retrieval.js";

describe("retrieval 解析逻辑(离线单测)", () => {
  it("parseBingHtml 提取标题/真实URL/snippet", () => {
    const html = `
      <li class="b_algo">
        <h2><a href="https://law.example/a" h="ID=1">民法典 <strong>违约责任</strong>条文</a></h2>
        <div class="b_caption"><p class="b_lineclamp4">当事人一方不履行合同义务...&nbsp;更多</p></div>
      </li>`;
    const r = __test.parseBingHtml(html);
    expect(r.length).toBe(1);
    expect(r[0].title).toContain("民法典");
    expect(r[0].title).toContain("违约责任");
    expect(r[0].url).toBe("https://law.example/a");
    expect(r[0].snippet).toContain("不履行合同义务");
  });
});

describe("retrieval (真实联网)", () => {
  it(
    "searchLaws 搜法条返回非空结果(Bing 免 key)",
    async () => {
      const results = await searchLaws("民法典 违约责任 法条");
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.title.length).toBeGreaterThan(0);
        expect(r.url).toMatch(/^https?:\/\//);
      }
      console.log(
        "[retrieval.test] 搜索结果示例:",
        results.slice(0, 2).map((r) => ({ title: r.title, url: r.url }))
      );
    },
    45000
  );

  it(
    "fetchPageText 抓取开放页面正文",
    async () => {
      const text = await fetchPageText("https://www.gov.cn/");
      expect(text.length).toBeGreaterThan(0);
    },
    45000
  );
});
