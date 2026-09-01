# Auth email templates

The emails Supabase sends on this project's behalf. They are **pasted into the
Supabase dashboard**, not deployed with the site — Supabase renders them itself,
so a `git push` does not update them.

Same design as the enquiry notification the contact form sends
(`lib/email/enquiry.ts`): light background, black type, letter-spaced wordmark,
mono labels. Nothing in them depends on an image loading.

## Which ones matter

| File | Supabase template | When it fires |
|---|---|---|
| `reset-password.html` | **Reset Password** | Someone clicks "forgot password". The one that will realistically be used. |
| `invite-user.html` | **Invite user** | You invite an account from the dashboard instead of creating it directly. |
| `change-email.html` | **Change Email Address** | An account's sign-in address is changed. Rare, but it can happen. |

**Confirm signup** and **Magic Link** are deliberately not included. Public
signup is turned off and the site uses password sign-in only, so neither can
fire. Styling them would be work nobody ever sees — if either is ever switched
on, copy `invite-user.html` and change the wording.

## Installing them

For each file:

1. Supabase dashboard → **Authentication** → **Emails**
2. Pick the template from the list (the middle column above)
3. Open the matching `.html` file here, select all, copy
4. Paste over everything in the **Message body** box
5. Set the **Subject**:

   | Template | Subject |
   |---|---|
   | Reset Password | `Reset your Boomerang password` |
   | Invite user | `You've been given access to the Boomerang website` |
   | Change Email Address | `Confirm your new email address` |

6. **Save**

## The one thing not to touch

`{{ .ConfirmationURL }}` appears twice in each file — once on the button, once
as a plain fallback link for anyone whose client strips buttons. That is a Go
template variable Supabase replaces with the real link when it sends. Delete or
alter it and the email arrives with a dead button.

## Sender address

Supabase sends these from its own shared address by default, which is fine for
three people but reads as generic. To send from `boomerang-music.com`, set up
custom SMTP under **Project Settings → Authentication → SMTP Settings** using
the same Resend account the contact form uses. Not required — worth doing if
the generic sender ever bothers anyone.

## Checking one actually works

Sign out, go to the login screen, and run a password reset for your own account.
Confirm the styled email arrives and the button signs you in. That is the only
real test; a browser preview proves nothing about how a mail client renders it.

## Editing them

Don't hand-edit the HTML. These are generated from the shared shell in
`lib/email/layout.ts` so they cannot drift from the enquiry email — change the
shell, regenerate, and paste again.
