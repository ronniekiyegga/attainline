import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";
import { academicYearParamSchema, formatAcademicYear } from "./academic-year";
import { AssessmentResults } from "./assessment-results";
import { directoryHref } from "./directory-link";
import {
  earlyWarningBand,
  earlyWarningDotClasses,
  earlyWarningLabels,
  earlyWarningTextOnDarkClasses,
  earlyWarningTextOnLightClasses,
} from "./early-warning";
import { getStudentProfile } from "./student.api";
import type { StudentAssessments, StudentDetails } from "./student-page.schema";

export type ProfileVariant = "dialog" | "page";

type StudentProfileProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  variant: ProfileVariant;
};

const closeClass =
  "rounded-full px-4 py-2 text-[11px] font-semibold text-zinc-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Title({ variant, className, children }: { variant: ProfileVariant; className: string; children: ReactNode }) {
  return variant === "dialog"
    ? <Dialog.Title className={className}>{children}</Dialog.Title>
    : <h1 className={className}>{children}</h1>;
}

function Description({ variant, className, children }: { variant: ProfileVariant; className: string; children: ReactNode }) {
  return variant === "dialog"
    ? <Dialog.Description className={className}>{children}</Dialog.Description>
    : <p className={className}>{children}</p>;
}

function initials({ firstName, surname }: StudentDetails): string {
  return [firstName, surname].flatMap((part) => (part ? [part[0]] : [])).join("").toUpperCase();
}

function displayName({ firstName, surname }: StudentDetails): string {
  return firstName ? `${firstName} ${surname}` : surname;
}

function ProfileSheet({
  variant,
  year,
  status,
  children,
}: {
  variant: ProfileVariant;
  year?: number;
  status?: StudentAssessments["status"]["value"];
  children: ReactNode;
}) {
  const band = status && earlyWarningBand(status);

  return (
    <div className="relative w-full overflow-hidden rounded-[2.5rem] border-[2.5px] border-[rgba(255,255,255,0.6)] bg-[#fcfcfc] shadow-[8px_20px_40px_0_rgba(219,220,230,0.5)]">
      <div className="relative bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-zinc-500">Student Portfolio</span>
          <div className="flex items-center gap-3 text-xs">
            {band && (
              <span className="flex items-center gap-2">
                <span className="text-gray-500">Status</span>
                <span className="flex items-center gap-1">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${earlyWarningDotClasses[band]}`} />
                  <span className={`font-medium ${earlyWarningTextOnLightClasses[band]}`}>
                    {earlyWarningLabels[band]}
                  </span>
                </span>
              </span>
            )}
            {variant === "dialog" ? (
              <Dialog.Close className={closeClass}>Close</Dialog.Close>
            ) : (
              <Link href={directoryHref({ year })} className={closeClass}>
                Back to directory
              </Link>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function FaceCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 mb-2 flex justify-center px-6 py-6">
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#CFB1FF_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute inset-0 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>
      <div
        className="relative z-10 w-full max-w-sm p-6 text-white"
        style={{ borderRadius: "1rem", background: "linear-gradient(187deg, #5F5F5F 5.38%, #292929 92.39%)" }}
      >
        {children}
      </div>
    </div>
  );
}

function ProfileMessage({ variant, title, message, year }: { variant: ProfileVariant; title: string; message: string; year?: number }) {
  return (
    <ProfileSheet variant={variant} year={year}>
      <div className="space-y-2 px-6 pb-8">
        <Title variant={variant} className="text-sm font-semibold text-gray-900">{title}</Title>
        <Description variant={variant} className="text-xs text-gray-500">{message}</Description>
      </div>
    </ProfileSheet>
  );
}

export async function StudentProfile({ params, searchParams, variant }: StudentProfileProps) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  const id = z.uuid().safeParse(studentId);
  const year = academicYearParamSchema.safeParse(query.year);

  if (!id.success || !year.success || year.data === undefined) {
    return (
      <ProfileMessage
        variant={variant}
        title="This student link is invalid"
        message="Open the student from the directory to see their profile."
      />
    );
  }

  const profile = await getStudentProfile(id.data, year.data);
  const yearLabel = formatAcademicYear(year.data);

  if (profile.status === "not-found") {
    return (
      <ProfileMessage
        variant={variant}
        year={year.data}
        title="Student not available"
        message={`This student is not enrolled in ${yearLabel}, or is outside your year groups.`}
      />
    );
  }

  if (profile.status === "unavailable") {
    return (
      <ProfileMessage
        variant={variant}
        year={year.data}
        title="We couldn’t load this student"
        message="Student information is temporarily unavailable. Close the profile and try again."
      />
    );
  }

  const { details, assessments } = profile;
  const band = assessments && earlyWarningBand(assessments.status.value);

  return (
    <ProfileSheet variant={variant} year={year.data} status={assessments?.status.value}>
      <FaceCard>
        <div className="flex w-full items-start justify-between">
          <div
            aria-hidden="true"
            className="mr-5 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-semibold"
          >
            {initials(details)}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5 pt-1">
            <Title variant={variant} className="text-xs font-semibold text-white">
              {displayName(details)}
            </Title>
            <Description variant={variant} className="text-[11px] font-medium text-gray-100">
              Placement for {yearLabel}
            </Description>
            <div className="my-2 h-px w-full bg-[#6d6f75]" />
            <dl className="space-y-2 text-[11px]">
              {[
                ["Student reference", details.institutionStudentRef],
                ["Year group", `Year ${details.yearGroup}`],
                ["Class", details.classGroup ?? "Not recorded"],
              ].map(([label, value], index) => (
                <div key={label}>
                  {index > 0 && <div className="mb-2 h-px w-full bg-[#54565a]" />}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-gray-200">{label}</dt>
                    <dd className="min-w-0 text-right text-white [overflow-wrap:anywhere]">{value}</dd>
                  </div>
                </div>
              ))}
              {band && (
                <div>
                  <div className="mb-2 h-px w-full bg-[#54565a]" />
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-gray-200">Status</dt>
                    <dd className={`font-medium ${earlyWarningTextOnDarkClasses[band]}`}>
                      {earlyWarningLabels[band]}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>
      </FaceCard>

      {assessments ? (
        <AssessmentResults assessments={assessments} />
      ) : (
        <p role="status" className="mb-8 pl-6 pr-4 text-xs text-gray-500">
          Assessment results are temporarily unavailable.
        </p>
      )}
    </ProfileSheet>
  );
}

export function StudentProfileSkeleton({ variant }: { variant: ProfileVariant }) {
  return (
    <ProfileSheet variant={variant}>
      <div role="status" aria-label="Loading student profile" className="space-y-4 px-6 pb-8">
        {variant === "dialog" && <Dialog.Title className="sr-only">Loading student profile</Dialog.Title>}
        <div className="mx-auto h-40 max-w-sm animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none" />
        <div className="h-4 w-48 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
      </div>
    </ProfileSheet>
  );
}
