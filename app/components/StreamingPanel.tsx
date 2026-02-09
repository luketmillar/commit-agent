import { RefObject } from "react";

interface StreamingPanelProps {
  reasoning: string;
  text: string;
  reasoningRef: RefObject<HTMLPreElement | null>;
}

export function StreamingPanel({ reasoning, text, reasoningRef }: StreamingPanelProps) {
  return (
    <section className="streaming-panel">
      {reasoning && (
        <div className="streaming-section">
          <h3>Reasoning</h3>
          <pre ref={reasoningRef} className="streaming-reasoning-pre">
            {reasoning}
          </pre>
        </div>
      )}
      {text && (
        <div className="streaming-section">
          <h3>Commit Message</h3>
          <div className="streaming-text-box">{text}</div>
        </div>
      )}
    </section>
  );
}
