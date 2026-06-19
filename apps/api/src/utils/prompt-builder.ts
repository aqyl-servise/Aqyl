import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');
const promptCache = new Map<string, string>();
const logger = new Logger('PromptBuilder');

export function loadPrompt(name: string): string {
  if (promptCache.has(name)) {
    return promptCache.get(name)!;
  }
  const filePath = path.join(PROMPTS_DIR, name + '.txt');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    promptCache.set(name, content);
    return content;
  } catch {
    logger.warn('Prompt file not found: ' + filePath + ', using fallback');
    return 'You are an educational AI assistant. Answer in {{language}}.';
  }
}

export function buildPrompt(
  templateName: string,
  variables: Record<string, string>
): string {
  const template = loadPrompt(templateName);
  return template.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
    return variables[key] ?? _match;
  });
}

export function clearPromptCache(): void {
  promptCache.clear();
}
