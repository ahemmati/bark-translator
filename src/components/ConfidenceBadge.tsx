import type { ConfidenceBucket } from "../types";

const LABELS: Record<ConfidenceBucket, string> = {
  notSure: "Not sure",
  fairlyConfident: "Fairly confident",
  veryConfident: "Very confident",
};

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceBucket }) {
  return <span className={`confidence-badge confidence-${confidence}`}>{LABELS[confidence]}</span>;
}
