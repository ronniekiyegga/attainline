import type { AssessmentMeasure } from "../../generated/prisma/client.js";

export type StudentStatus = "ON_TRACK" | "AT_RISK" | "PENDING" | "OFF_TRACK";
export type StudentPriority = "LOW" | "MEDIUM" | "HIGH";

export type MeasureScore = {
  measure: AssessmentMeasure;
  standardAgeScore: number;
};

export const STATUS_MEASURES = ["CAT4_MEAN", "PTE", "NGRT_READING"] as const;
export const PRIORITY_MEASURE = "CAT4_QUANTITATIVE";

export function calculateStatus(latest: MeasureScore[]) {
  const inputs = STATUS_MEASURES.flatMap((measure) =>
    latest.filter((score) => score.measure === measure));

  if (inputs.length === 0) {
    return { value: "PENDING" as StudentStatus, averageStandardAgeScore: null, basedOn: [] };
  }

  const average = inputs.reduce((sum, score) => sum + score.standardAgeScore, 0) / inputs.length;
  const value: StudentStatus = average >= 100
    ? "ON_TRACK"
    : average >= 95
      ? "AT_RISK"
      : average >= 90
        ? "PENDING"
        : "OFF_TRACK";

  return {
    value,
    averageStandardAgeScore: Math.round(average * 10) / 10,
    basedOn: inputs.map(({ measure }) => measure),
  };
}

export function calculatePriority(latest: MeasureScore[]) {
  const quantitative = latest.find(({ measure }) => measure === PRIORITY_MEASURE);

  if (!quantitative) {
    return { value: "MEDIUM" as StudentPriority, standardAgeScore: null, basedOn: null };
  }

  const score = quantitative.standardAgeScore;
  const value: StudentPriority = score <= 90 ? "HIGH" : score < 100 ? "MEDIUM" : "LOW";

  return { value, standardAgeScore: score, basedOn: PRIORITY_MEASURE };
}
