# spec-002 实现计划:法律知识库(数据 / chunk / 向量 / 倒排 / 检索)

## Context
spec-002 要求:获取法律数据(先《刑法》)→ 切 chunk → 建**向量库 + 倒排库**,作为法律检索 agent 的**可控本地知识库**(替代 spec-001 的联网凑合,消除「法条幻觉」根源)。

用户决策:① spec-002 法律库**优先**于 spec-001 demo 剩余步骤;② **先做数据 + chunk**,embedding 选型暂缓。

## 数据源
- 《中华人民共和国刑法》:github `ImCa0/just-laws`(md),经 `scripts/fetch-criminal-law.sh` 下载到 `data/criminal-law/`。
- 已验证:**452 条全部正确切出**(刑法实际就是 452 条)。

## 分阶段
1. ✅ **数据获取 + chunk**(`src/law-data/chunk.ts`):按「第X条」切,452 条,含编/章/节 metadata + 中文条号→阿拉伯。
2. ⏳ **倒排库**(minisearch,BM25 关键词检索):不依赖 embedding,**先做**。
3. ⏳ **向量库**(embedding 选型待用户定):
   - 候选:硅基流动(bge-large-zh,免费额度)/ 本地 transformers.js(离线重)/ 其他在线。
   - 存储:内存(向量 + 余弦)纯自写(452 条内存足够),或 hnswlib-node。
4. ⏳ **检索接口**:统一 `lawSearch`(倒排 + 向量融合),替换/增强联网 `retrieval.ts`。

## 选型
- 倒排:**minisearch**(npm,纯 JS BM25),轻量。
- 向量存储:**内存余弦**(纯自写,demo 够)。
- chunk:按条文(已定),每条带 `part/chapter/section` metadata。

## 验证(禁止 mock)
- 真实检索测试:输入法律关键词/罪名,返回相关条文(如搜「盗窃」→ 第二百六十四条盗窃罪)。
- 数据完整性:452 条、条号连续。

## 待确认
- [ ] embedding 服务(硅基流动需注册免费 key / 本地 transformers.js / 其他)—— 阶段3 前必须定。
