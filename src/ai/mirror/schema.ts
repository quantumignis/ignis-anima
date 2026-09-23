import { z } from "zod";

// Validates raw JSON output from the AI model — every field must be a non-empty string
export const mirrorAIResponseSchema = z.object({
  chaos_summary: z.string().min(1, "chaos_summary must not be empty"),
  see_theme: z.string().min(1, "see_theme must not be empty"),
  see_hypothesis: z.string().min(1, "see_hypothesis must not be empty"),
  see_conflict: z.string().min(1, "see_conflict must not be empty"),
  see_pattern: z.string().min(1, "see_pattern must not be empty"),
  see_reflection_question: z.string().min(1, "see_reflection_question must not be empty"),
});

// Validates the full engine result before DB insert — includes metadata fields
export const mirrorEngineResultSchema = mirrorAIResponseSchema.extend({
  chaos_input: z.string().min(1, "chaos_input must not be empty"),
  prompt_version: z.string().min(1, "prompt_version must not be empty"),
  schema_version: z.number().int().positive("schema_version must be a positive integer"),
  model_provider: z.string().min(1, "model_provider must not be empty"),
  model_name: z.string().min(1, "model_name must not be empty"),
});
