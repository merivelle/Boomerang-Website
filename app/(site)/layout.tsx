import { getNav, getSite } from "@/lib/cms/queries";
import { LenisProvider } from "@/components/motion/LenisProvider";
import { ViewportUnit } from "@/components/motion/ViewportUnit";
import { PageTransition } from "@/components/motion/PageTransition";
import { Preloader } from "@/components/home/Preloader";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

// The public site's chrome. It lives here rather than in the root layout so the
// admin can share the document shell — fonts, metadata, viewport — without
// inheriting the nav, the footer, the smooth-scroll provider, or the WebGL
// preloader, none of which belong around a data table.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [site, nav] = await Promise.all([getSite(), getNav()]);

  return (
    <>
      <ViewportUnit />
      <Preloader />
      <LenisProvider>
        <Nav nav={nav} />
        <PageTransition>{children}</PageTransition>
        <Footer site={site} nav={nav} />
      </LenisProvider>
    </>
  );
}
