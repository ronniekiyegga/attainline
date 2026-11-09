import { Suspense, type ReactNode } from "react";
import { AccountPanel, AccountPanelSkeleton } from "@/features/auth/account-panel";
import { DashboardShell } from "@/features/shell/dashboard-shell";

export default function DashboardLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal: ReactNode }>) {
  return (
    <DashboardShell
      account={
        <Suspense fallback={<AccountPanelSkeleton />}>
          <AccountPanel />
        </Suspense>
      }
    >
      {children}
      {modal}
    </DashboardShell>
  );
}
