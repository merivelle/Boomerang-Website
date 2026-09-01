// The shared shell every Boomerang email sits inside.
//
// Hand-written HTML rather than react-email: two templates do not justify a
// dependency and a build step, and mail clients still want tables and inline
// styles regardless of what generates them.
//
// LIGHT, not dark. The site is near-black, but Gmail's dark mode applies its
// own colour inversion to dark emails and older Outlook paints a white block
// behind them — a near-black email is the one design that cannot be made to
// render predictably. Light renders identically everywhere.

/**
 * Escape every value that reaches the HTML. `message` is arbitrary text typed
 * by a stranger, and this is the first time it has ever been interpolated into
 * markup — without this a stray `<` breaks the email and a `<script>` is worse.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape, then turn newlines into <br> — for multi-line bodies only. */
export function escapeParagraph(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

// The site's tokens are pure neutrals (0 chroma, 0 hue); any warm or cool cast
// would be off-brand. These sRGB values follow the precedent already set in
// scripts/gen-brand-assets.mjs, which hand-translated the same ramp for the
// share image.
export const C = {
  page: "#f4f4f4",
  card: "#ffffff",
  ink: "#0b0b0b",
  muted: "#6b6b6b",
  faint: "#8a8a8a",
  line: "#e4e4e4",
} as const;

// Geist will not load in a mail client, so the fallback is what actually
// renders — the same stack the share image falls back to.
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

/** Uppercase mono, ~11px, 0.14em tracking — the site's one label idiom. */
export function label(text: string, color: string = C.faint): string {
  return `<p style="margin:0;font-family:${MONO};font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`;
}

export function paragraph(html: string, color: string = C.ink): string {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.65;letter-spacing:0.012em;color:${color};">${html}</p>`;
}

/** A bulletproof-ish button. Solid background, square, no rounding — like the site. */
export function button(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;"><tr><td style="background-color:${C.ink};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(text)}</a>
  </td></tr></table>`;
}

export function rule(): string {
  return `<div style="height:1px;line-height:1px;font-size:0;background-color:${C.line};">&nbsp;</div>`;
}

/**
 * The wordmark is TEXT, not an image. Most clients block remote images by
 * default, so a logo <img> is a broken box on first open — the one element that
 * must always render is the one that must not depend on images loading.
 */
function header(): string {
  return `<td class="px" style="padding:36px 40px 0;">
    <p style="margin:0;font-family:${SANS};font-size:19px;line-height:1;letter-spacing:0.34em;text-transform:uppercase;color:${C.ink};">Boomerang</p>
  </td>`;
}

function footer(tagline: string): string {
  return `<td class="px" style="padding:0 40px 36px;">
    ${rule()}
    <p style="margin:18px 0 0;font-family:${MONO};font-size:11px;line-height:1.6;letter-spacing:0.06em;color:${C.faint};">${tagline}</p>
  </td>`;
}

/**
 * Wrap body HTML in the full document. 600px is the width every client agrees
 * on; the outer table is what centres it in Outlook, which ignores margin:auto.
 */
export function emailShell({
  title,
  preheader,
  body,
  tagline,
}: {
  title: string;
  /** The grey line after the subject in an inbox list. Hidden in the email itself. */
  preheader: string;
  body: string;
  tagline: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<style>
  @media only screen and (max-width: 480px) {
    .px { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.page};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
  <tr>
    <td align="center" style="padding:32px 16px;word-break:break-word;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.card};">
        <tr>${header()}</tr>
        <tr><td class="px" style="padding:28px 40px 32px;">${body}</td></tr>
        <tr>${footer(tagline)}</tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
