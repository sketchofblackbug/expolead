import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to the ExpoLead admin dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<LoadingState label="Loading sign-in…" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
