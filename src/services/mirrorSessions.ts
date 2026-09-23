import { supabase } from "../lib/supabase";

export type MirrorSessionPayload = {
  chaos_input: string; chaos_summary: string; see_theme: string;
  see_hypothesis: string; see_conflict: string; see_pattern: string;
  see_reflection_question: string; prompt_version: string;
  schema_version: number; model_provider: string; model_name: string;
};

const REQUIRED_STRING_FIELDS = [
  "chaos_input", "chaos_summary", "see_theme", "see_hypothesis",
  "see_conflict", "see_pattern", "see_reflection_question",
  "prompt_version", "model_provider", "model_name",
] as const;

/** Inserts a validated mirror session into Supabase. */
export async function createMirrorSession(payload: MirrorSessionPayload) {
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = payload[field];
    if (typeof value !== "string" || value.trim().length === 0)
      throw new Error(`MirrorSession validation failed: "${field}" is empty or missing`);
  }
  if (typeof payload.schema_version !== "number" || !Number.isInteger(payload.schema_version) || payload.schema_version < 1)
    throw new Error('MirrorSession validation failed: "schema_version" must be a positive integer');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("User is not authenticated");
  const { data, error } = await supabase.from("mirror_sessions").insert({
    user_id: user.id,
    chaos_input: payload.chaos_input.trim(), chaos_summary: payload.chaos_summary.trim(),
    see_theme: payload.see_theme.trim(), see_hypothesis: payload.see_hypothesis.trim(),
    see_conflict: payload.see_conflict.trim(), see_pattern: payload.see_pattern.trim(),
    see_reflection_question: payload.see_reflection_question.trim(),
    prompt_version: payload.prompt_version.trim(), schema_version: payload.schema_version,
    model_provider: payload.model_provider.trim(), model_name: payload.model_name.trim(),
  }).select().single();
  if (error) throw new Error(`Mirror session insert failed: ${error.message}`);
  return data;
}
