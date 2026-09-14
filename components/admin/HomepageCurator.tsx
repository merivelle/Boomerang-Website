"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, ImageOff, Plus, Replace, X } from "lucide-react";
import {
  stageFeatured,
  stageHero,
} from "@/app/(admin)/admin/(app)/homepage/actions";
import { ProjectPicker, type Pick } from "./ProjectPicker";
import {
  Badge,
  Button,
  ButtonAnchor,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  IconButton,
  SortableItem,
  SortableList,
  cn,
  useToast,
} from "./ui";

export type { Pick };

/**
 * The hero is exactly six slots, not a free-form list. Six is structural: the
 * column layout is tuned for it, and the mobile wordmark is two triptychs of
 * three — so slots 1–3 and 4–6 are the two states it dissolves between, which
 * is why the grouping is drawn.
 */
function HeroPicker({ initial, options }: { initial: Pick[]; options: Pick[] }) {
  const router = useRouter();
  const toast = useToast();

  const [slots, setSlots] = useState<Array<string | null>>(() => {
    const s: Array<string | null> = initial.map((p) => p.slug);
    while (s.length < 6) s.push(null);
    return s.slice(0, 6);
  });
  const [picking, setPicking] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const byslug = new Map(options.map((o) => [o.slug, o]));
  const filled = slots.filter(Boolean) as string[];
  const complete = filled.length === 6;

  function save() {
    start(async () => {
      const res = await stageHero(filled);
      if (res.ok) {
        toast.success("Hero saved. Publish when you're ready.");
        router.refresh();
      } else {
        toast.error(res.error ?? "That didn't save.");
      }
    });
  }

  // Dragging reorders the six; the ids have to be stable and unique, and an
  // empty slot still has to be a drop target, so the index is part of the id.
  const dragItems = slots.map((slug, i) => ({ id: `slot-${i}`, slug, index: i }));

  return (
    <Card>
      <CardHeader
        title="Hero"
        description="The six films across the top of the homepage, left to right. Drag to reorder."
        action={
          <Button variant="primary" loading={pending} disabled={!complete} onClick={save}>
            Save hero
          </Button>
        }
      />

      <CardBody>
        {/* All six live in ONE grid so a film can be dragged from any slot to
            any other. The two states are labelled on the cards themselves
            rather than as headings above them, because a heading over a
            reorderable grid stops describing its row the moment anything
            moves. */}
        <SortableList
          items={dragItems}
          direction="grid"
          onReorder={(next) => setSlots(next.map((n) => n.slug))}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {(item) => (
            <SortableItem key={item.id} id={item.id} wholeCardDraggable className="rounded-lg">
              {() => (
                <HeroSlot
                  film={item.slug ? byslug.get(item.slug) : undefined}
                  index={item.index}
                  onReplace={() => setPicking(item.index)}
                  onClear={() =>
                    setSlots((v) => v.map((s, i) => (i === item.index ? null : s)))
                  }
                />
              )}
            </SortableItem>
          )}
        </SortableList>

        <p className="admin-hint mt-4">
          The homepage shows the first three at rest, then dissolves to the second three. On phones
          these same six become the image inside the BOOMERANG lettering, which is rebuilt
          automatically when you publish.
        </p>

        {!complete && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-800">
            The hero needs all six slots filled — {6 - filled.length} still empty.
          </p>
        )}
      </CardBody>

      <ProjectPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(slug) => setSlots((v) => v.map((s, i) => (i === picking ? slug : s)))}
        options={options}
        title="Choose a film for the hero"
        description="Only films that are on the website and have a poster can appear here."
        taken={filled}
        current={picking !== null ? slots[picking] : null}
      />
    </Card>
  );
}

function HeroSlot({
  film,
  index,
  onReplace,
  onClear,
}: {
  film: Pick | undefined;
  index: number;
  onReplace: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-white",
        film ? "border-zinc-200" : "border-dashed border-zinc-300",
      )}
    >
      <div className="relative aspect-video w-full bg-zinc-100">
        {film?.poster ? (
          <Image src={film.poster} alt="" fill sizes="220px" className="object-cover" />
        ) : (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onReplace}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[0.75rem]">Choose a film</span>
          </button>
        )}

        <span className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900/85 text-[0.6875rem] font-semibold tabular-nums text-white">
          {index + 1}
        </span>

        {film && (
          <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <span onPointerDown={(e) => e.stopPropagation()}>
              <IconButton
                size="sm"
                label="Choose a different film"
                onClick={onReplace}
                className="bg-white/95 text-zinc-700 shadow-sm hover:bg-white"
              >
                <Replace className="h-3.5 w-3.5" />
              </IconButton>
            </span>
            <span onPointerDown={(e) => e.stopPropagation()}>
              <IconButton
                size="sm"
                label="Empty this slot"
                onClick={onClear}
                className="bg-white/95 text-zinc-700 shadow-sm hover:bg-white hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </span>
          </div>
        )}
      </div>

      <div className="px-2.5 py-2">
        <p className="admin-eyebrow mb-1 text-[0.625rem]">
          {index < 3 ? "Shown at rest" : "Dissolves to this"}
        </p>
        <p className="truncate text-[0.8125rem] font-medium text-zinc-900">
          {film?.title ?? "Empty"}
        </p>
        <p className="truncate text-[0.75rem] text-zinc-500">
          {film ? (
            <>
              {film.studio} · <span className="tabular-nums">{film.year}</span>
            </>
          ) : (
            "Nothing chosen"
          )}
        </p>
      </div>
    </div>
  );
}

/** Selected Work is an ordered list — position is the row number on the page. */
function FeaturedPicker({ initial, options }: { initial: Pick[]; options: Pick[] }) {
  const router = useRouter();
  const toast = useToast();

  const [list, setList] = useState<string[]>(initial.map((p) => p.slug));
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const byslug = new Map(options.map((o) => [o.slug, o]));

  function save() {
    start(async () => {
      const res = await stageFeatured(list);
      if (res.ok) {
        toast.success("Selected Work saved. Publish when you're ready.");
        router.refresh();
      } else {
        toast.error(res.error ?? "That didn't save.");
      }
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Selected Work"
        description="The numbered list partway down the homepage, in this order. Drag the handle to move a film."
        action={
          <>
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Add work
            </Button>
            <Button variant="primary" loading={pending} disabled={!list.length} onClick={save}>
              Save list
            </Button>
          </>
        }
      />

      <CardBody>
        {list.length === 0 ? (
          <EmptyState
            icon={ImageOff}
            title="Nothing selected yet"
            description="Selected Work is the short, curated list on the homepage. Add the films that should lead."
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" />
                Add work
              </Button>
            }
          />
        ) : (
          <SortableList
            items={list.map((slug) => ({ id: slug }))}
            onReorder={(next) => setList(next.map((n) => n.id))}
            className="space-y-2"
          >
            {(item, i) => {
              const p = byslug.get(item.id);
              return (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2.5"
                >
                  {({ grip }) => (
                    <>
                      {grip}
                      <span className="w-6 shrink-0 text-center font-mono text-[0.75rem] tabular-nums text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                        {p?.poster && (
                          <Image src={p.poster} alt="" fill sizes="96px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] text-zinc-900">
                          {p?.title ?? item.id}
                        </p>
                        <p className="truncate text-[0.8125rem] text-zinc-500">
                          {p?.studio} · <span className="tabular-nums">{p?.year}</span>
                        </p>
                      </div>
                      <IconButton
                        size="sm"
                        label={`Remove ${p?.title ?? item.id} from Selected Work`}
                        onClick={() => setList((v) => v.filter((s) => s !== item.id))}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </IconButton>
                    </>
                  )}
                </SortableItem>
              );
            }}
          </SortableList>
        )}

        <p className="admin-hint mt-4">
          Films here play a short silent clip on hover if one has been prepared. Without one they
          show the poster instead, which is how the design expects it to look — nothing is missing.
        </p>
      </CardBody>

      <ProjectPicker
        open={adding}
        onClose={() => setAdding(false)}
        onPick={(slug) => setList((v) => [...v, slug])}
        options={options}
        title="Add to Selected Work"
        taken={list}
      />
    </Card>
  );
}

export function HomepageCurator({
  hero,
  featured,
  options,
  staged,
}: {
  hero: Pick[];
  featured: Pick[];
  options: Pick[];
  staged: boolean;
}) {
  return (
    <>
      {staged && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-[0.875rem] text-violet-900">
            <Badge tone="draft">Unpublished</Badge>{" "}
            <span className="ml-1">
              The homepage below is what you&rsquo;ve set up, not what visitors see yet.
            </span>
          </p>
          <div className="flex gap-2">
            <ButtonAnchor size="sm" href="/api/admin/preview?to=/" target="_blank" rel="noreferrer">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </ButtonAnchor>
            <Button size="sm" variant="primary" onClick={() => location.assign("/admin/publish")}>
              Review &amp; publish
            </Button>
          </div>
        </div>
      )}

      <HeroPicker initial={hero} options={options} />
      <FeaturedPicker initial={featured} options={options} />
    </>
  );
}
