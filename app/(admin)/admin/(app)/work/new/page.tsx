import { WorkForm } from "@/components/admin/WorkForm";
import { formOptions } from "../formData";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add work" };

export default async function NewWorkPage() {
  const o = await formOptions();
  return (
    <WorkForm
      data={{
        slug: null,
        isNew: true,
        hasDraft: false,
        title: "",
        studio: "",
        year: new Date().getFullYear(),
        role: "Trailer Campaign",
        // The first button on the Work page, whatever it is called this year.
        categoryId: o.categories[0]?.id ?? "",
        trailerUrl: "",
        // A new credit starts published: the poster is what actually gates
        // visibility, so an editor is never left wondering which of two
        // switches is hiding their work.
        published: true,
        featured: false,
        inHero: false,
        tagIds: [],
        poster: null,
        hasRealPoster: false,
        focal: null,
        seoTitle: "",
        seoDescription: "",
      }}
      {...o}
    />
  );
}
