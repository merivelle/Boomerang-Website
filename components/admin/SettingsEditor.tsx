"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettings } from "@/app/(admin)/admin/(app)/site-actions";

export type SettingsData = {
  phone: string;
  instagramHandle: string;
  copyrightYear: number;
  intro: string;
  contactEmail: string;
  siteName: string;
};

export function SettingsEditor({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [handle, setHandle] = useState(data.instagramHandle);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await saveSettings(form);
      if (!res.ok) return setError(res.error);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Contact details and the few site-wide values worth changing.
          </p>
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
        <p className="admin-label">Contact</p>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="admin-label mb-1.5 block">Phone</label>
            <input name="phone" defaultValue={data.phone} className="admin-input" />
            <p className="mt-1.5 text-xs text-zinc-500">
              Shown in the footer and on the contact page. Tapping it on a phone
              dials — that link is built for you.
            </p>
          </div>

          <div>
            <label className="admin-label mb-1.5 block">Instagram</label>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400">@</span>
              <input
                name="instagram_handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                className="admin-input"
              />
            </div>
            <p className="mt-1.5 truncate text-xs text-zinc-500">
              {handle ? `instagram.com/${handle}` : "Just the handle, no link."}
            </p>
          </div>
        </div>

        <div>
          <label className="admin-label mb-1.5 block">Where messages are sent</label>
          <input
            name="contact_email"
            type="email"
            defaultValue={data.contactEmail}
            className="admin-input max-w-md"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            The contact form delivers here. This address is{" "}
            <strong className="text-zinc-700">never shown on the website</strong>{" "}
            — that&rsquo;s deliberate, so it can&rsquo;t be harvested for spam.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
        <p className="admin-label">Site</p>

        <div>
          <label className="admin-label mb-1.5 block">Site description</label>
          <textarea name="intro" rows={3} defaultValue={data.intro} className="admin-input resize-y" />
          <p className="mt-1.5 text-xs text-zinc-500">
            Used by Google and when a link to the site is shared, unless a page
            sets its own in SEO.
          </p>
        </div>

        <div className="max-w-[10rem]">
          <label className="admin-label mb-1.5 block">Copyright year</label>
          <input
            name="copyright_year"
            inputMode="numeric"
            defaultValue={data.copyrightYear}
            className="admin-input"
          />
          <p className="mt-1.5 text-xs text-zinc-500">Shown in the footer.</p>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-zinc-500">
        The company name, the website address and the navigation links are set by
        your developer — changing those affects more than wording.
      </p>
    </form>
  );
}
