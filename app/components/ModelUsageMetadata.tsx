import { StepResult } from "../types";

interface ModelUsageMetadataProps {
  step: StepResult;
}

function formatCost(cost?: number) {
  if (cost == null) return "—";
  return `$${Number(cost).toFixed(6)}`;
}

export function ModelUsageMetadata({ step }: ModelUsageMetadataProps) {
  const inputRate = step.pricing ? parseFloat(step.pricing.input) : null;
  const outputRate = step.pricing ? parseFloat(step.pricing.output) : null;
  const inputCost = inputRate != null ? step.usage.promptTokens * inputRate : null;
  const outputCost = outputRate != null ? step.usage.completionTokens * outputRate : null;

  return (
    <section className="metadata-grid">
      <div className="metadata-row metadata-header">
        <span>Model</span>
        <span>Tokens</span>
        <span>Cost</span>
      </div>
      <div className="metadata-row">
        <span>{step.model.split("/")[1]}</span>
        <span>{step.usage.promptTokens.toLocaleString()} in</span>
        <span>{inputCost != null ? formatCost(inputCost) : "—"}</span>
      </div>
      <div className="metadata-row">
        <span />
        <span>{step.usage.completionTokens.toLocaleString()} out</span>
        <span>{outputCost != null ? formatCost(outputCost) : "—"}</span>
      </div>
      <div className="metadata-row metadata-total">
        <span />
        <span>{step.usage.totalTokens.toLocaleString()} total</span>
        <span>{formatCost(step.cost)}</span>
      </div>
    </section>
  );
}
