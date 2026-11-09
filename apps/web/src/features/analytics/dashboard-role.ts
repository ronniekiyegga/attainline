import type { Session } from "@/features/auth/session";

const dashboardRoleLabels: Record<Session["role"], string> = {
  HEADTEACHER: "Headteacher",
  HEAD_OF_YEAR: "Head of Year",
  TEACHER: "Teacher",
};

export function dashboardRoleLabel(role: Session["role"]) {
  return dashboardRoleLabels[role];
}
