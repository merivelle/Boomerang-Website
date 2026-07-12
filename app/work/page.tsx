import type { Metadata } from "next";
import { projects } from "@/content/projects";
import { WorkExplorer } from "@/components/work/WorkExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LightboxProvider } from "@/components/media/LightboxProvider";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Trailer campaigns, scores and sound design across film, series, games and broadcast.",
};

export default function WorkPage() {
  return (
    <LightboxProvider>
      <div className="gutter pb-28 pt-28 md:pt-36">
        <PageHeader title="Work" />
        <WorkExplorer projects={projects} />
      </div>
    </LightboxProvider>
  );
}
