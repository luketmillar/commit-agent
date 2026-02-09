import { useState } from "react";
import { StepResult } from "./types";

async function* parseSSE(
  response: Response
): AsyncGenerator<Record<string, unknown>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6);
        if (!json) continue;
        try {
          yield JSON.parse(json);
        } catch {
          // skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface GenerateResult {
  commitMessage: string;
  step: StepResult;
}

export function useGenerateCommitMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [streamingText, setStreamingText] = useState("");

  const request = async (diff: string, model: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    setStreamingReasoning("");
    setStreamingText("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff, model }),
      });

      if (!res.ok || !res.body) {
        setError((await res.text()) || "Request failed");
        setLoading(false);
        return;
      }

      for await (const event of parseSSE(res)) {
        switch (event.type) {
          case "reasoning-delta":
            setStreamingReasoning((prev) => prev + (event.text as string));
            break;
          case "text-delta":
            setStreamingText((prev) => prev + (event.text as string));
            break;
          case "done":
            setResult({
              commitMessage: event.commitMessage as string,
              step: event.step as StepResult,
            });
            setStreamingReasoning("");
            setStreamingText("");
            break;
          case "error":
            setError(event.message as string);
            break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, streamingReasoning, streamingText, request };
}
