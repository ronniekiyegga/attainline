import { Suspense } from "react";
import { StudentProfile, StudentProfileSkeleton } from "@/features/students/student-profile";

type ProfileRouteProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function StudentProfilePage({ params, searchParams }: ProfileRouteProps) {
  return (
    <div className="flex w-full justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-2xl rounded-[2.5rem] bg-white shadow-xl">
        <Suspense fallback={<StudentProfileSkeleton variant="page" />}>
          <StudentProfile params={params} searchParams={searchParams} variant="page" />
        </Suspense>
      </div>
    </div>
  );
}
