# OpenBridge

OpenBridge is a Next.js smart-link product focused on in-app browser escape paths, app handoff, and conversion diagnostics.

## Current MVP

The project now includes:

- short-link creation with unique slugs
- destination adapters for web, YouTube, Instagram, TikTok, WhatsApp, Telegram, App Store, and Play Store
- Android YouTube handoff logic for embedded browsers
- web fallback when app handoff is blocked
- Supabase-backed event tracking
- dashboard metrics and recent-event inspection
- per-link management with pause/reactivate
- social preview metadata with a same-domain preview image route

## Product stance

OpenBridge does not promise fake “bypass” behavior.

It tries the strongest platform-safe handoff available, then falls back honestly when the host app keeps control.

## Development

Install dependencies and run locally:

```bash
npm install
npm run dev
```

For mobile testing on the local network:

```bash
npm run dev:lan
```

## Environment

Copy `.env.example` to `.env.local` and fill:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Database

Run the SQL in `docs/SUPABASE.sql`.

## Deployment

See `docs/DEPLOY_VERCEL.md`.
