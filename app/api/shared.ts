import { streamText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

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
