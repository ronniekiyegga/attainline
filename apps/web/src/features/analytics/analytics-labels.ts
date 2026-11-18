import type { RankingMeasure } from "./analytics.schema";

export const measureLabels: Record<RankingMeasure, string> = {
  CAT4_MEAN: "CAT4 mean",
  CAT4_VERBAL: "CAT4 verbal",
  CAT4_QUANTITATIVE: "CAT4 quantitative",
  CAT4_NON_VERBAL: "CAT4 non-verbal",
  CAT4_SPATIAL: "CAT4 spatial",
  NGRT_READING: "NGRT reading",
  PTE: "Progress Test English",
  PTM: "Progress Test Maths",
  PTS: "Progress Test Science",
};

export const statusLabels = {
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  PENDING: "Monitoring",
  OFF_TRACK: "Off track",
} as const;

export const priorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
} as const;
