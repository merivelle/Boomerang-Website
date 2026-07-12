# Boomerang Music

Trailer-music, scoring, and sound-design studio site. Next.js (App Router) + Tailwind, deployed on Vercel.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Contact form email

The contact form (`/contact`) posts to `app/api/contact/route.ts`, which sends the message over **SMTP** using [Nodemailer](https://nodemailer.com). SMTP just means "the login your website uses to send email" — the same host / port / username / password an email app needs. Until these are set, the form replies **"Email isn't configured yet."**

### Settings (Bluehost cPanel mailbox `info@boomerang-music.com`)

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `mail.boomerang-music.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `info@boomerang-music.com` |
| `SMTP_PASS` | the mailbox password (see below) |
| `CONTACT_TO` | `info@boomerang-music.com` (where submissions land) |
| `CONTACT_FROM` | `info@boomerang-music.com` (optional) |

**Getting the password:** it's the password for the `info@boomerang-music.com` mailbox. In Bluehost → **cPanel → Email Accounts** → find `info@boomerang-music.com` → **Manage** → set (or reset) the password. That value is `SMTP_PASS`.

### Where the values go

- **Local dev:** create a `.env.local` file in the project root (copy `.env.example`), fill in the values, then restart `npm run dev`.
- **Production (Vercel):** Project → **Settings → Environment Variables** → add each key → **redeploy**.

`SMTP_PASS` is a secret: keep it only in `.env.local` (git-ignored) and Vercel. Never commit it.

### Bluehost caveats

- **Port fallback:** if `mail.boomerang-music.com` throws a TLS-certificate error, use `SMTP_PORT=587` with `SMTP_SECURE=false`.
- **Remote sending:** some shared Bluehost plans block SMTP from outside servers (like Vercel). If sends fail from the deployed site even with correct credentials, that's the host restricting remote SMTP — the fix is to switch to a transactional email service (e.g. Resend/SendGrid); the route code stays the same, only the host/credentials change.
