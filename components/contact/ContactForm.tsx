"use client";

import { useState } from "react";

// Posts to /api/contact (SMTP via nodemailer). The email arrives prefilled from
// the homepage bubble via ?email=; the visitor adds name, subject, message.
const field =
  "w-full border-b border-line bg-transparent py-4 text-text placeholder:text-faint transition-colors duration-hover ease-out focus:border-text focus:outline-none";
const label = "font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, subject, message, company }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("sent");
      setName("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "sent") {
    return (
      <p className="max-w-xl text-lg leading-relaxed text-text">
        Thanks — your message is on its way. We&rsquo;ll be in touch shortly.
      </p>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={submit} className="max-w-xl">
      <label className="block">
        <span className={label}>Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
          placeholder="name@studio.com"
        />
      </label>

      <label className="mt-8 block">
        <span className={label}>Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
          placeholder="Jane Doe"
        />
      </label>

      <label className="mt-8 block">
        <span className={label}>Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={field}
        />
      </label>

      <label className="mt-8 block">
        <span className={label}>Message</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${field} resize-none`}
        />
      </label>

      {/* Honeypot — hidden from people, catches bots. */}
      <input
        type="text"
        name="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {status === "error" && (
        <p className="mt-6 text-sm text-live" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-10 bg-text px-8 py-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
