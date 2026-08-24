"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const home = pathname === "/";
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the drawer and hands focus back to the button that opened it.
  // No focus trap: this is a disclosure panel, not a modal — the page behind it
  // stays live, and trapping would be the wrong affordance. What it does need is
  // for focus to land inside on open, which `inert` alone won't do.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    drawerRef.current?.querySelector("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // On the homepage the hero renders its own oversized mark, so the nav's copy
  // stays hidden until you scroll past it — then it takes over as the header.
  useEffect(() => {
    if (!home) return;
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  const showMark = !home || pastHero || open;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav className="gutter pointer-events-auto flex h-16 items-center justify-between md:h-20">
        <Link
          href="/"
          aria-label="Boomerang — home"
          tabIndex={showMark ? undefined : -1}
          aria-hidden={!showMark}
          className={`-mx-2 inline-flex min-h-11 items-center px-2 transition-opacity duration-300 ease-out ${
            showMark ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src="/assets/logo/boom-b.png"
            alt=""
            width={343}
            height={665}
            priority
            className="h-7 w-auto md:h-8"
          />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {site.nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex min-h-11 items-center font-mono text-[0.7rem] uppercase tracking-[0.14em] transition-colors duration-hover ease-out ${
                    active ? "text-text" : "text-muted hover:text-text"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          ref={toggleRef}
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 flex h-11 w-11 items-center justify-center md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <span className="relative block h-3 w-6">
            <span
              className={`absolute left-0 h-px w-6 bg-text transition-transform duration-300 ease-out ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-3 h-px w-6 bg-text transition-transform duration-300 ease-out ${
                open ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      {/* `inert` when collapsed: max-height hides the panel visually, but the
          links stay in the tab order without it — a keyboard user tabs into
          four invisible destinations. */}
      <div
        id="mobile-nav"
        ref={drawerRef}
        inert={!open}
        className={`pointer-events-auto overflow-hidden bg-ink transition-[max-height] duration-500 ease-signature md:hidden ${
          open ? "max-h-80" : "max-h-0"
        }`}
      >
        <ul className="gutter flex flex-col py-4">
          {site.nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block py-3 text-3xl uppercase tracking-[-0.03em] text-text"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
