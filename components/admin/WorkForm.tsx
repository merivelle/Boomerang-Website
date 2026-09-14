"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Loader2,
  Search,
} from "lucide-react";
import { saveWork } from "@/app/(admin)/admin/(app)/work/actions";
import { PosterUploader } from "./PosterUploader";
import {
  Badge,
  Button,
  ButtonAnchor,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Field,
  FieldRow,
  Switch,
  Tabs,
  cn,
  useToast,
} from "./ui";

export type WorkFormData = {
  slug: string | null;
  /** True for a credit that has never been published. */
  isNew: boolean;
  hasDraft: boolean;
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
  focal: { x: number; y: number } | null;
  seoTitle: string;
  seoDescription: string;
};

const TABS = [
  { id: "basics", label: "Basics", icon: Info },
  { id: "media", label: "Poster", icon: ImageIcon },
  { id: "placement", label: "Where it appears", icon: LayoutGrid },
  { id: "seo", label: "Search & sharing", icon: Search },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AUTOSAVE_MS = 1200;

export function WorkForm({
  data,
  categories,
  tags,
  roleSuggestions,
  studioSuggestions,
}: {
  data: WorkFormData;
  categories: Array<{ id: string; label: string; draft?: "new" | "edited" | "removing" | null }>;
  tags: Array<{ id: string; label: string; draft?: "new" | "edited" | "removing" | null }>;
  roleSuggestions: string[];
  studioSuggestions: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tab, setTab] = useState<TabId>("basics");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [pending, start] = useTransition();

  // Losing a half-typed credit to a stray back-swipe is the kind of thing that
  // stops someone trusting the tool.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const submit = useCallback(
    (opts: { silent: boolean }) => {
      const form = formRef.current;
      if (!form) return;
      const payload = new FormData(form);

      setError(null);
      setState("saving");

      start(async () => {
        const res = await saveWork(data.slug, payload);

        if (!res.ok) {
          setState("idle");
          setError(res.error);
          if (!opts.silent) {
            toast.error(res.error);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }

        setDirty(false);
        setState("saved");

        if (!data.slug) {
          // The first save of a new credit gives it a web address, so the URL
          // has to follow or the next save would create a second one.
          toast.success("Saved. It won't be on the website until you publish.");
          router.replace(`/admin/work/${res.slug}`);
        } else {
          router.refresh();
          if (!opts.silent) toast.success("Saved. Publish when you're ready.");
        }
      });
    },
    [data.slug, router, toast],
  );

  // Autosave, but only once the credit exists. Before that there is nothing to
  // attach a keystroke to, and a title typed one letter at a time would create
  // six abandoned credits called "T", "Th", "The"…
  const onChange = useCallback(() => {
    setDirty(true);
    setState("idle");
    if (!data.slug) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => submit({ silent: true }), AUTOSAVE_MS);
  }, [data.slug, submit]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        submit({ silent: false });
      }}
      onChange={onChange}
      onInput={onChange}
    >
      {/* ------------------------------------------------------------- header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/admin/work"
            className="inline-flex items-center gap-1.5 text-[0.8125rem] text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All work
          </Link>
          <h1 className="admin-h1 mt-2 flex flex-wrap items-center gap-2.5">
            {data.slug ? data.title || "Untitled credit" : "Add work"}
            {data.isNew && <Badge tone="draft">Not published yet</Badge>}
            {!data.isNew && data.hasDraft && <Badge tone="draft">Edited</Badge>}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <SaveState state={state} dirty={dirty} autosaves={Boolean(data.slug)} />
          <Button type="submit" variant="primary" loading={pending}>
            Save
          </Button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
        >
          {error}
        </p>
      )}

      {!data.slug && (
        <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-[0.875rem] leading-relaxed text-zinc-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          Fill in the basics and press Save. You can add the poster straight after — and nothing
          reaches the website until you publish.
        </p>
      )}

      <Tabs className="mt-6" tabs={TABS} value={tab} onChange={setTab} />

      {/* ------------------------------------------------------------- basics */}
      <Panel show={tab === "basics"}>
        <Card>
          <CardHeader title="The credit" description="How this film reads across the site." />
          <CardBody className="space-y-5">
            <Field label="Project title" hint="As it should appear on the website." required>
              {({ id }) => (
                <input id={id} name="title" required defaultValue={data.title} className="admin-input" />
              )}
            </Field>

            <FieldRow cols="1fr 9rem">
              <Field label="Client / studio" hint="Universal, Netflix, Marvel…" required>
                {({ id }) => (
                  <>
                    <input
                      id={id}
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
                  </>
                )}
              </Field>

              <Field label="Year" required>
                {({ id }) => (
                  <input
                    id={id}
                    name="year"
                    required
                    inputMode="numeric"
                    defaultValue={data.year}
                    className="admin-input"
                  />
                )}
              </Field>
            </FieldRow>

            <FieldRow>
              <Field
                label="Category"
                hint={
                  <>
                    Where it sits in the Work filters.{" "}
                    <Link href="/admin/work/filters" className="underline underline-offset-2 hover:text-zinc-900">
                      Add or rename categories
                    </Link>
                  </>
                }
                required
              >
                {({ id }) => (
                  <select
                    id={id}
                    name="category_id"
                    defaultValue={data.categoryId}
                    required
                    className="admin-input"
                  >
                    <option value="">Choose…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                        {c.draft === "new" ? " (not on website yet)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field
                label="Type of work"
                hint="Trailer Campaign, Scoring, Sound Design…"
                required
              >
                {({ id }) => (
                  <>
                    <input
                      id={id}
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
                  </>
                )}
              </Field>
            </FieldRow>

            <Field
              label="Trailer link"
              hint="A YouTube link makes the poster clickable. Leave blank if there's nothing to watch."
            >
              {({ id }) => (
                <input
                  id={id}
                  name="trailer_url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=…"
                  defaultValue={data.trailerUrl}
                  className="admin-input"
                />
              )}
            </Field>

            {tags.length > 0 && (
              <Field label="Tags" hint="Extra lists this credit can turn up in.">
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {tags.map((t) => (
                    <Checkbox
                      key={t.id}
                      name="tags"
                      value={t.id}
                      label={`${t.label}${t.draft === "new" ? " (not on website yet)" : ""}`}
                      defaultChecked={data.tagIds.includes(t.id)}
                    />
                  ))}
                </div>
              </Field>
            )}
          </CardBody>
        </Card>
      </Panel>

      {/* -------------------------------------------------------------- media */}
      <Panel show={tab === "media"}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <PosterUploader
            slug={data.slug}
            poster={data.poster}
            hasRealPoster={data.hasRealPoster}
            focal={data.focal}
          />

          <Card>
            <CardHeader title="What makes a good poster" />
            <CardBody>
              <ul className="space-y-3 text-[0.875rem] leading-relaxed text-zinc-600">
                <Tip>
                  Use a <strong className="text-zinc-900">wide frame from the trailer</strong>, not a
                  tall cinema poster. Anything roughly between 4:3 and 21:9 works.
                </Tip>
                <Tip>
                  Aim for <strong className="text-zinc-900">1600 pixels wide or more</strong>. Big
                  files are fine — they&rsquo;re resized and compressed automatically.
                </Tip>
                <Tip>
                  Once it&rsquo;s uploaded,{" "}
                  <strong className="text-zinc-900">click the part that must stay in frame</strong>.
                  The site crops this image differently on a phone and on a desktop, and that click
                  is what decides which bit survives the crop.
                </Tip>
                <Tip>
                  Without a poster the credit stays hidden from the website, whatever the switches
                  on the next tab say.
                </Tip>
              </ul>
            </CardBody>
          </Card>
        </div>
      </Panel>

      {/* ---------------------------------------------------------- placement */}
      <Panel show={tab === "placement"}>
        <Card>
          <CardHeader
            title="Where this appears"
            description="Each switch puts the film in one specific place on the site."
          />
          <CardBody className="space-y-6">
            <Switch
              name="published"
              defaultChecked={data.published}
              label="Show on the website"
              hint="Turn this off to take it down without losing anything. It stays here, and everything you've typed is kept."
            />

            <div className="border-t border-zinc-100 pt-6">
              <Switch
                name="featured"
                defaultChecked={data.featured}
                disabled={!data.hasRealPoster}
                label="Include in Selected Work"
                hint="The numbered list partway down the homepage. New films go to the bottom — the Homepage screen is where you set the order."
                disabledReason="Add a poster first — Selected Work is a picture list."
              />
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-0.5",
                    data.inHero ? "bg-zinc-900" : "bg-zinc-200",
                  )}
                >
                  <span
                    className={cn(
                      "h-[18px] w-[18px] rounded-full bg-white shadow-sm",
                      data.inHero ? "translate-x-4" : "",
                    )}
                  />
                </span>
                <div>
                  <p className="text-[0.875rem] font-medium text-zinc-900">
                    In the homepage hero
                  </p>
                  <p className="admin-hint mt-0.5">
                    {data.inHero
                      ? "This is one of the six films across the top of the homepage."
                      : "The hero is exactly six films, chosen together."}{" "}
                    <Link
                      href="/admin/homepage"
                      className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                    >
                      Change them on the Homepage screen
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </Panel>

      {/* ---------------------------------------------------------------- seo */}
      <Panel show={tab === "seo"}>
        <Card>
          <CardHeader
            title="How this credit reads in Google"
            description="Both are optional. Left blank, sensible wording is written from the film's own details."
            action={
              data.slug && !data.isNew ? (
                <ButtonAnchor
                  size="sm"
                  href={`/work/${data.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View page
                  <ExternalLink className="h-3.5 w-3.5" />
                </ButtonAnchor>
              ) : null
            }
          />
          <CardBody className="space-y-5">
            <Field
              label="Page title"
              hint="Leave blank to use the film's title."
            >
              {({ id }) => (
                <input id={id} name="seo_title" defaultValue={data.seoTitle} className="admin-input" />
              )}
            </Field>

            <Field
              label="Page description"
              hint="One or two sentences. Leave blank and one is written from the client, year and type of work."
            >
              {({ id }) => (
                <textarea
                  id={id}
                  name="seo_description"
                  rows={3}
                  defaultValue={data.seoDescription}
                  className="admin-input"
                />
              )}
            </Field>
          </CardBody>
        </Card>
      </Panel>
    </form>
  );
}

// ---------------------------------------------------------------- fragments --

/**
 * Panels stay mounted and are hidden with CSS rather than unmounted. They are
 * one <form>, so a field on a tab nobody opened still has to post — switching to
 * Poster and back must not silently blank the year.
 */
function Panel({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("mt-5", !show && "hidden")} aria-hidden={!show}>
      {children}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

function SaveState({
  state,
  dirty,
  autosaves,
}: {
  state: "idle" | "saving" | "saved";
  dirty: boolean;
  autosaves: boolean;
}) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );

  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        Saved
      </span>
    );

  if (dirty)
    return (
      <span className="text-[0.8125rem] text-zinc-500">
        {autosaves ? "Saving in a moment…" : "Not saved yet"}
      </span>
    );

  return null;
}
