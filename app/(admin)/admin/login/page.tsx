import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Sign in" };

// LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary
// for the page to prerender.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-6">
          <p className="text-sm text-zinc-400">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
