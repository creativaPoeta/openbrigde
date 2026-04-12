import Link from "next/link";
import { createShortLinkAction } from "@/app/dashboard/actions";
import { DESTINATION_OPTIONS } from "@/lib/links/catalog";
import { getDashboardSummary, listRecentEvents, listRecentLinks } from "@/lib/links/repository";
import { buildPublicUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function Flash({ created, error, status }) {
  if (created) {
    return (
      <div className="rounded-[1.5rem] border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
        Link created successfully: <strong>{created}</strong>
      </div>
    );
  }

  if (status === "activated" || status === "deactivated") {
    return (
      <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        Link {status}.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return null;
}

function SummaryCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "accent"
      ? "border-[var(--signal)]/30 bg-[var(--signal)]/10"
      : "border-[var(--stroke)] bg-white";

  return (
    <article className={`rounded-[1.5rem] border px-5 py-5 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[var(--ink)]">{value}</p>
    </article>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
        isActive
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {isActive ? "Active" : "Paused"}
    </span>
  );
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const linksResult = await listRecentLinks(12);
  const eventsResult = await listRecentEvents(20);
  const summaryResult = await getDashboardSummary();
  const appUrl = buildPublicUrl("/").replace(/\/$/, "");

  return (
    <main className="min-h-screen bg-[var(--paper)] px-6 py-12 text-[var(--ink)]">
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">OpenBridge dashboard</p>
            <h1 className="mt-4 text-4xl font-black sm:text-5xl">Create short links and inspect the handoff.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
              This dashboard now supports web URLs, YouTube, Instagram, TikTok, WhatsApp, Telegram, App Store, and Play Store links.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-[var(--stroke)] px-5 py-3 font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            Back to home
          </Link>
        </header>

        <Flash created={params.created} error={params.error} status={params.status} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Links" value={summaryResult.data.totalLinks} />
          <SummaryCard label="Total Events" value={summaryResult.data.totalEvents} />
          <SummaryCard label="Page Views" value={summaryResult.data.pageViews} />
          <SummaryCard label="In-App Events" value={summaryResult.data.inAppEvents} tone="accent" />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Create a link</p>
            <form action={createShortLinkAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Title
                <input
                  name="title"
                  placeholder="April YouTube push"
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Slug
                <input
                  name="slug"
                  placeholder="april-youtube-push"
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Description
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Optional landing-page context"
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Destination type
                  <select
                    name="destinationType"
                    defaultValue="web"
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                  >
                    {DESTINATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold">
                  CTA label
                  <input
                    name="ctaLabel"
                    placeholder="Open destination"
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold">
                Destination value
                <input
                  name="destinationValue"
                  placeholder="Use the examples on the right for the selected adapter"
                  required
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Campaign label
                <input
                  name="campaign"
                  placeholder="fb-april"
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <button
                type="submit"
                className="mt-2 rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Create short link
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Input guide</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
              {DESTINATION_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="rounded-[1.25rem] border border-[var(--stroke)] bg-[var(--sand)] px-4 py-4"
                >
                  <p className="font-semibold text-[var(--ink)]">{option.label}</p>
                  <p className="mt-1">{option.description}</p>
                  <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs text-[var(--ink-soft)]">
                    {option.example}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4 text-sm leading-7 text-[var(--ink-soft)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Supabase bootstrap</p>
              <p>
                1. Copy <code className="rounded bg-[var(--paper)] px-2 py-1">.env.example</code> to{" "}
                <code className="rounded bg-[var(--paper)] px-2 py-1">.env.local</code>.
              </p>
              <p>2. Fill your Supabase URL, anon key, and service role key.</p>
              <p>
                3. Run the SQL in{" "}
                <code className="rounded bg-[var(--paper)] px-2 py-1">docs/SUPABASE.sql</code>.
              </p>
              <p>
                4. Then create links here and open them under{" "}
                <code className="rounded bg-[var(--paper)] px-2 py-1">{appUrl}/go/your-slug</code>.
              </p>
            </div>

            {(linksResult.error || eventsResult.error || summaryResult.error) && (
              <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                {linksResult.error || eventsResult.error || summaryResult.error}
              </div>
            )}
          </section>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Recent links</p>
            <h2 className="mt-3 text-2xl font-bold">Latest short links</h2>

            <div className="mt-6 grid gap-4">
              {linksResult.data.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[var(--sand)] px-5 py-6 text-sm text-[var(--ink-soft)]">
                  No links yet. Create the first one after wiring Supabase.
                </div>
              ) : (
                linksResult.data.map((link) => (
                  <article
                    key={link.id}
                    className="rounded-[1.5rem] border border-[var(--stroke)] bg-[var(--sand)] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">{link.slug}</p>
                          <StatusBadge isActive={link.isActive} />
                        </div>
                        <h3 className="mt-2 text-xl font-bold">{link.title}</h3>
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                          {link.destinationLabel}
                        </p>
                        <p className="mt-2 break-all text-sm leading-7 text-[var(--ink-soft)]">{link.webUrl}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/links/${link.slug}`}
                          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                        >
                          Manage
                        </Link>
                        {link.isActive && (
                          <Link
                            href={`/go/${link.slug}`}
                            className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                          >
                            Open
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 break-all rounded-2xl bg-white px-4 py-3 text-xs text-[var(--ink-soft)]">
                      {link.publicUrl}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Traffic mix</p>
              <h2 className="mt-3 text-2xl font-bold">Top sources and adapters</h2>
              <div className="mt-6 grid gap-4">
                <div className="rounded-[1.5rem] bg-[var(--sand)] p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">Source apps</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summaryResult.data.topSources.length === 0 ? (
                      <span className="text-sm text-[var(--ink-soft)]">No source data yet.</span>
                    ) : (
                      summaryResult.data.topSources.map((item) => (
                        <span
                          key={item.label}
                          className="rounded-full border border-[var(--stroke)] bg-white px-3 py-1 text-sm text-[var(--ink-soft)]"
                        >
                          {item.label}: {item.count}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-[var(--sand)] p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">Destination mix</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summaryResult.data.destinationMix.length === 0 ? (
                      <span className="text-sm text-[var(--ink-soft)]">No links yet.</span>
                    ) : (
                      summaryResult.data.destinationMix.map((item) => (
                        <span
                          key={item.label}
                          className="rounded-full border border-[var(--stroke)] bg-white px-3 py-1 text-sm text-[var(--ink-soft)]"
                        >
                          {item.label}: {item.count}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Recent events</p>
              <h2 className="mt-3 text-2xl font-bold">Latest tracking signals</h2>
              <div className="mt-6 grid gap-3">
                {eventsResult.data.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-[var(--sand)] px-5 py-6 text-sm text-[var(--ink-soft)]">
                    No events yet. Open a short link to start filling this stream.
                  </div>
                ) : (
                  eventsResult.data.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[1.5rem] border border-[var(--stroke)] bg-[var(--sand)] p-4 text-sm"
                    >
                      <p className="font-semibold">{event.event_type}</p>
                      <p className="mt-1 text-[var(--ink-soft)]">Slug: {event.slug_snapshot || "n/a"}</p>
                      <p className="text-[var(--ink-soft)]">Source: {event.source_app || "web"}</p>
                      <p className="text-[var(--ink-soft)]">OS: {event.os || "unknown"}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
