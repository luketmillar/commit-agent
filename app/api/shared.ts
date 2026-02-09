import { streamText, LanguageModelUsage, ProviderMetadata } from "ai";
import { createGateway } from "@ai-sdk/gateway";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

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
}

export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

export function buildStepResult(
  model: string,
  text: string,
  reasoningText: string | undefined,
  usage: LanguageModelUsage,
  providerMetadata: ProviderMetadata | undefined,
): StepResult {
  const resolvedModel = (providerMetadata?.gateway?.resolvedModel as string) ?? model;
  const step: StepResult = {
    model: resolvedModel,
    output: text,
    usage: {
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? undefined,
      cacheWriteTokens: usage.inputTokenDetails?.cacheWriteTokens ?? undefined,
    },
  };
  if (reasoningText) {
    step.reasoningText = reasoningText;
  }
  const cost = providerMetadata?.gateway?.cost;
  if (cost != null) {
    step.cost = cost as number;
  }
  return step;
}

export async function streamAndEmit(
  stream: ReturnType<typeof streamText>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  for await (const part of stream.fullStream) {
    if (part.type === "reasoning-delta") {
      controller.enqueue(
        encoder.encode(sseEvent({ type: "reasoning-delta", text: part.text }))
      );
    } else if (part.type === "text-delta") {
      controller.enqueue(
        encoder.encode(sseEvent({ type: "text-delta", text: part.text }))
      );
    }
  }

  const [text, reasoningText, usage, providerMetadata] = await Promise.all([
    stream.text,
    stream.reasoningText,
    stream.usage,
    stream.providerMetadata,
  ]);

  return { text, reasoningText, usage, providerMetadata };
}
