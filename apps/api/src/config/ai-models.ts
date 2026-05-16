export const AI_MODELS = {
  SONNET: 'claude-sonnet-4-20250514',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

export const ACTION_MODEL_MAP: Record<string, keyof typeof AI_MODELS> = {
  kmzh_generate: 'SONNET',
  presentation_generate: 'SONNET',
  task_generate: 'HAIKU',
  analysis_class: 'HAIKU',
  assistant_chat: 'HAIKU',
  open_lesson_analysis: 'HAIKU',
  fl_task_generate: 'HAIKU',
  rating_analysis: 'HAIKU',
};

export const MAX_TOKENS_MAP: Record<string, number> = {
  kmzh_generate: 2000,
  presentation_generate: 1500,
  task_generate: 800,
  analysis_class: 600,
  assistant_chat: 400,
  open_lesson_analysis: 800,
  fl_task_generate: 800,
  rating_analysis: 500,
};

export function getModelForAction(action: string): string {
  const key = ACTION_MODEL_MAP[action] ?? 'HAIKU';
  return AI_MODELS[key];
}

export function getMaxTokensForAction(action: string): number {
  return MAX_TOKENS_MAP[action] ?? 500;
}
