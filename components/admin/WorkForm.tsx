"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWork } from "@/app/(admin)/admin/(app)/work/actions";

export type WorkFormData = {
  slug: string | null;
  title: string;
  studio: string;
  year: number | "";
  role: string;
  categoryId: string;
  trailerUrl: string;
  published: boolean;
  featured: boolean;
  inHero: boolean;
  tagIds: string[];
  poster: string | null;
  hasRealPoster: boolean;
};

export function WorkForm({
  data,
  categories,
  tags,
  roleSuggestions,
  studioSuggestions,
}: {
  data: WorkFormData;
  categories: Array<{ id: string; label: string }>;
  tags: Array<{ id: string; label: string }>;
  roleSuggestions: string[];
  studioSuggestions: string[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  // Losing a half-typed credit to a stray back-swipe is the kind of thing that
  // stops someone trusting the tool.
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
      const res = await saveWork(data.slug, form);
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setDirty(false);
      setSaved(true);
      if (!data.slug) router.replace(`/admin/work/${res.slug}`);
      else router.refresh();
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} onChange={() => setDirty(true)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/work" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← All work
          </Link>
          <h1 className="mt-2 text-2xl tracking-[-0.02em] text-zinc-900">
            {data.slug ? data.title || "Edit credit" : "Add work"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-700">Saved</span>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        {/* ---- the fields ---- */}
        <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6">
          <Field label="Project title" hint="As it should appear on the website.">
            <input name="title" required defaultValue={data.title} className="admin-input" />
          </Field>

          <div className="grid gap-6 sm:grid-cols-[1fr_8rem]">
            <Field label="Client / studio" hint="Universal, Netflix, Marvel…">
              <input
                name="studio"
                required
                list="studios"
                defaultValue={data.studio}
                className="admin-input"
              />
              <datalist id="studios">
                {studioSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>

            <Field label="Year">
              <input
                name="year"
                required
                inputMode="numeric"
                defaultValue={data.year}
                className="admin-input"
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Category" hint="Where it sits in the Work filters.">
              <select name="category_id" defaultValue={data.categoryId} required className="admin-input">
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Type of work" hint="Trailer Campaign, Scoring, Sound Design…">
              <input
                name="role"
                required
                list="roles"
                defaultValue={data.role}
                className="admin-input"
              />
              <datalist id="roles">
                {roleSuggestions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>
          </div>

          {tags.length > 0 && (
            <Field label="Tags" hint="Extra lists a credit can appear in.">
              <div className="flex flex-wrap gap-4 pt-1">
                {tags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      name="tags"
                      value={t.id}
                      defaultChecked={data.tagIds.includes(t.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </Field>
          )}

          <Field
            label="Trailer link"
            hint="A YouTube link makes the poster clickable. Leave blank if there's nothing to watch."
          >
            <input
              name="trailer_url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              defaultValue={data.trailerUrl}
              className="admin-input"
            />
          </Field>
        </div>

        {/* ---- poster + visibility ---- */}
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="admin-label">Poster</p>
            <div className="relative mt-3 aspect-video w-full overflow-hidden rounded bg-zinc-100">
              {data.poster && (
                <Image
                  src={data.poster}
                  alt=""
                  fill
                  sizes="288px"
                  className={`object-cover ${data.hasRealPoster ? "" : "opacity-50"}`}
                />
              )}
              {!data.poster && (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                  No poster yet
                </div>
              )}
            </div>

            {data.hasRealPoster ? (
              <p className="mt-3 text-xs text-zinc-500">
                This credit has a poster and can appear on the site.
              </p>
            ) : (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                Without a poster this credit stays hidden from the website. You
                can still fill everything in and save.
              </p>
            )}

            <p className="mt-3 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-500">
              Uploading is not switched on yet — ask your developer to add the
              image for now.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
            <p className="admin-label">Visibility</p>

            <Toggle
              name="published"
              defaultChecked={data.published}
              label="Published"
              hint="Uncheck to take it off the website without deleting it."
            />

            <Toggle
              name="featured"
              defaultChecked={data.featured}
              disabled={!data.hasRealPoster}
              label="Show in Selected Work"
              hint={
                data.hasRealPoster
                  ? "The short list on the homepage."
                  : "Needs a poster first."
              }
            />

            {data.inHero && (
              <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600">
                This credit is one of the six in the homepage hero. Hiding it
                would leave a gap, so remove it from the hero first.
              </p>
            )}
          </div>

          {data.slug && (
            <a
              href={`/work`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-center text-sm text-zinc-700 transition-colors hover:border-zinc-400"
            >
              View on the site ↗
            </a>
          )}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="admin-label mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`flex gap-3 ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
      />
      <span>
        <span className="block text-sm text-zinc-900">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}
