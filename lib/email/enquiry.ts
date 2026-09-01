import {
  C,
  button,
  emailShell,
  escapeHtml,
  escapeParagraph,
  label,
  paragraph,
  rule,
} from "./layout.ts";

export type Enquiry = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** Absolute site origin, for the link into the editor. */
  siteUrl: string;
  /** Injectable so the rendered output is testable. */
  sentAt?: Date;
};

const MONO = "'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function formatted(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Los_Angeles",
  }).format(date);
}

/** One metadata row: mono label above the value, hairline beneath. */
function row(name: string, valueHtml: string): string {
  return `<tr><td style="padding:14px 0;border-bottom:1px solid ${C.line};">
    ${label(name)}
    <p style="margin:6px 0 0;font-family:${SANS};font-size:16px;line-height:1.4;letter-spacing:-0.01em;color:${C.ink};">${valueHtml}</p>
  </td></tr>`;
}

/**
 * The email Mark receives when someone uses the contact form.
 *
 * Returns all three parts. The plaintext is not optional: HTML without a text
 * alternative measurably hurts deliverability, and it is what a screen reader
 * or a terminal client falls back to.
 */
export function enquiryEmail(e: Enquiry): { subject: string; html: string; text: string } {
  const sentAt = e.sentAt ?? new Date();
  const when = formatted(sentAt);
  const site = e.siteUrl.replace(/\/$/, "");

  // Every one of these is a stranger's input.
  const name = escapeHtml(e.name);
  const email = escapeHtml(e.email);
  const subjectLine = e.subject?.trim();

  // The form has no subject field today, so this is almost always the fallback.
  // Prefixing the sender's name is what makes the inbox list readable.
  const subject = subjectLine ? `${subjectLine} — ${e.name}` : `New enquiry from ${e.name}`;

  const replyTo = `mailto:${encodeURIComponent(e.email)}?subject=${encodeURIComponent(
    `Re: ${subjectLine || "your message to Boomerang"}`,
  )}`;

  const body = `
    ${label("New enquiry", C.ink)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
      ${row("From", name)}
      ${row("Email", `<a href="mailto:${email}" style="color:${C.ink};text-decoration:underline;">${email}</a>`)}
      ${subjectLine ? row("Subject", escapeHtml(subjectLine)) : ""}
      ${row("Received", escapeHtml(when))}
    </table>

    <div style="margin:32px 0 0;">
      ${label("Message")}
      <div style="margin:12px 0 0;padding:20px 22px;background-color:${C.page};">
        ${paragraph(escapeParagraph(e.message)).replace("margin:0 0 16px", "margin:0")}
      </div>
    </div>

    <div style="margin:32px 0 0;">
      ${button(replyTo, `Reply to ${e.name.split(" ")[0] || "them"}`)}
      <p style="margin:14px 0 0;font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">
        <a href="${site}/admin/messages" style="color:${C.muted};text-decoration:none;">Open in the editor →</a>
      </p>
    </div>

    <div style="margin:32px 0 0;">${rule()}</div>
    <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">
      Replying to this email goes straight back to ${name}.
    </p>
  `;

  const text = [
    "NEW ENQUIRY",
    "",
    `From:     ${e.name}`,
    `Email:    ${e.email}`,
    ...(subjectLine ? [`Subject:  ${subjectLine}`] : []),
    `Received: ${when}`,
    "",
    "MESSAGE",
    "",
    e.message,
    "",
    "—",
    `Reply to this email to answer ${e.name} directly.`,
    `Open in the editor: ${site}/admin/messages`,
  ].join("\n");

  return {
    subject,
    text,
    html: emailShell({
      title: subject,
      // The inbox preview line. Without it, clients show the first words of the
      // markup, which reads as gibberish next to the subject.
      preheader: `${e.name} · ${e.message.slice(0, 90)}`,
      body,
      tagline: "Sent from the contact form at boomerang-music.com",
    }),
  };
}
