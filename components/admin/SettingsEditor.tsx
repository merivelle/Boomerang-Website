"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { saveSettings, setSharingImage } from "@/app/(admin)/admin/(app)/site-actions";
import { ImageField, type PickableImage } from "./ImageField";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  FieldRow,
  PageTitle,
  useToast,
} from "./ui";

export type SettingsData = {
  phone: string;
  instagramHandle: string;
  copyrightYear: number;
  intro: string;
  contactEmail: string;
  siteName: string;
  ogImage: string | null;
};

export function SettingsEditor({
  data,
  ogOptions,
}: {
  data: SettingsData;
  ogOptions: PickableImage[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState(data.instagramHandle);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const res = await saveSettings(form);
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(
        res.staged ? "Saved. Publish when you're ready." : "Nothing changed since you last published.",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <PageTitle
        title="Settings"
        description="Contact details and the few site-wide values worth changing."
        action={
          <Button type="submit" variant="primary" loading={pending}>
            Save
          </Button>
        }
      />

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-7 space-y-5">
        <Card>
          <CardHeader title="Contact" />
          <CardBody className="space-y-5">
            <FieldRow>
              <Field
                label="Phone"
                hint="Shown in the footer and on the contact page. Tapping it on a phone dials — that link is built for you."
              >
                {({ id }) => (
                  <input id={id} name="phone" defaultValue={data.phone} className="admin-input" />
                )}
              </Field>

              <Field
                label="Instagram"
                hint={handle ? `instagram.com/${handle}` : "Just the handle, no link."}
              >
                {({ id }) => (
                  <div className="relative">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    >
                      @
                    </span>
                    <input
                      id={id}
                      name="instagram_handle"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                      className="admin-input pl-7"
                    />
                  </div>
                )}
              </Field>
            </FieldRow>

            <Field
              label="Where messages are sent"
              hint={
                <>
                  The contact form delivers here. This address is{" "}
                  <strong className="text-zinc-700">never shown on the website</strong> — that&rsquo;s
                  deliberate, so it can&rsquo;t be harvested for spam.
                </>
              }
            >
              {({ id }) => (
                <input
                  id={id}
                  name="contact_email"
                  type="email"
                  defaultValue={data.contactEmail}
                  className="admin-input max-w-md"
                />
              )}
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="The site" />
          <CardBody className="space-y-6">
            <Field
              label="Site description"
              hint="Used by Google, and when a link to the site is shared — unless a page sets its own under Search & sharing."
            >
              {({ id }) => (
                <textarea
                  id={id}
                  name="intro"
                  rows={3}
                  defaultValue={data.intro}
                  className="admin-input"
                />
              )}
            </Field>

            <ImageField
              label="Default sharing image"
              value={data.ogImage}
              options={ogOptions}
              kind="og"
              target="site"
              hint="The picture that shows when anyone shares a link to the site. Landscape, ideally 1200×630. Pages can override it individually."
              onChanged={(mediaId) =>
                start(async () => {
                  const res = await setSharingImage("site", mediaId);
                  if (res.ok) {
                    toast.success("Sharing image set. Publish when you're ready.");
                    router.refresh();
                  } else {
                    toast.error(res.error);
                  }
                })
              }
            />

            <Field label="Copyright year" hint="Shown in the footer." className="max-w-[10rem]">
              {({ id }) => (
                <input
                  id={id}
                  name="copyright_year"
                  inputMode="numeric"
                  defaultValue={data.copyrightYear}
                  className="admin-input"
                />
              )}
            </Field>
          </CardBody>
        </Card>
      </div>

      <p className="mt-5 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-zinc-500">
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
        The company name, the website address and the navigation links are set by your developer —
        changing those affects more than wording.
      </p>
    </form>
  );
}
