// Build the Supabase auth email templates from the shared shell, so they cannot
// drift from the enquiry notification the contact form sends.
//
//   node scripts/gen-email-templates.ts
//
// Then paste the output into the Supabase dashboard — see
// supabase/email-templates/README.md. Supabase renders these itself, so nothing
// here reaches production by deploying.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { C, button, emailShell, label, paragraph, rule } from "../lib/email/layout.ts";

const OUT = join(process.cwd(), "supabase", "email-templates");
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Template = {
  file: string;
  title: string;
  preheader: string;
  heading: string;
  lead: string;
  cta: string;
  note: string;
};

/**
 * `{{ .ConfirmationURL }}` is a Go template variable Supabase substitutes at
 * send time. It must pass through untouched — never run these strings through
 * escapeHtml, which is why the link is written literally rather than taken as
 * an argument from user input.
 */
function authEmail(t: Template): string {
  const body = `
    ${label(t.heading, C.ink)}

    <div style="margin:20px 0 0;">
      ${paragraph(t.lead)}
    </div>

    <div style="margin:28px 0 0;">
      ${button("{{ .ConfirmationURL }}", t.cta)}
    </div>

    <div style="margin:32px 0 0;">${rule()}</div>
    <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">
      ${t.note}
    </p>
    <p style="margin:12px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.faint};word-break:break-all;">
      If the button doesn't work, paste this into your browser:<br />
      <a href="{{ .ConfirmationURL }}" style="color:${C.faint};">{{ .ConfirmationURL }}</a>
    </p>
  `;

  return emailShell({
    title: t.title,
    preheader: t.preheader,
    body,
    tagline: "Boomerang Music · boomerang-music.com",
  });
}

// Only the templates that can actually fire. Public signup is off and auth is
// password-only, so Confirm Signup and Magic Link are unreachable.
const TEMPLATES: Template[] = [
  {
    file: "reset-password.html",
    title: "Reset your password",
    preheader: "A link to choose a new password for the Boomerang website editor.",
    heading: "Reset your password",
    lead: "Someone asked to reset the password for your Boomerang website editor account. Choose a new one here.",
    cta: "Choose a new password",
    note: "This link works once and expires in an hour. If you didn't ask for it, you can ignore this email — your password stays as it is.",
  },
  {
    file: "invite-user.html",
    title: "You've been given access",
    preheader: "Set a password and start editing the Boomerang website.",
    heading: "You've been given access",
    lead: "You can now sign in to the Boomerang website editor, where the work, the homepage and the company details are kept up to date. Set a password to get started.",
    cta: "Set your password",
    note: "This link works once. If you weren't expecting it, you can ignore this email.",
  },
  {
    file: "change-email.html",
    title: "Confirm your new email address",
    preheader: "Confirm the change to your Boomerang editor sign-in address.",
    heading: "Confirm your new address",
    lead: "The email address you use to sign in to the Boomerang website editor is being changed to this one. Confirm it to finish.",
    cta: "Confirm this address",
    note: "If you didn't ask for this, ignore this email and tell your developer — your sign-in stays as it is.",
  },
];

mkdirSync(OUT, { recursive: true });
for (const t of TEMPLATES) {
  const html = authEmail(t);
  if (!html.includes("{{ .ConfirmationURL }}")) {
    throw new Error(`${t.file}: the confirmation link was escaped or lost`);
  }
  writeFileSync(join(OUT, t.file), html);
  console.log(`  ${t.file.padEnd(22)} ${(html.length / 1024).toFixed(1)} KB`);
}
console.log("\nPaste these into Supabase - see supabase/email-templates/README.md");
