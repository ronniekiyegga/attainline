import type { StudentAssessments } from "./student-page.schema";

export type StudentStatus = StudentAssessments["status"]["value"];
export type EarlyWarningBand = "on_track" | "monitoring" | "at_risk";

export function earlyWarningBand(status: StudentStatus): EarlyWarningBand {
  switch (status) {
    case "ON_TRACK":
      return "on_track";
    case "PENDING":
      return "monitoring";
    case "AT_RISK":
    case "OFF_TRACK":
      return "at_risk";
  }
}

export const earlyWarningLabels: Record<EarlyWarningBand, string> = {
  on_track: "On-Track",
  monitoring: "Monitoring",
  at_risk: "At Risk",
};

export const earlyWarningDotClasses: Record<EarlyWarningBand, string> = {
  on_track: "bg-linear-to-br from-emerald-500 to-green-600",
  monitoring: "bg-linear-to-br from-amber-400 to-yellow-500",
  at_risk: "bg-linear-to-br from-rose-500 to-red-600",
};

export const earlyWarningTextOnLightClasses: Record<EarlyWarningBand, string> = {
  on_track: "bg-linear-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent",
  monitoring: "bg-linear-to-r from-amber-700 to-yellow-700 bg-clip-text text-transparent",
  at_risk: "bg-linear-to-r from-rose-700 to-red-700 bg-clip-text text-transparent",
};

export const earlyWarningTextOnDarkClasses: Record<EarlyWarningBand, string> = {
  on_track: "bg-linear-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent",
  monitoring: "bg-linear-to-r from-amber-200 to-yellow-200 bg-clip-text text-transparent",
  at_risk: "bg-linear-to-r from-rose-200 to-red-100 bg-clip-text text-transparent",
};
