import { formatAcademicYear } from "./academic-year";
import { getStudentProfile } from "./student.api";
import {
  StudentProfileMessage,
  StudentProfileView,
  type ProfileVariant,
} from "./student-profile-view";
import { parseStudentProfileRequest } from "./student-profile.validation";

export { StudentProfileSkeleton, type ProfileVariant } from "./student-profile-view";

type StudentProfileProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  variant: ProfileVariant;
};

export async function StudentProfile({ params, searchParams, variant }: StudentProfileProps) {
  const [{ studentId }, query] = await Promise.all([params, searchParams]);
  const request = parseStudentProfileRequest(studentId, query.year);

  if (!request) {
    return (
      <StudentProfileMessage
        variant={variant}
        title="This student link is invalid"
        message="Open the student from the directory to see their profile."
      />
    );
  }

  const profile = await getStudentProfile(request.studentId, request.year);
  const yearLabel = formatAcademicYear(request.year);

  if (profile.status === "not-found") {
    return (
      <StudentProfileMessage
        variant={variant}
        year={request.year}
        title="Student not available"
        message={`This student is not enrolled in ${yearLabel}, or is outside your year groups.`}
      />
    );
  }

  if (profile.status === "unavailable") {
    return (
      <StudentProfileMessage
        variant={variant}
        year={request.year}
        title="We couldn’t load this student"
        message="Student information is temporarily unavailable. Close the profile and try again."
      />
    );
  }

  return (
    <StudentProfileView
      variant={variant}
      year={request.year}
      yearLabel={yearLabel}
      details={profile.details}
      assessments={profile.assessments}
    />
  );
}
