import { describe, it, expect } from "vitest";
import { chat, chatJson, LlmError } from "../src/llm.js";
import { z } from "zod";

// 真实测试(禁止 mock):需要 DEEPSEEK_API_KEY。无 key 时 skip 并提示。
const hasKey = !!process.env.DEEPSEEK_API_KEY;

describe("llm (真实 DeepSeek)", () => {
  it("缺少 key 时抛 LlmError(而非 mock)", async () => {
    const saved = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    try {
      await expect(
        chat([{ role: "user", content: "hi" }])
      ).rejects.toBeInstanceOf(LlmError);
    } finally {
      process.env.DEEPSEEK_API_KEY = saved;
    }
  });

  const itReal = hasKey ? it : it.skip;
  if (!hasKey) {
    console.warn(
      "[llm.test] 跳过真实调用:DEEPSEEK_API_KEY 未设置。请提供 key 后重跑(禁止 mock)。"
    );
  }

  itReal("chat 返回非空中文文本", async () => {
    const text = await chat([
      { role: "user", content: "用一句话说明什么是合同。只回中文,不要解释。" },
    ]);
    expect(typeof text).toBe("string");
    expect(text.trim().length).toBeGreaterThan(0);
  });

  itReal("chatJson 返回符合 schema 的结构化输出", async () => {
    const schema = z.object({
      概念: z.string().min(1),
      字数: z.number().int().nonnegative(),
    });
    const data = await chatJson(
      [
        {
          role: "user",
          content:
            '请用 JSON 回答:"概念"=合同的一句话中文定义,"字数"=该定义的汉字个数。必须返回合法 json。',
        },
      ],
      schema
    );
    expect(typeof data.概念).toBe("string");
    expect(data.概念.length).toBeGreaterThan(0);
    expect(Number.isFinite(data.字数)).toBe(true);
  });
});
