import { StepResult } from "../types";

interface MetadataGridProps {
  step: StepResult;
}

function formatCost(cost?: number) {
  if (cost == null) return "—";
  return `$${Number(cost).toFixed(6)}`;
}

function formatCache(step: StepResult) {
  if (step.usage.cacheReadTokens == null && step.usage.cacheWriteTokens == null) {
    return "—";
  }
  return `${(step.usage.cacheReadTokens ?? 0).toLocaleString()} / ${(step.usage.cacheWriteTokens ?? 0).toLocaleString()}`;
}

const headerCells = ["Model", "Input", "Output", "Cache R/W", "Cost"];

export function MetadataGrid({ step }: MetadataGridProps) {
  return (
    <section className="metadata-grid">
      <div className="metadata-row metadata-header">
        {headerCells.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div className="metadata-row">
        <span>{step.model.split("/")[1]}</span>
        <span>{step.usage.promptTokens.toLocaleString()}</span>
        <span>{step.usage.completionTokens.toLocaleString()}</span>
        <span>{formatCache(step)}</span>
        <span>{formatCost(step.cost)}</span>
      </div>
    </section>
  );
}
