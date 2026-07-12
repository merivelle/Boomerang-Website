"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The homepage contact bubble: an email pill + SUBMIT. It doesn't send anything
// on its own — it carries the address into the full /contact form via a query
// param, where the visitor finishes name / subject / message.
export function EmailSignup() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    router.push(`/contact${q}`);
  };

  return (
    <form
      onSubmit={submit}
      className="mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-stretch"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email Address"
        aria-label="Email address"
        className="h-16 flex-1 rounded-full border border-line bg-transparent px-7 text-text placeholder:text-faint transition-colors duration-hover ease-out focus:border-text focus:outline-none"
      />
      <button
        type="submit"
        className="h-16 rounded-full bg-text px-10 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Submit
      </button>
    </form>
  );
}
