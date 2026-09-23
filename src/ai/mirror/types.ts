export type ChaosInput = {
  text: string;
};

export type MirrorAIResponse = {
  chaos_summary: string;
  see_theme: string;
  see_hypothesis: string;
  see_conflict: string;
  see_pattern: string;
  see_reflection_question: string;
};

export type MirrorEngineResult = MirrorAIResponse & {
  chaos_input: string;
  prompt_version: string;
  schema_version: number;
  model_provider: string;
  model_name: string;
};

export type MirrorEngineOptions = {
  modelProvider?: "openai" | "anthropic" | "google";
  modelName?: string;
  maxRetries?: number;
};
