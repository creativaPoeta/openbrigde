# Deploy on Vercel

This is the shortest path from the local MVP to a stable public URL.

## 1. Push the project to Git

Put `OpenBridge` in a Git repository that Vercel can import.

## 2. Create the Vercel project

1. Go to `https://vercel.com/new`
2. Import the repository
3. Keep the framework as `Next.js`
4. Leave the default build command and output settings

## 3. Set environment variables

Add these variables in the Vercel project settings:

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx
```

Important:

- `NEXT_PUBLIC_APP_URL` must be the real public base URL of the deployed app
- do not keep `localhost` or `192.168.x.x` in production
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only

## 4. Deploy

Trigger the first deployment from Vercel.

After deploy, verify:

1. `/api/health` returns success
2. `/dashboard` loads
3. creating a new short link works
4. `/go/<slug>` works on desktop
5. `/preview/<slug>` serves an image for YouTube links

## 5. Connect a real domain

In Vercel:

1. Open `Settings` -> `Domains`
2. Add your domain, for example `openbridge.app`
3. Follow the DNS instructions from Vercel
4. Once DNS is active, update `NEXT_PUBLIC_APP_URL` to the same domain
5. redeploy

## 6. Validate the Facebook preview

Use a fresh slug or force a rescrape with:

- Meta Sharing Debugger: `https://developers.facebook.com/tools/debug/`

Check that:

1. the shared URL preview shows the title and thumbnail
2. `og:url` matches your public domain
3. `og:image` points to your deployed `/preview/<slug>` route

## 7. Validate Android Facebook handoff

Test from the Facebook app on Android:

1. tap the shared short link
2. confirm that `Continuer` opens YouTube
3. confirm that `Retour` leaves the user on the web fallback inside Facebook

## Notes

- Quick tunnels are good for testing, not for production
- the current MVP is ready for Vercel without extra server infrastructure
- once the stable domain is live, previews and ad links become much more reliable
