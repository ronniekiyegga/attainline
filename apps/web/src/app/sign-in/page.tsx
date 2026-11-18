import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/features/auth/session";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in | Attainline",
};

async function LeaveWhenSignedIn() {
  const session = await getSession();

  if (session.status === "signed-in") {
    redirect("/");
  }

  return null;
}

export default function SignInPage() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 overflow-hidden lg:grid-cols-2">
      <Suspense>
        <LeaveWhenSignedIn />
      </Suspense>
      <div
        aria-hidden
        className="relative hidden h-screen w-full shrink-0 bg-linear-to-br from-slate-100 to-slate-50 lg:block"
      />

      <main className="mx-auto flex w-[90%] flex-col items-center justify-center bg-white px-3 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center justify-center">
            <Image
              src="/images/branding/collapsed-logo.svg"
              alt="Attainline"
              width={32}
              height={20}
              className="relative z-10 mb-4 block"
              priority
            />
            <h1 className="mb-2 text-2xl font-bold text-gray-800">Welcome back!</h1>
            <p className="text-sm text-zinc-500">
              Discover a better way of improving student performance.
            </p>
          </div>

          <SignInForm />
        </div>
      </main>
    </div>
  );
}
