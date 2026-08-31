import type { Metadata } from "next";
import { getCategories, getFilterTags, getWorkProjects, seoMetadata } from "@/lib/cms/queries";
import { WorkExplorer } from "@/components/work/WorkExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LightboxProvider } from "@/components/media/LightboxProvider";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/work", {
    title: "Work",
    description:
      "Trailer campaigns, scores and sound design across film, series, games and broadcast.",
  });
}

export default async function WorkPage() {
  const [projects, categories, tags] = await Promise.all([
    getWorkProjects(),
    getCategories(),
    getFilterTags(),
  ]);

  return (
    <LightboxProvider>
      <div className="gutter pb-28 pt-28 md:pt-36">
        <PageHeader title="Work" />
        <WorkExplorer projects={projects} categories={categories} tags={tags} />
      </div>
    </LightboxProvider>
  );
}
