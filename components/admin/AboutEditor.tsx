"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAbout } from "@/app/(admin)/admin/(app)/site-actions";

export type AboutData = {
  founder: string;
  role: string;
  location: string;
  bio: string;
  creditsLead: string;
  credits: string[];
};

export function AboutEditor({ data }: { data: AboutData }) {
  const router = useRouter();
  const [credits, setCredits] = useState(data.credits);
  const [lead, setLead] = useState(data.creditsLead);
  const [bio, setBio] = useState(data.bio);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await saveAbout(form);
      if (!res.ok) return setError(res.error);
      setDirty(false);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  }

  // The page joins these with commas, "and", then a full stop — so the preview
  // has to do the same or it isn't a preview.
  const sentence =
    credits.filter(Boolean).length > 0
      ? `${lead} ${credits
          .filter(Boolean)
          .map((t, i, a) => t + (i < a.length - 2 ? ", " : i === a.length - 2 ? ", and " : "."))
          .join("")}`
      : lead;

  return (
    <form onSubmit={submit} onChange={() => setDirty(true)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">About</h1>
          <p className="mt-1 text-sm text-zinc-500">The company copy on the About page.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-700">Saved</span>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className="admin-label mb-1.5 block">Founder</label>
            <input name="founder" defaultValue={data.founder} required className="admin-input" />
          </div>
          <div>
            <label className="admin-label mb-1.5 block">Role</label>
            <input name="role" defaultValue={data.role} className="admin-input" />
          </div>
          <div>
            <label className="admin-label mb-1.5 block">Based in</label>
            <input name="location" defaultValue={data.location} className="admin-input" />
          </div>
        </div>

        <div>
          <label className="admin-label mb-1.5 block">Bio</label>
          <textarea
            name="bio"
            rows={5}
            required
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="admin-input resize-y leading-relaxed"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            The opening paragraph. Plain text — the website handles the styling.
          </p>
        </div>

        <div>
          <label className="admin-label mb-1.5 block">Credits lead-in</label>
          <input
            name="credits_lead"
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            className="admin-input"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            The words before the list of films.
          </p>
        </div>

        <div>
          <label className="admin-label mb-1.5 block">Notable credits</label>
          <ul className="space-y-2">
            {credits.map((title, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 text-center font-mono text-xs tabular-nums text-zinc-400">
                  {i + 1}
                </span>
                <input
                  name="credit"
                  value={title}
                  onChange={(e) => {
                    const next = [...credits];
                    next[i] = e.target.value;
                    setCredits(next);
                    setDirty(true);
                  }}
                  className="admin-input flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = [...credits];
                    if (i > 0) [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    setCredits(next);
                    setDirty(true);
                  }}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCredits(credits.filter((_, j) => j !== i));
                    setDirty(true);
                  }}
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setCredits([...credits, ""]);
              setDirty(true);
            }}
            className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-400"
          >
            + Add a film
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <p className="admin-label">How it will read</p>
        <div className="mt-3 space-y-4 rounded bg-zinc-900 p-5 text-zinc-100">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-zinc-500">
            {data.founder} · {data.role}
          </p>
          <p className="text-[0.95rem] leading-relaxed">{bio}</p>
          <p className="text-sm leading-relaxed text-zinc-400">{sentence}</p>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          The real page uses the site&rsquo;s own type and spacing — this is only
          to check the words and the punctuation between the film titles.
        </p>
      </div>
    </form>
  );
}
