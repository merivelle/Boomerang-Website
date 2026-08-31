"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setInquiryStatus } from "@/app/(admin)/admin/(app)/messages/actions";

export type Message = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: string;
  status: "new" | "read" | "replied" | "archived" | "spam";
};

const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "replied", label: "Replied" },
  { key: "archived", label: "Archived" },
] as const;

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function Inbox({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("inbox");
  const [open, setOpen] = useState<Message | null>(null);
  const [pending, start] = useTransition();

  const shown = messages.filter((m) =>
    tab === "inbox"
      ? m.status === "new" || m.status === "read"
      : tab === "replied"
        ? m.status === "replied"
        : m.status === "archived" || m.status === "spam",
  );
  const unread = messages.filter((m) => m.status === "new").length;

  function mark(m: Message, status: Message["status"]) {
    start(async () => {
      await setInquiryStatus(m.id, status);
      router.refresh();
    });
  }

  function openMessage(m: Message) {
    setOpen(m);
    if (m.status === "new") mark(m, "read");
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-[-0.02em] text-zinc-900">Messages</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enquiries from the contact form. Every one is also emailed to you.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
            {t.key === "inbox" && unread > 0 && (
              <span className="ml-2 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[0.65rem] text-white">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {shown.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => openMessage(m)}
              className="flex w-full items-baseline gap-4 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
            >
              <span
                aria-hidden
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  m.status === "new" ? "bg-zinc-900" : "bg-transparent"
                }`}
              />
              <span className="w-40 shrink-0 truncate text-sm text-zinc-900">{m.name}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">
                {m.subject ? `${m.subject} — ` : ""}
                {m.message}
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">{when(m.createdAt)}</span>
            </button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-4 py-12 text-center text-sm text-zinc-500">
            {tab === "inbox" ? "No new messages." : "Nothing here."}
          </li>
        )}
      </ul>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 px-6 py-10">
          <div className="flex max-h-full w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-6">
              <div className="min-w-0">
                <p className="text-lg text-zinc-900">{open.subject || "Enquiry"}</p>
                <p className="mt-1 truncate text-sm text-zinc-600">
                  {open.name} · <span className="text-zinc-500">{open.email}</span>
                </p>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">
                  {new Date(open.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="shrink-0 rounded px-2 py-1 text-zinc-400 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                {open.message}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 p-4">
              <div className="flex gap-2">
                <button
                  disabled={pending}
                  onClick={() => {
                    mark(open, "archived");
                    setOpen(null);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400"
                >
                  Archive
                </button>
                <button
                  disabled={pending}
                  onClick={() => {
                    mark(open, "spam");
                    setOpen(null);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:border-zinc-400"
                >
                  Spam
                </button>
              </div>

              {/* Opens their own mail app rather than sending from the site, so
                  the reply lands in their sent folder where they expect it. */}
              <a
                href={`mailto:${open.email}?subject=${encodeURIComponent(
                  `Re: ${open.subject || "Your enquiry"}`,
                )}&body=${encodeURIComponent(`\n\n— \n\nOn ${new Date(open.createdAt).toLocaleDateString()}, ${open.name} wrote:\n${open.message.replace(/^/gm, "> ")}`)}`}
                onClick={() => {
                  mark(open, "replied");
                  setOpen(null);
                }}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Reply
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
