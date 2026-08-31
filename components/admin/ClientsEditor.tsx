"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClient, reorderClients, saveClient } from "@/app/(admin)/admin/(app)/site-actions";

export type ClientRow = {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logo: string | null;
  published: boolean;
};
export type GroupRow = { id: string; label: string; clients: ClientRow[] };

export function ClientsEditor({
  groups,
  isDeveloper,
}: {
  groups: GroupRow[];
  isDeveloper: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ groupId: string; client: ClientRow | null } | null>(null);
  const [confirming, setConfirming] = useState<ClientRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const total = groups.reduce((n, g) => n + g.clients.length, 0);
  const withLogo = groups.reduce((n, g) => n + g.clients.filter((c) => c.logo).length, 0);

  function move(group: GroupRow, index: number, dir: -1 | 1) {
    const ids = group.clients.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    start(async () => {
      const res = await reorderClients(group.id, ids);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} on the client wall — {withLogo} with a logo, {total - withLogo} shown as text.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mt-6 rounded-md bg-zinc-100 px-4 py-3 text-xs leading-relaxed text-zinc-600">
        Clients without a logo appear as their name in type — that&rsquo;s a
        designed part of the wall, not something missing.{" "}
        {isDeveloper
          ? "As developer, you can add logo files directly."
          : "Logos have to be prepared to match the others, so ask your developer to add one."}
      </p>

      <div className="mt-8 space-y-10">
        {groups.map((group) => (
          <section key={group.id}>
            <div className="flex items-center gap-4">
              <h2 className="admin-label">{group.label}</h2>
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="font-mono text-xs tabular-nums text-zinc-400">
                {String(group.clients.length).padStart(2, "0")}
              </span>
              <button
                onClick={() => setEditing({ groupId: group.id, client: null })}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:border-zinc-400"
              >
                + Add
              </button>
            </div>

            <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
              {group.clients.map((c, i) => (
                <li key={c.id} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="relative flex h-8 w-24 shrink-0 items-center justify-center rounded bg-zinc-900/95">
                    {c.logo ? (
                      <Image src={c.logo} alt="" width={80} height={20} className="max-h-5 w-auto object-contain" />
                    ) : (
                      <span className="truncate px-1 text-[0.6rem] uppercase tracking-wider text-zinc-400">
                        {c.name}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${c.published ? "text-zinc-900" : "text-zinc-400"}`}>
                      {c.name}
                      {!c.published && <span className="ml-2 text-xs">· hidden</span>}
                    </p>
                    {c.websiteUrl && (
                      <p className="truncate text-xs text-zinc-500">{c.websiteUrl}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => move(group, i, -1)}
                      disabled={i === 0 || pending}
                      aria-label="Move up"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(group, i, 1)}
                      disabled={i === group.clients.length - 1 || pending}
                      aria-label="Move down"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setEditing({ groupId: group.id, client: c })}
                      className="ml-2 text-xs text-zinc-600 hover:text-zinc-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirming(c)}
                      className="ml-2 text-xs text-zinc-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {group.clients.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-zinc-500">Nothing in this group yet.</li>
              )}
            </ul>
          </section>
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

      {confirming && (
        <Dialog title="Remove this client?">
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            <strong className="text-zinc-900">{confirming.name}</strong> will come
            off the client wall. If you only want it gone for now, edit it and
            untick Visible instead.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setConfirming(null)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-400"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const c = confirming;
                setConfirming(null);
                start(async () => {
                  const res = await deleteClient(c.id);
                  if (!res.ok) setError(res.error);
                  router.refresh();
                });
              }}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function Dialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg text-zinc-900">{title}</h2>
        {children}
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
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog title={client ? "Edit client" : "Add client"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const res = await saveClient(client?.id ?? null, form);
            if (!res.ok) return setError(res.error);
            onSaved();
          });
        }}
        className="mt-4 space-y-4"
      >
        <div>
          <label className="admin-label mb-1.5 block">Name</label>
          <input name="name" required defaultValue={client?.name} autoFocus className="admin-input" />
        </div>

        <div>
          <label className="admin-label mb-1.5 block">Group</label>
          <select name="group_id" defaultValue={groupId} className="admin-input">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="admin-label mb-1.5 block">Website (optional)</label>
          <input
            name="website_url"
            type="url"
            placeholder="https://…"
            defaultValue={client?.websiteUrl ?? ""}
            className="admin-input"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="published"
            defaultChecked={client?.published ?? true}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Visible on the website
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
