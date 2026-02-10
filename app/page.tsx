"use client";

import { useState, useRef, useEffect } from "react";
import { useGenerateCommitMessage } from "./api";
import { StreamingPanel } from "./components/StreamingPanel";
import { MetadataGrid } from "./components/MetadataGrid";

interface Model {
  id: string;
  name: string;
}

const RECOMMENDED = new Set([
  "deepseek/deepseek-r1",           // strong reasoning, open-source
  "anthropic/claude-sonnet-4.5",    // best code understanding
  "anthropic/claude-haiku-4.5",     // fast + cheap, good quality
  "openai/gpt-4.1",                 // high accuracy, large context
  "openai/gpt-4.1-mini",            // cheapest OpenAI option
  "openai/o3-mini",                 // reasoning model, cost-efficient
  "google/gemini-2.5-flash",        // fastest, 1M context window
]);

export default function Home() {
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [recommendedOnly, setRecommendedOnly] = useState(true);
  const [diff, setDiff] = useState("");
  const [fileName, setFileName] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data: Model[]) => {
        setAllModels(data);
        const first = data.find((m) => RECOMMENDED.has(m.id)) ?? data[0];
        if (first) setModel(first.id);
      });
  }, []);

  const visibleModels = recommendedOnly
    ? allModels.filter((m) => RECOMMENDED.has(m.id))
    : allModels;

  const { loading, error, result, streamingReasoning, streamingText, request } =
    useGenerateCommitMessage();

  const reasoningRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [streamingReasoning]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const parts: string[] = [];
    for (const file of Array.from(files)) {
      const text = await file.text();
      parts.push(text);
    }

    setDiff(parts.join("\n"));
    setFileName(
      files.length === 1
        ? files[0].name
        : `${files.length} files`
    );
  };

  const handleGenerate = () => {
    if (!diff) return;
    request(diff, model);
  };

  return (
    <main>
      <h1>Commit Agent</h1>

      <label htmlFor="diff-file">Upload diff files</label>
      <input
        id="diff-file"
        type="file"
        accept=".patch,.diff,.txt"
        multiple
        onChange={handleFileUpload}
      />
      {fileName && (
        <p className="file-info">
          Loaded: {fileName} ({diff.length.toLocaleString()} chars)
        </p>
      )}

      <label htmlFor="model">Model</label>
      <div className="model-row">
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {visibleModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={recommendedOnly}
            onChange={(e) => {
              setRecommendedOnly(e.target.checked);
              if (e.target.checked && !RECOMMENDED.has(model)) {
                const first = allModels.find((m) => RECOMMENDED.has(m.id));
                if (first) setModel(first.id);
              }
            }}
          />
          Recommended only
        </label>
      </div>

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
