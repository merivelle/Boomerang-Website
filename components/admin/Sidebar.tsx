"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Wording is the job here. Everything an editor reads says what it does to the
// website — "Work", "Publish", "Poster" — never what it does to the database.
const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/work", label: "Work" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/about", label: "About" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/settings", label: "Settings" },
];

// Sections that exist in the plan but have not shipped yet. Shown greyed rather
// than hidden, so nobody wonders whether they are looking in the wrong place.
const SOON = ["Photos", "Messages"];

export function Sidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-5">
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-zinc-400">
          Boomerang
        </p>
        <p className="text-[0.95rem] tracking-[-0.01em] text-zinc-900">Website editor</p>
      </div>

      <ul className="space-y-0.5 px-2">
        {LINKS.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <ul className="mt-1 space-y-0.5 px-2">
        {SOON.map((label) => (
          <li key={label}>
            <span
              title="Coming soon"
              className="block cursor-default rounded-md px-3 py-2 text-sm text-zinc-300"
            >
              {label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto border-t border-zinc-200 px-5 py-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-zinc-600 transition-colors hover:text-zinc-900"
        >
          View website ↗
        </a>
        <p className="mt-4 truncate text-xs text-zinc-500" title={email}>
          {email}
        </p>
        <p className="text-xs text-zinc-400">{role === "developer" ? "Developer" : "Editor"}</p>
        <button
          onClick={signOut}
          className="mt-2 text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-900"
        >
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop-first, but the sidebar still has to work on a phone. */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <p className="text-sm text-zinc-900">Boomerang</p>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="border-b border-zinc-200 bg-white lg:hidden">{nav}</div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-zinc-200 bg-white lg:block">
        {nav}
      </aside>
    </>
  );
}
