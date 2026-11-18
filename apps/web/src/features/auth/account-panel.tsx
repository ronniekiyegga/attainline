import { redirect } from "next/navigation";
import { AccountMenu } from "./account-menu";
import { getSession, type Session } from "./session";

const roleLabels: Record<Session["role"], string> = {
  HEADTEACHER: "Headteacher",
  HEAD_OF_YEAR: "Head of year",
  TEACHER: "Teacher",
};

const expandedOnly = "group-data-[collapsible=icon]:hidden";

function accessDescription({ role, yearGroups }: Session): string {
  if (yearGroups === null) {
    return `${roleLabels[role]} · Whole school`;
  }

  if (yearGroups.length === 0) {
    return `${roleLabels[role]} · No year groups`;
  }

  return `${roleLabels[role]} · ${yearGroups.length === 1 ? "Year" : "Years"} ${yearGroups.join(", ")}`;
}

function initials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Avatar({ label, size }: { label: string; size: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 ${size}`}
    >
      {label}
    </span>
  );
}

export async function AccountPanel() {
  const result = await getSession();

  if (result.status === "signed-out") {
    redirect("/sign-in");
  }

  if (result.status === "unavailable") {
    return (
      <p role="status" className={`px-2 py-1.5 text-xs text-slate-600 ${expandedOnly}`}>
        Account details are unavailable. Reload to try again.
      </p>
    );
  }

  const { session } = result;
  const name = session.user.displayName;
  const label = initials(name);

  return (
    <>
      <div
        className="px-2 py-1.5 group-data-[collapsible=icon]:sr-only"
        title={session.organisation.name}
      >
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Active school
        </p>
        <p className="truncate text-xs font-medium text-foreground">
          {session.organisation.name}
        </p>
      </div>

      <div className="hidden items-center justify-center p-2 group-data-[collapsible=icon]:flex">
        <Avatar label={label} size="size-9" />
        <span className="sr-only">{name}</span>
      </div>

      <div
        className={`relative rounded-lg bg-[linear-gradient(160deg,#3976F5_16%,#3976F5_40%,#8415F4_60%,#6600CC_98%)] p-[.5px] ${expandedOnly}`}
      >
        <div className="flex items-center gap-3 rounded-lg bg-white px-2 py-4 shadow-lg">
          <Avatar label={label} size="size-10" />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-black">{name}</span>
            <span className="mt-0.5 block truncate text-xs font-medium text-gray-500">
              {accessDescription(session)}
            </span>
          </div>
        </div>
      </div>

      <div className={expandedOnly}>
        <AccountMenu
          organisations={{ activeId: session.organisation.id, available: session.organisations }}
        />
      </div>
    </>
  );
}

export function AccountPanelSkeleton() {
  return (
    <div role="status" aria-label="Loading account" className="space-y-2 px-2 py-1.5">
      <div className="h-3 w-20 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
      <div className={`h-16 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none ${expandedOnly}`} />
    </div>
  );
}
