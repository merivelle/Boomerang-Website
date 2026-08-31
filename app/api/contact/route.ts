import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/server";

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

  try {
    const resend = new Resend(RESEND_API_KEY);
    // Resend reports a rejected send in the response rather than throwing, so
    // the error branch has to cover both that and a transport failure.
    const { error } = await resend.emails.send({
      from: CONTACT_FROM || FALLBACK_FROM,
      to: deliverTo,
      replyTo: `${name} <${email}>`,
      subject: subject || `Enquiry from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
    });
    if (error) throw error;
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
