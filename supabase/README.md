# Supabase setup

Everything the admin center stores lives here. This is a one-time setup — after
it, content changes happen in `/admin`, not in code.

Free tier throughout: Postgres, Storage, and Auth on one account, no card.

---

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Pick the region closest to Los Angeles (`West US (North California)`).
3. **Save the database password it generates** — you will not be shown it again.
   Day to day we use API keys, but recovering without it is painful.
4. Skip **Connect GitHub**. We run the SQL by hand.
5. Under **Security**, set all three:

   | Setting | | Why |
   |---|---|---|
   | Enable Data API | **on** | The whole read path is PostgREST over `/rest/v1`. Off breaks everything. |
   | Automatically expose new tables | **off** | On, a table added later is public the moment it exists — even if RLS was forgotten. Off means new tables fail closed. `0003_rls.sql` hands out permissions explicitly. |
   | Enable automatic RLS | **on** | A table cannot then exist without RLS. Harmless to the migration: enabling RLS twice is a no-op, and the service role bypasses it. |

## 2. Run the migrations

Supabase dashboard → **SQL Editor** → **New query**. Paste and run each file in
order, one at a time, checking each succeeds before moving on:

| # | File | What it creates |
|---|---|---|
| 1 | `migrations/0001_schema.sql` | every table, constraint and index |
| 2 | `migrations/0002_triggers.sql` | `updated_at`, the revision log, auto-profile on signup |
| 3 | `migrations/0003_rls.sql` | row-level security — **do not skip this one** |
| 4 | `migrations/0004_storage.sql` | the six storage buckets |

`0003_rls.sql` does two jobs: it grants the public key access to the tables it
*should* read, and adds the policies that limit it to published rows. Until it
runs the site cannot read anything at all — which is the safe direction to fail.

## 3. Turn off public signup

**Authentication → Sign In / Providers → Email**, and turn **"Allow new users to
sign up"** OFF.

This matters. The anon key ships in the browser bundle by design, so while
signup is on, anyone who views source can create themselves an account.

## 4. Invite the three accounts

**Authentication → Users → Add user → Create new user**, with "Auto Confirm User"
checked, for each:

- `mark@boomerang-music.com`
- `angelique@boomerang-music.com`
- `merivelle@boomerang-music.com`

Note that the Supabase *dashboard* account and this project's *app users* are
separate. Being signed in to supabase.com does not create a user here.

Each gets a password you set here and can change later. The trigger from
`0002` gives every new user an `editor` profile automatically.

Then promote yourself to `developer` in the SQL Editor:

```sql
update profiles set role = 'developer' where email = 'merivelle@boomerang-music.com';
```

`developer` is the only role that can upload client logos and hover clips, or
change SEO indexing. Editors do everything else.

## 5. Point the app at it

**Project Settings → API**. Copy into `.env.local` (and later into Vercel →
Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
INQUIRY_IP_SALT=<any long random string>
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses every security policy. It belongs in
`.env.local` and Vercel only — never in a `NEXT_PUBLIC_` variable, never in a
file that a `"use client"` component imports.

## 6. Migrate the existing content

```bash
node scripts/migrate-to-supabase.ts --dry-run   # reads nothing, writes nothing
node scripts/migrate-to-supabase.ts             # for real
npm run verify:migration
```

The dry run should report **82 credits, 34 clients, 110 assets**. The real run
is idempotent — safe to re-run if it fails partway.

`verify:migration` is the gate. It rebuilds every list the site renders from
`content/*.ts`, runs the same queries the site will run, and deep-compares them.
It checks the things that break quietly:

- the 24 homepage credits **in order** (Postgres sorts are not stable; the site
  relies on a stable one)
- Selected Work in **curated** order, not year order
- the six hero columns in slot order
- an **even** number of client logos (the marquee loop jumps otherwise)
- that the contact email is absent from the public view

If it fails, do not continue. It prints exactly which list diverged.

---

## Notes

**The free project pauses after ~7 days of no activity.** A cached site edited
monthly is exactly that traffic profile. A daily cron ships in phase 6 to keep
it awake; until then, if `/admin` won't load, open the Supabase dashboard and
click Restore.

**Existing images stay in `/public`.** All 110 committed assets keep serving
from Vercel's edge for free. Storage holds only what gets uploaded from now on,
and the database records which is which — so any file can move later without a
code change.

**Rolling back.** `content/*.ts` is untouched by the migration and remains the
source of truth until the read path lands in phase 2. Nothing here is one-way
until then.
