import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin — Boomerang", template: "%s — Boomerang Admin" },
  // The admin must never be indexed, whatever a content editor does elsewhere.
  robots: { index: false, follow: false },
};

// No Nav, no Footer, no smooth scroll, no WebGL preloader — this is why the
// public pages moved into their own (site) group.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
