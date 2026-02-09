import { streamText } from "ai";
import {
  gateway,
  sseEvent,
  SSE_HEADERS,
  buildStepResult,
  streamAndEmit,
} from "../shared";
import { SYSTEM_PROMPT } from "../prompt";

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

        const step = buildStepResult(model, text, reasoningText, usage, providerMetadata);

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
