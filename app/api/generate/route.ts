import { streamText, LanguageModelUsage, ProviderMetadata } from "ai";
import {
  gateway,
  sseEvent,
  SSE_HEADERS,
  streamAndEmit,
} from "../shared";
import { SYSTEM_PROMPT } from "../prompt";

interface StepResult {
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

async function fetchModelPricing(modelId: string): Promise<{ input: string; output: string } | undefined> {
  try {
    const res = await fetch(`https://ai-gateway.vercel.sh/v1/models/${modelId}/endpoints`);
    if (!res.ok) return undefined;
    const data = await res.json();
    const endpoint = data.data?.endpoints?.[0];
    if (!endpoint?.pricing) return undefined;
    return { input: endpoint.pricing.prompt, output: endpoint.pricing.completion };
  } catch {
    return undefined;
  }
}

async function buildStepResult(
  model: string,
  text: string,
  reasoningText: string | undefined,
  usage: LanguageModelUsage,
  providerMetadata: ProviderMetadata | undefined,
): Promise<StepResult> {
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
  const pricing = await fetchModelPricing(resolvedModel);
  if (pricing) {
    step.pricing = pricing;
  }
  return step;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { diff, model } = await request.json();

        if (!diff) {
          controller.enqueue(
            encoder.encode(sseEvent({ type: "error", message: "No diff provided" }))
          );
          controller.close();
          return;
        }

        const result = streamText({
          model: gateway(model),
          system: SYSTEM_PROMPT,
          prompt: diff,
          providerOptions: {
            gateway: {
              models: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4.5"],
            },
            anthropic: {
              thinking: { type: "enabled" as const, budgetTokens: 5000 }
            },
            openai: {
              reasoningEffort: "high" as const,
            },
          },
        });

        const { text, reasoningText, usage, providerMetadata } =
          await streamAndEmit(result, controller, encoder);

        const step = await buildStepResult(model, text, reasoningText, usage, providerMetadata);

        controller.enqueue(
          encoder.encode(sseEvent({ type: "done", commitMessage: text, step }))
        );
        controller.close();
      } catch (err) {
        console.error("Generate error:", err);
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", message: err instanceof Error ? err.message : "Unknown error" }))
        );
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
