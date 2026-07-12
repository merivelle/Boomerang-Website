import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// SMTP send for the contact form. All credentials come from environment
// variables (set in .env.local for dev and in Vercel project settings for prod):
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for port 465),
//   SMTP_USER, SMTP_PASS, CONTACT_TO (destination inbox), CONTACT_FROM (optional).
// nodemailer needs the Node runtime — not edge.
export const runtime = "nodejs";

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

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    CONTACT_TO,
    CONTACT_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CONTACT_TO) {
    return NextResponse.json(
      { error: "Email isn't configured yet." },
      { status: 500 },
    );
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: CONTACT_FROM || SMTP_USER,
      to: CONTACT_TO,
      replyTo: `${name} <${email}>`,
      subject: subject || `Enquiry from ${name}`,
      text: `${message}\n\n— ${name} (${email})`,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Surface the real cause in the Vercel function logs for debugging.
    console.error("Contact form sendMail failed:", err);
    return NextResponse.json(
      { error: "Couldn't send right now. Try again or email us directly." },
      { status: 502 },
    );
  }
}
