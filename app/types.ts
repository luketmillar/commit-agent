export interface StepResult {
  model: string;
  output: string;
  reasoningText?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  cost?: number;
  pricing?: { input: string; output: string };
}
