# Boomerang Music

Trailer-music, scoring, and sound-design studio site. Next.js (App Router) + Tailwind, deployed on Vercel.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Contact form email

The contact form (`/contact`) posts to `app/api/contact/route.ts`, which sends the message with [Resend](https://resend.com) — a transactional email service. Until the keys below are set, the form replies **"Email isn't configured yet."**

This used to go over Bluehost SMTP with Nodemailer. That could never work from the deployed site: shared Bluehost plans block SMTP from outside servers like Vercel. Resend is designed to be called from a serverless function, so that failure mode is gone.

### Settings

| Variable | Value | Required |
| --- | --- | --- |
| `RESEND_API_KEY` | the API key from resend.com | yes |
| `CONTACT_TO` | `info@boomerang-music.com` (where submissions land) | yes |
| `CONTACT_FROM` | an address on a Resend-verified domain | no |

### One-time setup

1. Create an account at [resend.com](https://resend.com) (the free tier covers a portfolio site).
2. **Add the domain** `boomerang-music.com` under **Domains**, and add the DNS records Resend gives you at your registrar. Sending stays restricted until the domain shows **Verified**.
3. **Create an API key** under **API Keys** and copy it — it's shown once.
4. Put it in `.env.local` for local dev, and in Vercel → **Settings → Environment Variables** → then **redeploy**.
5. Set `CONTACT_FROM` to an address on the verified domain, e.g. `info@boomerang-music.com`.

**Before the domain is verified:** leave `CONTACT_FROM` blank. The route falls back to Resend's shared `onboarding@resend.dev` sender, which can only deliver to the email address that owns the Resend account. That's enough to prove the wiring works, but it is not a live configuration.

`RESEND_API_KEY` is a secret: keep it only in `.env.local` (git-ignored) and Vercel. Never commit it.

### Behaviour

- Honeypot: a hidden `company` field. If it's filled, the route returns `200` and sends nothing.
- Validation is server-side (`name`, `message`, and a well-formed `email` are required) and returns `400`.
- A send failure returns `502` and logs the underlying cause to the Vercel function logs.
- There is no rate limiting. The honeypot is the only spam defense.
