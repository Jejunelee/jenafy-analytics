# Jenafy Analytics

Self-hosted website analytics for properties you manage. Dashboard at `stats.jenafy.com`, tracker at `/tracker.js`.

## Stack

- Next.js (App Router) on Vercel
- Supabase Auth + Postgres
- Vanilla JS tracker (framework-independent)

## Setup

1. Copy `.env.example` to `.env.local` and fill values.
2. In the Supabase dashboard:
   - Auth → URL configuration: Site URL `https://stats.jenafy.com`
   - Redirect URLs: `https://stats.jenafy.com/auth/callback` and `http://localhost:3000/auth/callback`
3. Optional: set `RESEND_API_KEY` and `RESEND_FROM` to email a join link. Invites always create a 72-hour code and join URL you can copy. Clients open `/join` and create a password.
4. `npm run dev`

The first account that signs in becomes the **Owner**.

## Tracker

```html
<script
  defer
  src="https://stats.jenafy.com/tracker.js"
  data-site-id="SITE_ID">
</script>
```

Install once in a site’s root layout / header. The tracker is idempotent if included twice.

Custom events:

```js
JenafyAnalytics.track("signup");
```

## Deploy

Vercel: set the same env vars, attach domain `stats.jenafy.com`.
