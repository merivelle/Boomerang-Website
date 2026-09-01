import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enquiryEmail } from "@/lib/email/enquiry";

// Contact form send, via Resend.
//
// This used to go out over Bluehost SMTP with nodemailer. Shared Bluehost plans
// block SMTP from outside servers, so sends from Vercel could never work — the
// README warned about it in the same commit that shipped the form. Resend is
// built for senders that live in a serverless function, so it removes that
// whole failure mode.
//
// Environment variables (Vercel project settings, or .env.local for dev):
//   RESEND_API_KEY  the API key from resend.com
//   CONTACT_TO      destination inbox
//   CONTACT_FROM    sender address on a Resend-verified domain (optional in
//                   dev — falls back to Resend's shared onboarding sender,
//                   which can only deliver to the account owner's own address)
export const runtime = "nodejs";

const FALLBACK_FROM = "onboarding@resend.dev";

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * The IP is hashed, never stored raw: the point is rate limiting and spotting
 * duplicates, not keeping a log of who visited.
 */
async function recordInquiry(
  req: Request,
  fields: {
    name: string; email: string; subject?: string; message: string;
    /** Resend's message id, so "did this actually send?" stays answerable. */
    resendId?: string;
  },
) {
  try {
    const salt = process.env.INQUIRY_IP_SALT;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    await supabaseAdmin()
      .from("inquiries")
      .insert({
        name: fields.name,
        email: fields.email,
        subject: fields.subject || null,
        message: fields.message,
        resend_id: fields.resendId ?? null,
        referer: req.headers.get("referer"),
        user_agent: req.headers.get("user-agent"),
        ip_hash: ip && salt ? createHash("sha256").update(ip + salt).digest("hex") : null,
      } as never);
  } catch (e) {
    console.error("inquiry not recorded:", e);
  }
}

export async function POST(req: Request) {
  let data: {
    email?: string;
    name?: string;
    subject?: string;
    message?: string;
    company?: string; // honeypot
  };
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (data.email ?? "").trim();
  const name = (data.name ?? "").trim();
  const subject = (data.subject ?? "").trim();
  const message = (data.message ?? "").trim();

  // Honeypot: real users leave this empty. Pretend success, send nothing.
  if (data.company) return NextResponse.json({ ok: true });

  if (!name || !message || !isEmail(email)) {
    return NextResponse.json(
      { error: "Please add your name, a valid email, and a message." },
      { status: 400 },
    );
  }

  const { RESEND_API_KEY, CONTACT_TO, CONTACT_FROM } = process.env;

  // The Settings screen lets an editor change where messages land, so the
  // stored address wins over the environment variable. Without this the field
  // would look like it works and quietly do nothing. Falls back to the env var
  // if the database is unreachable — delivering the message matters more than
  // delivering it to the newest address.
  let deliverTo = CONTACT_TO;
  try {
    const { data } = await supabaseAdmin()
      .from("site_private")
      .select("contact_email")
      .eq("id", 1)
      .single();
    const stored = (data as { contact_email: string } | null)?.contact_email;
    if (stored) deliverTo = stored;
  } catch {
    /* keep the env value */
  }

  if (!RESEND_API_KEY || !deliverTo) {
    return NextResponse.json(
      { error: "Email isn't configured yet." },
      { status: 500 },
    );
  }

  // Absolute, because an email has no origin to resolve links against.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://www.boomerang-music.com");

  try {
    const resend = new Resend(RESEND_API_KEY);
    const mail = enquiryEmail({ name, email, subject, message, siteUrl });

    // Resend reports a rejected send in the response rather than throwing, so
    // the error branch has to cover both that and a transport failure.
    const { data, error } = await resend.emails.send({
      from: CONTACT_FROM || FALLBACK_FROM,
      to: deliverTo,
      replyTo: `${name} <${email}>`,
      subject: mail.subject,
      html: mail.html,
      // Never drop the plaintext part. HTML with no text alternative measurably
      // hurts deliverability, and it is what a terminal client falls back to.
      text: mail.text,
    });
    if (error) throw error;

    // Store AFTER sending, and never fail the request on a write error. The
    // business function is that the message reaches the inbox; the record in
    // the admin is a convenience. If the database is down, the enquiry must
    // still go through.
    void recordInquiry(req, { name, email, subject, message, resendId: data?.id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Surface the real cause in the Vercel function logs for debugging.
    console.error("Contact form send failed:", err);
    return NextResponse.json(
      { error: "Couldn't send right now. Try again or email us directly." },
      { status: 502 },
    );
  }
}
