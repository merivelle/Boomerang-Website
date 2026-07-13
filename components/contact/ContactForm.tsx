"use client";

import { useState } from "react";

// Posts to /api/contact (SMTP via nodemailer). Editorial rows: label far-left,
// field far-right, thin rules between. The email arrives prefilled from the
// homepage bubble via ?email=; the visitor adds name + message.
const row =
  "grid grid-cols-[5.5rem_1fr] items-baseline gap-5 border-t border-line py-5 md:grid-cols-[12rem_1fr] md:py-6";
const label = "font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint";
const input =
  "w-full bg-transparent text-text placeholder:text-faint focus:outline-none md:text-lg";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [name, setName] = useState("");
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
        body: JSON.stringify({ email, name, message, company }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("sent");
      setName("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "sent") {
    return (
      <p className="border-t border-line pt-8 text-lg leading-relaxed text-text">
        Thanks — your message is on its way. We&rsquo;ll be in touch shortly.
      </p>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={submit}>
      <div className={row}>
        <label htmlFor="cf-email" className={label}>
          Email
        </label>
        <input
          id="cf-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
          placeholder="name@studio.com"
        />
      </div>

      <div className={row}>
        <label htmlFor="cf-name" className={label}>
          Name
        </label>
        <input
          id="cf-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
      </div>

      <div className={`${row} items-start`}>
        <label htmlFor="cf-message" className={label}>
          Message
        </label>
        <textarea
          id="cf-message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${input} resize-none`}
        />
      </div>

      <div className="border-t border-line" />

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
