"use client";

import { useState } from "react";
import { site } from "@/content/site";

// No backend yet: composes a pre-filled email and hands off to the visitor's
// mail client. Swap for a Vercel route handler + Resend when ready.
const field =
  "w-full border-b border-line bg-transparent py-4 text-text placeholder:text-faint transition-colors duration-hover ease-out focus:border-text focus:outline-none";
const label = "font-mono text-[0.7rem] uppercase tracking-[0.14em] text-faint";

export function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}`);
    window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={submit} className="max-w-xl">
      <label className="block">
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
        <span className={label}>Message</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${field} resize-none`}
          placeholder="Tell us about the cut, the deadline, and the feeling you're after."
        />
      </label>

      <button
        type="submit"
        className="mt-10 bg-text px-8 py-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        Send message
      </button>
    </form>
  );
}
