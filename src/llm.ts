// DeepSeek(OpenAI 兼容)调用层。
// 提供:chat(普通对话)、chatJson(结构化 JSON 输出 + zod 校验)。
// 设计参考:clowder-ai `LlmAIProvider`(程序内 fetch 直连 OpenAI 兼容端点)。
//
// 说明:demo 不使用 LLM tool-calling loop——法律检索由代码确定性地先执行,
// 结果作为上下文喂给律师 LLM(更可控,贴合「确定性 engine + LLM 结构化输出」理念)。

import { z } from "zod";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new LlmError(
      "DEEPSEEK_API_KEY 未设置:请在 .env 或环境变量中提供(缺少请向用户索取,禁止 mock)。"
    );
  }
  return key;
}

/** 普通对话,返回 assistant 文本。 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const resp = await requestChatCompletion(
    {
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    },
    options.signal
  );
  return extractText(resp);
}

/**
 * 结构化 JSON 输出:用 response_format=json_object + zod 校验。
 * 注意:DeepSeek 的 json_object 模式要求 prompt 中出现 "json" 字样。
 */
export async function chatJson<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  options: ChatOptions = {}
): Promise<T> {
  const resp = await requestChatCompletion(
    {
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      response_format: { type: "json_object" },
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    },
    options.signal
  );
  const text = extractText(resp);
  const parsed = safeParseJson(text);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new LlmError(
      `LLM 输出不符合 schema:\n${JSON.stringify(result.error.issues, null, 2)}\n原始输出:\n${text}`
    );
  }
  return result.data;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

async function requestChatCompletion(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<ChatCompletionResponse> {
  const key = getApiKey();
  const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new LlmError(`DeepSeek API ${resp.status}: ${detail.slice(0, 500)}`);
  }
  return (await resp.json()) as ChatCompletionResponse;
}

function extractText(resp: ChatCompletionResponse): string {
  return resp.choices?.[0]?.message?.content ?? "";
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // 兜底:提取首个 {...} 块(模型偶尔包 ```json 或多余文本)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // 继续抛错
      }
    }
    throw new LlmError(`LLM 输出非合法 JSON:\n${text.slice(0, 500)}`);
  }
}
