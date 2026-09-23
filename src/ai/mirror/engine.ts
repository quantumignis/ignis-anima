import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { mirrorAIResponseSchema } from "./schema";
import { buildSystemPrompt, buildUserPrompt, PROMPT_VERSION, SCHEMA_VERSION } from "./prompt";
import type { MirrorAIResponse, MirrorEngineOptions, MirrorEngineResult } from "./types";

const DEFAULT_MODEL_PROVIDER = "openai";
const DEFAULT_MODEL_NAME = "gpt-4o";
const DEFAULT_MAX_RETRIES = 2;

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return raw.trim();
}

async function callAI(systemPrompt: string, userPrompt: string, provider: "openai" | "anthropic" | "google", modelName: string): Promise<string> {
  switch (provider) {
    case "openai": {
      const client = new OpenAI({ apiKey: process.env.OPENABI_API_KEY });
      const response = await client.chat.completions.create({ model: modelName, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.7, response_format: { type: "json_object" } });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("OpenAI returned an empty response");
      return content;
    }
    case "anthropic": {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({ model: modelName, max_tokens: 1024, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] });
      const block = response.content[0];
      if (block.type !== "text" || !block.text) throw new Error("Anthropic returned a non-text response");
      return block.text;
    }
    case "google": {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }], generationConfig: { temperature: 0.7 } }) });
      if (!res.ok) throw new Error(`Google AI API error: ${res.status}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Google AI returned an empty response");
      return text;
    }
    default: throw new Error(`Unsupported model provider: ${provider}`);
  }
}

export async function runMirrorEngine(chaosInput: string, options?: MirrorEngineOptions): Promise<MirrorEngineResult> {
  if (!chaosInput || chaosInput.trim().length === 0) throw new Error("chaosInput must be a non-empty string");
  const provider = options?.modelProvider ?? "openai";
  const modelName = options?.modelName ?? "gpt-4o";
  const maxRetries = options?.maxRetries ?? 2;
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(chaosInput);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const rawResponse = await callAI(systemPrompt, userPrompt, provider, modelName);
      const jsonString = extractJSON(rawResponse);
      let parsed: unknown;
      try { parsed = JSON.parse(jsonString); }
      catch (parseErr) { throw new Error(`AI response is not valid JSON (attempt ${attempt + 1}): ${(parseErr as Error).message}`); }
      const validated: MirrorAIResponse = mirrorAIResponseSchema.parse(parsed);
      return { ...validated, chaos_input: chaosInput.trim(), prompt_version: PROMPT_VERSION, schema_version: SCHEMA_VERSION, model_provider: provider, model_name: modelName };
    } catch (err) {
      lastError = err as Error;
      if ((err as Error).message.includes("not valid JSON") || (err as Error).name === "ZodError") continue;
      throw err;
    }
  }
  throw new Error(`Mirror Engine failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
}
