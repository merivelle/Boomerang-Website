"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, X } from "lucide-react";
import { saveAbout } from "@/app/(admin)/admin/(app)/site-actions";
import {
  Button,
  ButtonAnchor,
  Card,
  CardBody,
  CardHeader,
  Field,
  FieldRow,
  PageTitle,
  SortableItem,
  SortableList,
  useToast,
} from "./ui";

export type AboutData = {
  founder: string;
  role: string;
  location: string;
  bio: string;
  creditsLead: string;
  credits: string[];
};

/** Stable keys, so dragging a row doesn't take its text with the wrong id. */
type Credit = { id: string; title: string };
let seq = 0;
const keyed = (titles: string[]): Credit[] =>
  titles.map((title) => ({ id: `c${seq++}`, title }));

export function AboutEditor({ data }: { data: AboutData }) {
  const router = useRouter();
  const toast = useToast();

  const [credits, setCredits] = useState<Credit[]>(() => keyed(data.credits));
  const [lead, setLead] = useState(data.creditsLead);
  const [bio, setBio] = useState(data.bio);
  const [founder, setFounder] = useState(data.founder);
  const [role, setRole] = useState(data.role);
  const [error, setError] = useState<string | null>(null);
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
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      setDirty(false);
      toast.success(
        res.staged ? "Saved. Publish when you're ready." : "Nothing changed since you last published.",
      );
      router.refresh();
    });
  }

  // The page joins these with commas, "and", then a full stop — so the preview
  // has to do the same or it isn't a preview.
  const titles = credits.map((c) => c.title).filter(Boolean);
  const sentence =
    titles.length > 0
      ? `${lead} ${titles
          .map((t, i, a) => t + (i < a.length - 2 ? ", " : i === a.length - 2 ? ", and " : "."))
          .join("")}`
      : lead;

  return (
    <form onSubmit={submit} onChange={() => setDirty(true)}>
      <PageTitle
        title="About"
        description="The company copy on the About page."
        action={
          <>
            <ButtonAnchor href="/api/admin/preview?to=/about" target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              Preview
            </ButtonAnchor>
            <Button type="submit" variant="primary" loading={pending}>
              Save
            </Button>
          </>
        }
      />

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Who" />
            <CardBody>
              <FieldRow cols="1fr 1fr 1fr">
                <Field label="Founder" required>
                  {({ id }) => (
                    <input
                      id={id}
                      name="founder"
                      required
                      value={founder}
                      onChange={(e) => setFounder(e.target.value)}
                      className="admin-input"
                    />
                  )}
                </Field>
                <Field label="Role">
                  {({ id }) => (
                    <input
                      id={id}
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="admin-input"
                    />
                  )}
                </Field>
                <Field label="Based in">
                  {({ id }) => (
                    <input
                      id={id}
                      name="location"
                      defaultValue={data.location}
                      className="admin-input"
                    />
                  )}
                </Field>
              </FieldRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The copy" />
            <CardBody className="space-y-5">
              <Field
                label="Biography"
                hint="The opening paragraph. Plain text — the website handles all the styling."
                required
              >
                {({ id }) => (
                  <textarea
                    id={id}
                    name="bio"
                    rows={6}
                    required
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="admin-input"
                  />
                )}
              </Field>

              <Field label="Credits lead-in" hint="The words that come before the list of films.">
                {({ id }) => (
                  <input
                    id={id}
                    name="credits_lead"
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    className="admin-input"
                  />
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Notable credits"
              description="Listed in this order, joined with commas and an “and”. Drag to reorder."
              action={
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    setCredits((v) => [...v, { id: `c${seq++}`, title: "" }]);
                    setDirty(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add a film
                </Button>
              }
            />
            <CardBody>
              <SortableList
                items={credits}
                onReorder={(next) => {
                  setCredits(next);
                  setDirty(true);
                }}
                className="space-y-2"
              >
                {(item, i) => (
                  <SortableItem key={item.id} id={item.id} className="flex items-center gap-2">
                    {({ grip }) => (
                      <>
                        {grip}
                        <span className="w-5 shrink-0 text-center font-mono text-[0.75rem] tabular-nums text-zinc-400">
                          {i + 1}
                        </span>
                        <input
                          name="credit"
                          value={item.title}
                          aria-label={`Film ${i + 1}`}
                          onChange={(e) => {
                            setCredits((v) =>
                              v.map((c) => (c.id === item.id ? { ...c, title: e.target.value } : c)),
                            );
                            setDirty(true);
                          }}
                          className="admin-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCredits((v) => v.filter((c) => c.id !== item.id));
                            setDirty(true);
                          }}
                          aria-label={`Remove ${item.title || `film ${i + 1}`}`}
                          className="shrink-0 rounded-md p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </SortableItem>
                )}
              </SortableList>

              {credits.length === 0 && (
                <p className="admin-hint py-4 text-center">
                  No films listed. The lead-in will read on its own.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Not a mockup of the page — a check on the words and the punctuation
            between the film titles, which is the bit that is easy to get wrong. */}
        <Card className="self-start lg:sticky lg:top-20">
          <CardHeader title="How it will read" />
          <CardBody>
            <div className="space-y-4 rounded-lg bg-zinc-900 p-5 text-zinc-100">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-zinc-500">
                {founder} · {role}
              </p>
              <p className="text-[0.9375rem] leading-relaxed">{bio}</p>
              <p className="text-[0.875rem] leading-relaxed text-zinc-400">{sentence}</p>
            </div>
            <p className="admin-hint mt-3">
              The real page uses the site&rsquo;s own type and spacing. This is only to check the
              words and the punctuation between the film titles.
            </p>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}
