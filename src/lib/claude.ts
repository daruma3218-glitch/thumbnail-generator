import Anthropic from '@anthropic-ai/sdk';

export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';

// Legacy aliases (kept for extract-parts.ts compatibility)
export const AGENT_MODEL = CLAUDE_MODEL;
export const HOST_MODEL = CLAUDE_MODEL;
