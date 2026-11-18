import type { ReactNode } from "react";

type InstitutionalDashboardShellProps = {
  hero?: ReactNode;
  belowHero?: ReactNode;
  children: ReactNode;
};

export function InstitutionalDashboardShell({
  hero,
  belowHero,
  children,
}: InstitutionalDashboardShellProps) {
  return (
    <div
      className="relative flex min-h-0 w-full min-w-0 animate-slide-up-fade flex-col overflow-x-hidden rounded-none bg-white motion-reduce:animate-none"
      style={{ animationDuration: "400ms", animationFillMode: "backwards" }}
    >
      <div className="mx-auto w-full max-w-[min(1600px,100%)] px-3 pb-12 pt-2 sm:px-4 lg:px-6">
        {hero}
        {belowHero ? (
          <div className={`${hero ? "mt-2" : "mt-6"} mb-8 min-w-0`}>
            {belowHero}
          </div>
        ) : null}
        <div className="min-w-0 space-y-10">{children}</div>
      </div>
    </div>
  );
}
