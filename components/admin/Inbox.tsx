"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Copy, Mail, Reply, Search, Ban } from "lucide-react";
import { setInquiryStatus } from "@/app/(admin)/admin/(app)/messages/actions";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  FilterTabs,
  PageTitle,
  cn,
  useToast,
} from "./ui";

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
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "archived", label: "Archived" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function inTab(m: Message, tab: TabId) {
  if (tab === "new") return m.status === "new";
  if (tab === "read") return m.status === "read" || m.status === "replied";
  return m.status === "archived" || m.status === "spam";
}

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
  const toast = useToast();

  const [tab, setTab] = useState<TabId>("new");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Message | null>(null);
  const [pending, start] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return messages.filter((m) => {
      if (!inTab(m, tab)) return false;
      if (!needle) return true;
      return `${m.name} ${m.email} ${m.subject ?? ""} ${m.message}`.toLowerCase().includes(needle);
    });
  }, [messages, tab, q]);

  const counts = {
    new: messages.filter((m) => inTab(m, "new")).length,
    read: messages.filter((m) => inTab(m, "read")).length,
    archived: messages.filter((m) => inTab(m, "archived")).length,
  };

  function mark(m: Message, status: Message["status"]) {
    start(async () => {
      await setInquiryStatus(m.id, status);
      router.refresh();
    });
  }

  function openMessage(m: Message) {
    setOpen(m);
    // Opening it IS reading it. Making someone press a second button to say so
    // is the kind of busywork that leaves an inbox permanently "unread".
    if (m.status === "new") mark(m, "read");
  }

  return (
    <>
      <PageTitle
        title="Messages"
        description="Enquiries from the contact form. Every one is also emailed to you, so this is a record rather than the only copy."
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <FilterTabs
          tabs={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
          value={tab}
          onChange={setTab}
          className="flex-1"
        />
        <div className="relative w-full sm:w-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
            className="admin-input pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Mail}
            title={
              q
                ? "No messages match"
                : tab === "new"
                  ? "No new messages"
                  : tab === "read"
                    ? "Nothing read yet"
                    : "Nothing archived"
            }
            description={
              q
                ? "Try a different search."
                : tab === "new"
                  ? "When someone fills in the contact form, it lands here — and in your email."
                  : undefined
            }
          />
        </div>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <ul className="divide-y divide-zinc-100">
            {shown.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => openMessage(m)}
                  className="flex w-full items-baseline gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      m.status === "new" ? "bg-blue-600" : "bg-transparent",
                    )}
                  />
                  <span
                    className={cn(
                      "w-40 shrink-0 truncate text-[0.9375rem]",
                      m.status === "new" ? "font-medium text-zinc-900" : "text-zinc-800",
                    )}
                  >
                    {m.name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] text-zinc-500">
                    {m.subject && <span className="text-zinc-700">{m.subject} — </span>}
                    {m.message}
                  </span>
                  {m.status === "replied" && (
                    <span className="shrink-0 text-[0.75rem] text-emerald-700">Replied</span>
                  )}
                  <span className="shrink-0 font-mono text-[0.75rem] text-zinc-400">
                    {when(m.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {open && (
        <Dialog
          open
          onClose={() => setOpen(null)}
          title={open.subject || "Enquiry"}
          description={`${open.name} · ${open.email} · ${new Date(open.createdAt).toLocaleString()}`}
          size="lg"
          footer={
            <>
              <Button
                disabled={pending}
                onClick={() => {
                  mark(open, "archived");
                  setOpen(null);
                  toast.info("Archived.");
                }}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  mark(open, "spam");
                  setOpen(null);
                  toast.info("Marked as spam.");
                }}
              >
                <Ban className="h-4 w-4" />
                Spam
              </Button>
              <div className="flex-1" />
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(open.email);
                  toast.success("Email address copied.");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy address
              </Button>
              {/* Opens their own mail app rather than sending from the site, so
                  the reply lands in their sent folder where they expect it. */}
              <a
                href={`mailto:${open.email}?subject=${encodeURIComponent(
                  `Re: ${open.subject || "Your enquiry"}`,
                )}&body=${encodeURIComponent(
                  `\n\n— \n\nOn ${new Date(open.createdAt).toLocaleDateString()}, ${open.name} wrote:\n${open.message.replace(/^/gm, "> ")}`,
                )}`}
                onClick={() => {
                  mark(open, "replied");
                  setOpen(null);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-[0.875rem] font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
              >
                <Reply className="h-4 w-4" />
                Reply
              </a>
            </>
          }
        >
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-zinc-800">
            {open.message}
          </p>

          {open.status === "replied" && (
            <p className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[0.8125rem] text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              You&rsquo;ve replied to this one.
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
