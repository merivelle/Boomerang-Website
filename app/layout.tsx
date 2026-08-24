import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { ViewportUnit } from "@/components/motion/ViewportUnit";
import { PageTransition } from "@/components/motion/PageTransition";
import { Preloader } from "@/components/home/Preloader";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

// One family, one voice. Geist is the closest open face to Neue Montreal /
// Aeonik, and unlike Inter or DM Sans it isn't on the reflex-reject list.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.boomerang-music.com"),
  title: {
    default: `${site.name} — Trailer Music, Scoring & Sound Design`,
    template: `%s — ${site.name}`,
  },
  description: site.intro,
  openGraph: {
    title: `${site.name} — ${site.founder}`,
    description: site.intro,
    type: "website",
  },
};

// The site is dark-only, so without themeColor iOS Safari paints its chrome
// light and the page reads as a dark rectangle inside a white frame.
// viewportFit lets the hero run under the notch on the devices that have one.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      {/* Browser extensions (Grammarly, etc.) inject attributes on <body> before
          React hydrates; suppress the resulting dev-only hydration warning. */}
      <body className="min-h-screen" suppressHydrationWarning>
        <ViewportUnit />
        <Preloader />
        <LenisProvider>
          <Nav />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </LenisProvider>
      </body>
    </html>
  );
}
