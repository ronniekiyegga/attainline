import { Suspense } from "react";
import { StudentProfile, StudentProfileSkeleton } from "@/features/students/student-profile";
import { StudentProfileModal } from "@/features/students/student-profile-modal";

type ProfileRouteProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function StudentProfileDialog({ params, searchParams }: ProfileRouteProps) {
  const { studentId } = await params;

  return (
    <StudentProfileModal studentId={studentId}>
      <Suspense fallback={<StudentProfileSkeleton variant="dialog" />}>
        <StudentProfile params={params} searchParams={searchParams} variant="dialog" />
      </Suspense>
    </StudentProfileModal>
  );
}

export default function StudentProfileDialogRoute(props: ProfileRouteProps) {
  return (
    <Suspense>
      <StudentProfileDialog {...props} />
    </Suspense>
  );
}
