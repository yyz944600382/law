import { describe, it, expect } from "vitest";
import { getIndex, searchLawsByKeyword } from "../src/law-data/inverted-index.js";

describe("inverted-index 倒排库(真实本地数据)", () => {
  it("索引覆盖刑法 452 条", () => {
    const ms = getIndex();
    expect(ms.documentCount).toBe(452);
  });

  it("搜「盗窃」命中盗窃罪条款(第264条)", () => {
    const r = searchLawsByKeyword("盗窃公私财物", 5);
    expect(r.length).toBeGreaterThan(0);
    const nums = r.map((x) => x.chunk.numberArabic);
    // 盗窃罪是刑法第二百六十四条
    expect(nums).toContain(264);
    console.log(
      "[inverted-index.test] 盗窃 检索:",
      r.slice(0, 3).map((x) => `${x.chunk.number}(score=${x.score.toFixed(2)}): ${x.chunk.content.slice(0, 30)}`)
    );
  });

  it("搜「故意杀人」命中故意杀人罪(第232条)", () => {
    const r = searchLawsByKeyword("故意杀人", 5);
    expect(r.length).toBeGreaterThan(0);
    const nums = r.map((x) => x.chunk.numberArabic);
    expect(nums).toContain(232);
  });

  it("结果按 score 降序", () => {
    const r = searchLawsByKeyword("诈骗", 5);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].score).toBeLessThanOrEqual(r[i - 1].score);
    }
  });
});
