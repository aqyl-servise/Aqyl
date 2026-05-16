export const PROMPT_VERSIONS = {
  kmzh: 'v1.0',
  task_generate: 'v1.0',
  class_analysis: 'v1.0',
  open_lesson: 'v1.0',
  assistant: 'v1.0',
  fl_task: 'v1.0',
} as const;

export type PromptName = keyof typeof PROMPT_VERSIONS;
