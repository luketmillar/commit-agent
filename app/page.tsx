"use client";

import { useState, useRef, useEffect } from "react";
import { useGenerateCommitMessage } from "./api";
import { StreamingPanel } from "./components/StreamingPanel";
import { MetadataGrid } from "./components/MetadataGrid";

const MODELS = [
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-4.1", label: "GPT 4.1" },
  { id: "openai/gpt-4.1-mini", label: "GPT 4.1 Mini" },
  { id: "openai/o3-mini", label: "OpenAI o3-mini" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export default function Home() {
  const [diff, setDiff] = useState("");
  const [fileName, setFileName] = useState("");
  const [model, setModel] = useState("deepseek/deepseek-r1");

  const { loading, error, result, streamingReasoning, streamingText, request } =
    useGenerateCommitMessage();

  const reasoningRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [streamingReasoning]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDiff(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (!diff) return;
    request(diff, model);
  };

  return (
    <main>
      <h1>Commit Agent</h1>

      <label htmlFor="diff-file">Upload diff file</label>
      <input
        id="diff-file"
        type="file"
        accept=".patch,.diff,.txt"
        onChange={handleFileUpload}
      />
      {fileName && (
        <p className="file-info">
          Loaded: {fileName} ({diff.length.toLocaleString()} chars)
        </p>
      )}

      <label htmlFor="model">Model</label>
      <select
        id="model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>

      <button onClick={handleGenerate} disabled={loading || !diff}>
        {loading ? "Generating..." : "Generate Commit Message"}
      </button>

      {error && <p className="error">{error}</p>}

      {loading && (streamingReasoning || streamingText) && (
        <StreamingPanel
          reasoning={streamingReasoning}
          text={streamingText}
          reasoningRef={reasoningRef}
        />
      )}

      {result && (
        <>
          {result.step.reasoningText && (
            <details className="reasoning-collapse">
              <summary>
                Reasoning ({result.step.reasoningText.length.toLocaleString()} chars)
              </summary>
              <pre>{result.step.reasoningText}</pre>
            </details>
          )}
          <div className="result-box">{result.commitMessage}</div>
          <MetadataGrid step={result.step} />
        </>
      )}
    </main>
  );
}
