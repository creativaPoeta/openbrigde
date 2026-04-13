import Link from "next/link";
import { ArrowRight, BarChart3, ExternalLink, Smartphone } from "lucide-react";
import { signoutAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

const pillars = [
  {
    title: "Detect in-app browsers",
    text: "Recognize Facebook, Instagram, TikTok and similar webviews before they break login state or attribution.",
    icon: Smartphone,
  },
  {
    title: "Route to the right surface",
    text: "Use the best available handoff for Android intents, app targets, or an honest external-browser fallback.",
    icon: ExternalLink,
  },
  {
    title: "Measure the handoff",
    text: "Track page views, click intent, fallback rate, and platform mix so campaigns stop flying blind.",
    icon: BarChart3,
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 py-10 lg:px-10">
        <header className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--ink-muted)]">OpenBridge</p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">Smart links for escaping embedded browsers and preserving conversion.</p>
            {user?.email && <p className="mt-2 text-sm text-[var(--ink-muted)]">Signed in as {user.email}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                >
                  Dashboard
                </Link>
                <form action={signoutAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--sand)]"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--sand)]"
                >
                  Create account
                </Link>
              </>
            )}
            <Link
              href="/api/health"
              className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--sand)]"
            >
              Health check
            </Link>
          </div>
        </header>

        <div className="grid gap-10 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke)] bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--signal)]" />
              MVP now includes auth, account ownership, analytics, and exports
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.94] sm:text-6xl lg:text-7xl">
              Turn trapped clicks into routed handoffs, measurable outcomes, and account-ready SaaS analytics.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-[var(--ink-soft)]">
              OpenBridge now separates workspaces by account, keeps public short links open to end users, and gives
              each owner a protected dashboard for links, tracking, exports, and future billing.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={user ? "/dashboard" : "/sign-up"}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
              >
                {user ? "Open dashboard" : "Create your account"}
                <ArrowRight size={18} />
              </Link>
              <div className="rounded-full border border-[var(--stroke)] px-6 py-3 text-sm font-medium text-[var(--ink-soft)]">
                Public handoff links stay shareable without login
              </div>
            </div>
          </div>

          <aside className="grid gap-4 rounded-[2rem] border border-[var(--stroke)] bg-white/75 p-5 shadow-[0_30px_80px_rgba(29,43,59,0.08)] backdrop-blur">
            <div className="rounded-[1.5rem] bg-[var(--ink)] p-6 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">Product stance</p>
              <p className="mt-4 text-2xl font-bold leading-tight">
                No fake bypass promise. Just the strongest handoff path the platform currently allows.
              </p>
            </div>

            <div className="grid gap-3">
              {pillars.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-[1.5rem] border border-[var(--stroke)] bg-[var(--sand)] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--ink)]">
                      <Icon size={18} />
                    </div>
                    <h2 className="text-lg font-bold">{title}</h2>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{text}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
