"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteCategory,
  deleteTag,
  reorderCategories,
  reorderTags,
  saveCategory,
  saveTag,
} from "@/app/(admin)/admin/(app)/work/filters/actions";
import type { TaxRow } from "@/lib/cms/taxonomy";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  PageTitle,
  SortableItem,
  SortableList,
  Switch,
  cn,
  useToast,
} from "./ui";

export type FilterRow = TaxRow & { films: number };
type Kind = "category" | "tag";

const NOUN: Record<Kind, { one: string; many: string }> = {
  category: { one: "category", many: "categories" },
  tag: { one: "tag", many: "tags" },
};

/**
 * The buttons across the top of the Work page.
 *
 * Categories and tags are two lists to the database and, deliberately, two
 * lists here: a film has exactly one category, so removing one means saying
 * where its films go; a tag is extra, so it just comes off.
 */
export function FiltersEditor({ categories, tags }: { categories: FilterRow[]; tags: FilterRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = useState<{ kind: Kind; row: FilterRow | null } | null>(null);
  const [confirming, setConfirming] = useState<{ kind: Kind; row: FilterRow } | null>(null);
  const [pending, start] = useTransition();

  const liveCategories = categories.filter((c) => c.draft !== "removing");
  const buttons =
    liveCategories.length + tags.filter((t) => t.draft !== "removing" && t.showInFilters).length;

  function reorder(kind: Kind, ids: string[]) {
    start(async () => {
      const res = await (kind === "category" ? reorderCategories(ids) : reorderTags(ids));
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <PageTitle
        title="Work filters"
        description={`${buttons + 1} buttons across the top of the Work page, counting “All”.`}
        action={
          <ButtonLink href="/admin/work" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Work
          </ButtonLink>
        }
      />

      <p className="mt-5 rounded-lg bg-zinc-100 px-4 py-3 text-[0.8125rem] leading-relaxed text-zinc-600">
        Every film sits in exactly one <strong className="font-medium text-zinc-800">category</strong>.
        A <strong className="font-medium text-zinc-800">tag</strong> is extra — a list a film can be
        on as well, like Oscar Nominees. Drag to change the order the buttons read in. Nothing changes
        on the website until you publish.
      </p>

      <div className="mt-7 space-y-8">
        <FilterCard
          kind="category"
          rows={categories}
          onAdd={() => setEditing({ kind: "category", row: null })}
          onEdit={(row) => setEditing({ kind: "category", row })}
          onDelete={(row) => setConfirming({ kind: "category", row })}
          onReorder={(ids) => reorder("category", ids)}
          lastOne={liveCategories.length <= 1}
        />
        <FilterCard
          kind="tag"
          rows={tags}
          onAdd={() => setEditing({ kind: "tag", row: null })}
          onEdit={(row) => setEditing({ kind: "tag", row })}
          onDelete={(row) => setConfirming({ kind: "tag", row })}
          onReorder={(ids) => reorder("tag", ids)}
          lastOne={false}
        />
      </div>

      {editing && (
        <FilterDialog
          kind={editing.kind}
          row={editing.row}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {confirming?.kind === "tag" && (
        <ConfirmDialog
          open
          onClose={() => setConfirming(null)}
          busy={pending}
          title="Remove this tag?"
          confirmLabel="Remove it"
          body={
            <>
              <strong className="text-zinc-900">{confirming.row.label}</strong> will come off the
              Work filters when you publish.
              {confirming.row.films > 0 && (
                <>
                  {" "}
                  <strong className="text-zinc-900">
                    {confirming.row.films} {confirming.row.films === 1 ? "film is" : "films are"}
                  </strong>{" "}
                  tagged with it — the tag comes off them; the films themselves stay.
                </>
              )}
            </>
          }
          onConfirm={() => {
            const row = confirming.row;
            setConfirming(null);
            start(async () => {
              const res = await deleteTag(row.id);
              if (!res.ok) toast.error(res.error);
              else if (res.staged) toast.info(`${row.label} is queued for removal. Publish to apply it.`);
              else toast.info(`${row.label} is gone — it was never published.`);
              router.refresh();
            });
          }}
        />
      )}

      {confirming?.kind === "category" && (
        <RemoveCategoryDialog
          row={confirming.row}
          others={liveCategories.filter((c) => c.id !== confirming.row.id)}
          busy={pending}
          onClose={() => setConfirming(null)}
          onConfirm={(target) => {
            const row = confirming.row;
            setConfirming(null);
            start(async () => {
              const res = await deleteCategory(row.id, target);
              if (!res.ok) toast.error(res.error);
              else if (res.staged) toast.info(`${row.label} is queued for removal. Publish to apply it.`);
              else toast.info(`${row.label} is gone — it was never published.`);
              router.refresh();
            });
          }}
        />
      )}
    </>
  );
}

function FilterCard({
  kind,
  rows,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  lastOne,
}: {
  kind: Kind;
  rows: FilterRow[];
  onAdd: () => void;
  onEdit: (row: FilterRow) => void;
  onDelete: (row: FilterRow) => void;
  onReorder: (ids: string[]) => void;
  lastOne: boolean;
}) {
  const n = NOUN[kind];
  const showing = rows.filter((r) => r.draft !== "removing").length;

  return (
    <Card>
      <CardHeader
        title={kind === "category" ? "Categories" : "Tags"}
        description={
          kind === "category"
            ? `${showing} on the Work page — every film is in one of these.`
            : `${showing} — extra lists a film can also be on.`
        }
        action={
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        }
      />
      <CardBody>
        {rows.length === 0 ? (
          <EmptyState
            title={`No ${n.many} yet`}
            description={
              kind === "category"
                ? "Add the first category and films can be filed under it."
                : "Tags are optional. Add one to make an extra list, like award nominees."
            }
            action={
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4" />
                Add a {n.one}
              </Button>
            }
          />
        ) : (
          <SortableList items={rows} onReorder={(next) => onReorder(next.map((r) => r.id))} className="space-y-2">
            {(row, i) => (
              <SortableItem
                key={row.id}
                id={row.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-zinc-200 bg-white py-1.5 pl-1.5 pr-2",
                  row.draft === "removing" && "opacity-60",
                )}
              >
                {({ grip }) => (
                  <>
                    {grip}
                    <span className="w-5 shrink-0 text-center font-mono text-[0.75rem] tabular-nums text-zinc-400">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      <span
                        className={cn(
                          "font-mono text-[0.75rem] uppercase tracking-[0.14em] text-zinc-900",
                          row.draft === "removing" && "line-through",
                        )}
                      >
                        {row.label}
                      </span>
                      <span className="text-[0.75rem] text-zinc-500">
                        {row.films === 0 ? "No films" : row.films === 1 ? "1 film" : `${row.films} films`}
                      </span>
                      {kind === "tag" && !row.showInFilters && (
                        <Badge tone="neutral">No button</Badge>
                      )}
                      {row.draft === "new" && <Badge tone="draft">Not published yet</Badge>}
                      {row.draft === "edited" && <Badge tone="draft">Edited</Badge>}
                      {row.draft === "removing" && <Badge tone="danger">Removing</Badge>}
                    </div>
                    <span onPointerDown={(e) => e.stopPropagation()} className="flex shrink-0 gap-0.5">
                      <IconButton size="sm" label={`Edit ${row.label}`} onClick={() => onEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        size="sm"
                        label={
                          lastOne && row.draft !== "removing"
                            ? "The Work page needs at least one category"
                            : `Remove ${row.label}`
                        }
                        disabled={row.draft === "removing" || (lastOne && kind === "category")}
                        onClick={() => onDelete(row)}
                        className="hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </span>
                  </>
                )}
              </SortableItem>
            )}
          </SortableList>
        )}
      </CardBody>
    </Card>
  );
}

function FilterDialog({
  kind,
  row,
  onClose,
  onSaved,
}: {
  kind: Kind;
  row: FilterRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const n = NOUN[kind];

  return (
    <Dialog
      open
      onClose={onClose}
      title={row ? `Edit ${row.label}` : `Add a ${n.one}`}
      description="Nothing changes on the website until you publish."
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={() => formRef.current?.requestSubmit()}>
            Save
          </Button>
        </>
      }
    >
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const res = await (kind === "category" ? saveCategory : saveTag)(row?.id ?? null, form);
            if (!res.ok) return setError(res.error);
            toast.success(res.staged ? "Saved. Publish when you're ready." : "Nothing changed.");
            onSaved();
          });
        }}
        className="space-y-5"
      >
        <Field
          label="Name"
          hint={
            row
              ? "Shown in capitals on the Work page. Renaming keeps the same web address."
              : "Shown in capitals on the Work page, so keep it short."
          }
          required
        >
          {({ id }) => (
            <input
              id={id}
              name="label"
              required
              autoFocus
              defaultValue={row?.label}
              placeholder={kind === "category" ? "e.g. Documentary" : "e.g. Award winners"}
              className="admin-input"
            />
          )}
        </Field>

        {kind === "tag" && (
          <div className="border-t border-zinc-100 pt-5">
            <Switch
              name="show_in_filters"
              defaultChecked={row?.showInFilters ?? true}
              label="Show as a button on the Work page"
              hint="Turn this off to keep the tag on films without giving it a filter button."
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-[0.8125rem] text-red-700">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}

/**
 * Removing a category that films are in is a two-part decision — the films
 * need somewhere to go — so this is its own dialog rather than a plain confirm.
 */
function RemoveCategoryDialog({
  row,
  others,
  busy,
  onClose,
  onConfirm,
}: {
  row: FilterRow;
  others: FilterRow[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (target: string | null) => void;
}) {
  const [target, setTarget] = useState("");
  const needsTarget = row.films > 0;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Remove this category?"
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            disabled={needsTarget && !target}
            onClick={() => onConfirm(needsTarget ? target : null)}
          >
            {needsTarget ? "Remove and move the films" : "Remove it"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-[0.9375rem] leading-relaxed text-zinc-600">
        <p>
          <strong className="text-zinc-900">{row.label}</strong> will come off the Work filters when
          you publish.
        </p>
        {needsTarget && (
          <>
            <p>
              <strong className="text-zinc-900">
                {row.films} {row.films === 1 ? "film uses" : "films use"} it.
              </strong>{" "}
              Every film needs a category, so choose where they should go:
            </p>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Move the films to"
              className="admin-input"
            >
              <option value="">Choose a category…</option>
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.draft === "new" ? " (not on website yet)" : ""}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </Dialog>
  );
}
