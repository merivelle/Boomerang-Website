"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageUp, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { deleteClient, reorderClients, saveClient } from "@/app/(admin)/admin/(app)/site-actions";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  PageTitle,
  SortableItem,
  SortableList,
  Switch,
  cn,
  useToast,
} from "./ui";

export type ClientRow = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logo: string | null;
  published: boolean;
  /** Set when this client has unpublished edits waiting. */
  draft: "new" | "edited" | "removing" | null;
};
export type GroupRow = { id: string; label: string; clients: ClientRow[] };

export function ClientsEditor({ groups }: { groups: GroupRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = useState<{ groupId: string; client: ClientRow | null } | null>(null);
  const [confirming, setConfirming] = useState<ClientRow | null>(null);
  const [pending, start] = useTransition();

  const total = groups.reduce((n, g) => n + g.clients.length, 0);
  const withLogo = groups.reduce((n, g) => n + g.clients.filter((c) => c.logo).length, 0);

  function reorder(group: GroupRow, ids: string[]) {
    start(async () => {
      const res = await reorderClients(group.id, ids);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <PageTitle
        title="Clients"
        description={`${total} on the client wall — ${withLogo} with a logo, ${total - withLogo} shown as their name in type.`}
      />

      <p className="mt-5 rounded-lg bg-zinc-100 px-4 py-3 text-[0.8125rem] leading-relaxed text-zinc-600">
        A client without a logo appears as their name set in type. That&rsquo;s a designed part of
        the wall, not something missing — but you can add a logo any time. White logo on a
        transparent background works best: a PNG or an SVG.
      </p>

      <div className="mt-7 space-y-8">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader
              title={group.label}
              description={
                group.clients.length === 1 ? "1 client" : `${group.clients.length} clients`
              }
              action={
                <Button size="sm" onClick={() => setEditing({ groupId: group.id, client: null })}>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              }
            />
            <CardBody>
              {group.clients.length === 0 ? (
                <EmptyState
                  title="Nothing in this group yet"
                  description="Add the first client and it will show up on the wall."
                  action={
                    <Button onClick={() => setEditing({ groupId: group.id, client: null })}>
                      <Plus className="h-4 w-4" />
                      Add a client
                    </Button>
                  }
                />
              ) : (
                <SortableList
                  items={group.clients.map((c) => ({ id: c.id }))}
                  direction="grid"
                  onReorder={(next) => reorder(group, next.map((n) => n.id))}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                >
                  {(item) => {
                    const c = group.clients.find((x) => x.id === item.id)!;
                    return (
                      <SortableItem key={c.id} id={c.id} wholeCardDraggable className="rounded-lg">
                        {() => (
                          <ClientCard
                            c={c}
                            onEdit={() => setEditing({ groupId: group.id, client: c })}
                            onDelete={() => setConfirming(c)}
                          />
                        )}
                      </SortableItem>
                    );
                  }}
                </SortableList>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {editing && (
        <ClientDialog
          groupId={editing.groupId}
          client={editing.client}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        busy={pending}
        title="Remove this client?"
        confirmLabel="Remove it"
        body={
          <>
            <strong className="text-zinc-900">{confirming?.name}</strong> will come off the client
            wall when you publish. If you only want it gone for now, edit it and turn off
            &ldquo;Show on the website&rdquo; instead — that keeps the logo and the link.
          </>
        }
        onConfirm={() => {
          const c = confirming;
          setConfirming(null);
          if (!c) return;
          start(async () => {
            const res = await deleteClient(c.id);
            if (res.ok) toast.info(`${c.name} is queued for removal. Publish to apply it.`);
            else toast.error(res.error);
            router.refresh();
          });
        }}
      />
    </>
  );
}

function ClientCard({
  c,
  onEdit,
  onDelete,
}: {
  c: ClientRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-zinc-200 bg-white",
        !c.published && "opacity-60",
      )}
    >
      {/* The logos are white marks, so they need their own dark ground to be
          judged at all — the same ground the public wall gives them. */}
      <div className="admin-logo-chip relative h-20 w-full">
        {c.logo ? (
          <Image src={c.logo} alt="" fill sizes="200px" className="object-contain p-4" />
        ) : (
          <span className="px-3 text-center text-[0.6875rem] uppercase tracking-[0.12em] text-zinc-400">
            {c.name}
          </span>
        )}

        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <span onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${c.name}`}
              title="Edit"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-zinc-700 shadow-sm transition-colors hover:bg-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </span>
          <span onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Remove ${c.name}`}
              title="Remove"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-zinc-700 shadow-sm transition-colors hover:bg-white hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <p className="truncate text-[0.875rem] font-medium text-zinc-900">{c.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {!c.published && <Badge tone="neutral">Hidden</Badge>}
          {c.draft === "new" && <Badge tone="draft">Not published yet</Badge>}
          {c.draft === "edited" && <Badge tone="draft">Edited</Badge>}
          {c.draft === "removing" && <Badge tone="danger">Removing</Badge>}
          {c.websiteUrl && !c.draft && (
            <span className="truncate text-[0.75rem] text-zinc-500">
              {c.websiteUrl.replace(/^https?:\/\/(www\.)?/, "")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientDialog({
  groupId,
  client,
  groups,
  onClose,
  onSaved,
}: {
  groupId: string;
  client: ClientRow | null;
  groups: GroupRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState(client?.logo ?? null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function uploadLogo(file: File) {
    if (!client) {
      setError("Save the client first, then add its logo.");
      return;
    }
    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);
    body.append("kind", "logo");
    body.append("target", `client:${client.id}`);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "That didn't upload. Try again.");
        return;
      }
      toast.success("Logo added. Publish when you're ready.");
      router.refresh();
      onSaved();
    } catch {
      setError("The upload didn't finish. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={client ? `Edit ${client.name}` : "Add a client"}
      description="Nothing changes on the website until you publish."
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() => formRef.current?.requestSubmit()}
          >
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
            const res = await saveClient(client?.id ?? null, form);
            if (!res.ok) return setError(res.error);
            toast.success(
              res.staged ? "Saved. Publish when you're ready." : "Nothing changed.",
            );
            onSaved();
          });
        }}
        className="space-y-5"
      >
        <Field label="Name" required>
          {({ id }) => (
            <input
              id={id}
              name="name"
              required
              autoFocus
              defaultValue={client?.name}
              className="admin-input"
            />
          )}
        </Field>

        <Field label="Group" hint="Which heading it sits under on the client page.">
          {({ id }) => (
            <select id={id} name="group_id" defaultValue={groupId} className="admin-input">
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Website"
          hint="Optional. Kept on file — the wall itself doesn't currently link out."
        >
          {({ id }) => (
            <input
              id={id}
              name="website_url"
              type="url"
              placeholder="https://…"
              defaultValue={client?.websiteUrl ?? ""}
              className="admin-input"
            />
          )}
        </Field>

        <Field
          label="Logo"
          hint="A white logo on a transparent background — PNG or SVG. Without one the client shows as their name in type, which is a designed option, not a fallback."
        >
          <div className="flex items-center gap-3">
            <div className="admin-logo-chip relative h-16 w-32 shrink-0">
              {logo ? (
                <Image src={logo} alt="" fill sizes="128px" className="object-contain p-3" />
              ) : (
                <ImageUp className="h-4 w-4 text-zinc-600" />
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900/70">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                loading={uploading}
                disabled={!client}
                onClick={() => fileRef.current?.click()}
              >
                {!uploading && <Upload className="h-3.5 w-3.5" />}
                {logo ? "Replace logo" : "Upload a logo"}
              </Button>
              {!client && (
                <p className="admin-hint mt-1.5">Save the client first, then add its logo.</p>
              )}
            </div>
          </div>
        </Field>

        <div className="border-t border-zinc-100 pt-5">
          <Switch
            name="published"
            defaultChecked={client?.published ?? true}
            label="Show on the website"
            hint="Turn this off to take it off the wall without losing the logo or the link."
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-[0.8125rem] text-red-700">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
