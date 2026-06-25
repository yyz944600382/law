// 刑法倒排库(minisearch,BM25 关键词检索)。
// 中文无空格,minisearch 默认分词对中文失效,故用「单字 + bigram」自定义分词,
// 使「盗窃」能命中「盗窃罪」「盗窃金融机构」等。

import MiniSearch from "minisearch";
import { loadCriminalLaw, type LawChunk } from "./chunk.js";

export interface LawSearchResult {
  chunk: LawChunk;
  score: number;
}

let _index: MiniSearch | null = null;

/** 中文分词:单字 + 相邻二字(bigram),去标点。 */
function tokenizeCn(s: string): string[] {
  const chars = [...s.replace(/[^\p{L}\p{N}]/gu, "")];
  const tokens: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    tokens.push(chars[i]);
    if (i < chars.length - 1) tokens.push(chars[i] + chars[i + 1]);
  }
  return tokens;
}

/** 获取(惰性、单例)刑法倒排索引。 */
export function getIndex(): MiniSearch {
  if (_index) return _index;
  const ms = new MiniSearch({
    idField: "numberArabic",
    fields: ["content", "chapter", "section"],
    storeFields: [
      "source",
      "number",
      "numberArabic",
      "part",
      "chapter",
      "section",
      "content",
    ],
    tokenize: tokenizeCn,
    processTerm: (term) => term,
  });
  ms.addAll(loadCriminalLaw());
  _index = ms;
  return ms;
}

/** 关键词检索:返回按 BM25 相关度排序的条文。 */
export function searchLawsByKeyword(query: string, max = 5): LawSearchResult[] {
  const ms = getIndex();
  return ms
    .search(query, { prefix: true, fuzzy: 0.1, combineWith: "AND" })
    .slice(0, max)
    .map((r) => {
      const chunk: LawChunk = {
        source: r.source,
        number: r.number,
        numberArabic: r.numberArabic,
        part: r.part,
        chapter: r.chapter,
        section: r.section,
        content: r.content,
      };
      return { chunk, score: r.score };
    });
}

// 测试辅助:重置单例
export function __resetIndex() {
  _index = null;
}
