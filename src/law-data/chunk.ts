// 刑法条文切分:读取 data/criminal-law/*.md,按「第X条」切成结构化 chunk。
// 数据来源:ImCa0/just-laws(经 scripts/fetch-criminal-law.sh 下载到 data/)。
//
// 切分规则(md 格式已确认):
//   # 第X编 ...   → part(编)
//   ## 第X章 ...  → chapter(章)
//   ### 第X节 ... → section(节)
//   **第X条**　内容 → 一个条文 chunk(内容可跨多行)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface LawChunk {
  source: string; // "中华人民共和国刑法"
  number: string; // "第一条"(中文)
  numberArabic: number; // 1
  part: string; // "第一编 总则"
  chapter: string; // "第一章 ..."
  section: string; // "第一节 ..."(可空)
  content: string; // 条文正文
}

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, "..", "..", "data", "criminal-law");
const FILES = [
  "general-provisions.md", // 总则
  "specific-provisions.md", // 分则
  "supplementary.md", // 附则
];

const CN_DIGIT: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

/** 中文数字(支持到千位,覆盖刑法 1~452 条)转阿拉伯数字。 */
export function chineseToArabic(s: string): number {
  let total = 0;
  let current = 0;
  for (const ch of s) {
    if (ch in CN_DIGIT) {
      current = CN_DIGIT[ch];
    } else if (ch === "十") {
      total += (current || 1) * 10;
      current = 0;
    } else if (ch === "百") {
      total += (current || 1) * 100;
      current = 0;
    } else if (ch === "千") {
      total += (current || 1) * 1000;
      current = 0;
    }
  }
  return total + current;
}

/** 加载本地刑法 md,切分为条文 chunk。 */
export function loadCriminalLaw(): LawChunk[] {
  const chunks: LawChunk[] = [];
  for (const f of FILES) {
    const text = readFileSync(join(DATA_DIR, f), "utf8");
    chunks.push(...parseMarkdown(text));
  }
  return chunks;
}

/** 解析刑法 md 文本为条文 chunk(导出供单测)。 */
export function parseMarkdown(text: string): LawChunk[] {
  const chunks: LawChunk[] = [];
  let part = "";
  let chapter = "";
  let section = "";
  let cur: LawChunk | null = null;

  const flush = () => {
    if (cur) {
      cur.content = cur.content.trim();
      chunks.push(cur);
    }
    cur = null;
  };

  const articleRe = /^\*\*第([一二三四五六七八九十百千零]+)条\*\*[　 ]?(.*)$/;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const partM = line.match(/^#\s+(第[一二三四五六七八九十百千零]+编.*)$/);
    const chapM = line.match(/^##\s+(第[一二三四五六七八九十百千零]+章.*)$/);
    const secM = line.match(/^###\s+(第[一二三四五六七八九十百千零]+节.*)$/);
    if (partM) {
      flush();
      part = partM[1].trim();
      chapter = "";
      section = "";
      continue;
    }
    if (chapM) {
      flush();
      chapter = chapM[1].trim();
      section = "";
      continue;
    }
    if (secM) {
      flush();
      section = secM[1].trim();
      continue;
    }
    const am = line.match(articleRe);
    if (am) {
      flush();
      cur = {
        source: "中华人民共和国刑法",
        number: `第${am[1]}条`,
        numberArabic: chineseToArabic(am[1]),
        part,
        chapter,
        section,
        content: am[2].trim(),
      };
      continue;
    }
    // 条文正文可能跨行,追加到当前条
    if (cur && line.trim()) {
      cur.content += "\n" + line.trim();
    }
  }
  flush();
  return chunks;
}
