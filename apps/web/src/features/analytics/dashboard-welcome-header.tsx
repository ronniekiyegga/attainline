import type { ReactNode } from "react";

type DashboardWelcomeHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  headingLevel?: "h1" | "h2";
  titleId?: string;
};

export function DashboardWelcomeHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  trailing,
  headingLevel = "h1",
  titleId,
}: DashboardWelcomeHeaderProps) {
  const Heading = headingLevel === "h2" ? "h2" : "h1";

  return (
    <div className="mb-6 flex flex-col gap-6 text-left sm:mb-8 lg:flex-row lg:items-start lg:justify-between lg:px-4">
      <div className="min-w-0 max-w-[min(40rem,100%)] space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
            {eyebrow}
          </p>
        ) : null}
        <Heading
          id={titleId}
          className={headingLevel === "h1"
            ? "text-balance text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-[1.75rem]"
            : "mb-2 text-balance text-2xl font-bold leading-tight tracking-tight text-gray-800 sm:text-xl md:text-xl lg:max-w-5xl lg:text-xl lg:leading-12"}
        >
          {title}
        </Heading>
        {subtitle ? (
          typeof subtitle === "string" ? (
            <p className="max-w-xl text-sm leading-relaxed text-gray-600">{subtitle}</p>
          ) : (
            <div className="max-w-2xl text-sm leading-relaxed text-gray-600">{subtitle}</div>
          )
        ) : null}
        {meta}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
