# 0004 · spec-002 阶段1:刑法数据获取 + chunk 完成

- **日期**:2026-06-25
- **类型**:进展(spec-002)

## 完成
- **数据源**:github `ImCa0/just-laws` 刑法 md(总则 / 分则 / 附则),用 `curl`(走代理)下载到 `data/criminal-law/`(共 ~218KB)。
- **chunk**:`src/law-data/chunk.ts` 按「**第X条**」切,**452 条全部正确**(条文数=452、最大条号=452),含编/章/节 metadata;中文条号→阿拉伯(`chineseToArabic`)。
- **测试**:`tests/law-data.test.ts` 8 项通过(chineseToArabic / parseMarkdown / loadCriminalLaw)。

## 经验(踩坑)
- `just-laws` 默认分支是 **master**(不是 main)—— raw URL 用 main 会 404。
- `raw.githubusercontent.com` 国内需代理 → 数据获取用 **curl(走代理)下载到本地**,Node 只读本地文件(不 fetch 外网,避免「Node fetch 不走代理」的坑,见 lesson 0003)。

## 后续(见 plan 0002)
倒排库(minisearch)→ 向量库(embedding 待用户定)→ 检索接口(替换联网 retrieval)。
