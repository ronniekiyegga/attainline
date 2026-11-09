import type { MetricSeriesPoint } from "./metric-card";

const signatures = {
  trend: [2.2, 1.7, 2.8, 2.1, 1.4, 2.2, 3.2, 3.8, 4.45, 3.25],
  baseline: [2.2, 1.75, 2.8, 2.2, 1.45, 2.3, 3.2, 3.8, 4.45, 3.3],
  outcome: [2.15, 1.7, 2.8, 2.15, 1.45, 2.25, 3.2, 3.8, 4.45, 3.25],
  intervention: [2.2, 1.75, 2.8, 2.2, 1.45, 2.3, 3.2, 3.8, 4.45, 3.25],
} as const;

const comparisonSignature = [1.65, 2.85, 4.05, 3.2] as const;

function modulate(signature: readonly number[], value: number, anchor: number) {
  const scale = 1 + ((Math.max(0, Math.min(100, value)) - anchor) / 100) * 0.45;
  return signature.map((height) => Math.max(0.35, Math.min(5.05, height * scale)));
}

function toPoints(heights: number[], label: string, displayValue: string): MetricSeriesPoint[] {
  return heights.map((height, index) => ({
    label: `${label} ${index + 1}`,
    value: height,
    displayValue,
  }));
}

export function teacherWidgetSeries(
  kind: keyof typeof signatures,
  value: number,
  anchor: number,
  label: string,
  displayValue: string,
) {
  return {
    left: toPoints(modulate(signatures[kind], value, anchor), label, displayValue),
    right: toPoints(modulate(comparisonSignature, value, anchor), `${label} benchmark`, displayValue),
  };
}
