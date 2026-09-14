"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CountBadge } from "./ui/Badge";
import { cn } from "./ui/cn";

// Wording is the job here. Everything an editor reads says what it does to the
// website — "Work", "Publish", "Poster" — never what it does to the database.
const GROUPS: Array<{
  heading: string | null;
  links: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    badge?: "unread";
  }>;
}> = [
  {
    heading: null,
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    heading: "Content",
    links: [
      { href: "/admin/work", label: "Work", icon: Sparkles },
      { href: "/admin/homepage", label: "Homepage", icon: LayoutDashboard },
      { href: "/admin/clients", label: "Clients", icon: Building2 },
      { href: "/admin/about", label: "About", icon: UserRound },
      { href: "/admin/media", label: "Photos", icon: ImageIcon },
    ],
  },
  {
    heading: "Site",
    links: [
      { href: "/admin/seo", label: "Search & sharing", icon: Search },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/messages", label: "Messages", icon: Mail, badge: "unread" },
    ],
  },
];

export function Sidebar({
  email,
  role,
  unread,
}: {
  email: string;
  role: string;
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // A tapped link on a phone should close the sheet it was tapped in.
  useEffect(() => setOpen(false), [pathname]);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="px-4 pb-5 pt-5">
        <Link href="/admin" className="block">
          <p className="admin-eyebrow">Boomerang</p>
          <p className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-zinc-900">
            Website editor
          </p>
        </Link>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <p className="admin-eyebrow mb-1.5 px-3">{group.heading}</p>
            )}
            <ul className="space-y-0.5">
              {group.links.map((l) => {
                const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
                const Icon = l.icon;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.875rem] font-medium",
                        "transition-colors duration-150",
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "" : "text-zinc-400")} />
                      <span className="flex-1 truncate">{l.label}</span>
                      {l.badge === "unread" && <CountBadge value={unread} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-200 px-4 py-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-zinc-600 transition-colors hover:text-zinc-900"
        >
          View website
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <div className="mt-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] text-zinc-600" title={email}>
              {email}
            </p>
            <p className="text-[0.75rem] text-zinc-400">
              {role === "developer" ? "Developer" : "Editor"}
            </p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop-first, but the sidebar still has to work on a phone. */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/admin" className="text-[0.9375rem] font-semibold text-zinc-900">
          Boomerang
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {!open && unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          )}
        </button>
      </div>

      {/* A sheet, not an accordion pushing the page down. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-zinc-900/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-r border-zinc-200 bg-white shadow-xl">
            {nav}
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-[15rem] border-r border-zinc-200 bg-white lg:block">
        {nav}
      </aside>
    </>
  );
}
