import { describe, it, expect } from "vitest";
import {
  loadCriminalLaw,
  parseMarkdown,
  chineseToArabic,
} from "../src/law-data/chunk.js";

describe("chineseToArabic", () => {
  it.each([
    ["一", 1],
    ["十", 10],
    ["二十三", 23],
    ["一百零一", 101],
    ["一百", 100],
    ["四百五十二", 452],
  ])("%s → %i", (cn, ar) => expect(chineseToArabic(cn)).toBe(ar));
});

describe("parseMarkdown", () => {
  it("按编/章/条解析,跨行条文合并", () => {
    const md = [
      "# 第一编 总则",
      "## 第一章 任务",
      "",
      "**第一条**　为了惩罚犯罪,保护人民。",
      "",
      "**第二条**　任务是用刑罚同犯罪作斗争。",
      "保卫国家安全。",
      "",
      "### 第一节 范围",
      "**第三条**　法律明文规定。",
    ].join("\n");
    const chunks = parseMarkdown(md);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].numberArabic).toBe(1);
    expect(chunks[0].part).toContain("总则");
    expect(chunks[0].chapter).toContain("任务");
    expect(chunks[0].content).toContain("惩罚犯罪");
    // 第二条跨两行,应合并
    expect(chunks[1].numberArabic).toBe(2);
    expect(chunks[1].content).toContain("保卫国家安全");
    // 第三条进入第一节
    expect(chunks[2].numberArabic).toBe(3);
    expect(chunks[2].section).toContain("范围");
  });
});

describe("loadCriminalLaw(真实本地数据)", () => {
  it("加载刑法全部条文(>400 条,第一条/末条抽查)", () => {
    const chunks = loadCriminalLaw();
    expect(chunks.length).toBeGreaterThan(400);
    const byNum = new Map(chunks.map((c) => [c.numberArabic, c]));
    const first = byNum.get(1);
    expect(first).toBeTruthy();
    expect(first!.content).toContain("惩罚犯罪");
    const max = Math.max(...chunks.map((c) => c.numberArabic));
    expect(max).toBeGreaterThan(400);
    console.log(
      `[law-data.test] 刑法条文数=${chunks.length},最大条号=${max}`
    );
  });
});
