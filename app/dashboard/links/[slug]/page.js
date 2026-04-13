import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleShortLinkStatusAction, updateShortLinkAction } from "@/app/dashboard/actions";
import { formatEventGeo } from "@/lib/links/events";
import { getShortLinkDetailBySlug } from "@/lib/links/repository";

export const dynamic = "force-dynamic";

function Flash({ status, error }) {
  if (status === "created") {
    return (
      <div className="rounded-[1.5rem] border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
        Link created successfully. You can refine its settings below.
      </div>
    );
  }

  if (status === "updated" || status === "activated" || status === "deactivated") {
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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return {
    title: `Manage ${slug} | OpenBridge`,
  };
}

export default async function LinkDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await getShortLinkDetailBySlug(slug);

  if (!result.data?.link) {
    notFound();
  }

  const { link, analytics } = result.data;
  const nextState = link.isActive ? "inactive" : "active";

  return (
    <main className="min-h-screen bg-[var(--paper)] px-6 py-12 text-[var(--ink)]">
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">OpenBridge link detail</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black sm:text-5xl">{link.title}</h1>
              <StatusBadge isActive={link.isActive} />
            </div>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
              {link.description || "This link is using the default landing copy. Add a custom description below if needed."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--stroke)] px-5 py-3 font-semibold text-[var(--ink)] transition hover:bg-white"
            >
              Back to dashboard
            </Link>
            {link.isActive && (
              <Link
                href={`/go/${link.slug}`}
                className="rounded-full bg-[var(--signal)] px-5 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Open public link
              </Link>
            )}
          </div>
        </header>

        <Flash status={query.status} error={query.error || result.error} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Events" value={analytics.totalEvents} />
          <SummaryCard label="Page Views" value={analytics.pageViews} />
          <SummaryCard label="Primary Clicks" value={analytics.primaryClicks} />
          <SummaryCard label="Fallback Count" value={analytics.fallbackCount} tone="accent" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Edit link</p>

            <div className="mt-6 grid gap-4 text-sm">
              <div className="rounded-[1.25rem] bg-[var(--sand)] p-4">
                <p className="font-semibold text-[var(--ink)]">Slug</p>
                <p className="mt-2 text-[var(--ink-soft)]">{link.slug}</p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-muted)]">
                  The slug stays stable after creation so shared links do not break.
                </p>
              </div>

              <div className="rounded-[1.25rem] bg-[var(--sand)] p-4">
                <p className="font-semibold text-[var(--ink)]">Public URL</p>
                <p className="mt-2 break-all text-[var(--ink-soft)]">{link.publicUrl}</p>
              </div>
            </div>

            <form action={updateShortLinkAction} className="mt-6 grid gap-4">
              <input type="hidden" name="slug" value={link.slug} />

              <label className="grid gap-2 text-sm font-semibold">
                Destination URL
                <input
                  name="sourceUrl"
                  defaultValue={link.webUrl}
                  required
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Custom title
                <input
                  name="title"
                  defaultValue={link.customTitle}
                  placeholder="Optional display title"
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Description
                <textarea
                  name="description"
                  rows="4"
                  defaultValue={link.description}
                  placeholder="Optional landing-page context"
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Campaign label
                  <input
                    name="campaign"
                    defaultValue={link.campaign}
                    placeholder="Optional campaign tag"
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold">
                  CTA label
                  <input
                    name="ctaLabel"
                    defaultValue={link.customCtaLabel}
                    placeholder={link.ctaLabel}
                    className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                  />
                </label>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--sand)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
                Each save re-detects the destination adapter from the URL. Current adapter:{" "}
                <strong className="text-[var(--ink)]">{link.destinationLabel}</strong>
              </div>

              <button
                type="submit"
                className="rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Save changes
              </button>
            </form>

            <form action={toggleShortLinkStatusAction} className="mt-6">
              <input type="hidden" name="slug" value={link.slug} />
              <input type="hidden" name="nextState" value={nextState} />
              <input type="hidden" name="returnTo" value={`/dashboard/links/${link.slug}`} />
              <button
                type="submit"
                className={`rounded-full px-5 py-3 font-semibold text-white transition hover:translate-y-[-1px] ${
                  link.isActive ? "bg-amber-600" : "bg-green-700"
                }`}
              >
                {link.isActive ? "Pause this link" : "Reactivate this link"}
              </button>
            </form>

            {!link.isActive && (
              <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
                While paused, the public `/go/{link.slug}` route will stop serving the smart-link page.
              </p>
            )}
          </section>

          <div className="grid gap-6">
            <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Source mix</p>
              <h2 className="mt-3 text-2xl font-bold">Where this link is being opened</h2>
              <div className="mt-6 flex flex-wrap gap-2">
                {analytics.sourceMix.length === 0 ? (
                  <span className="text-sm text-[var(--ink-soft)]">No source data yet.</span>
                ) : (
                  analytics.sourceMix.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-[var(--stroke)] bg-[var(--sand)] px-3 py-1 text-sm text-[var(--ink-soft)]"
                    >
                      {item.label}: {item.count}
                    </span>
                  ))
                )}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] bg-[var(--sand)] p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">In-app events</p>
                  <p className="mt-3 text-3xl font-black text-[var(--ink)]">{analytics.inAppEvents}</p>
                </div>
                <div className="rounded-[1.5rem] bg-[var(--sand)] p-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">Fallbacks</p>
                  <p className="mt-3 text-3xl font-black text-[var(--ink)]">{analytics.fallbackCount}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Recent events</p>
              <h2 className="mt-3 text-2xl font-bold">Latest signals for this link</h2>
              <div className="mt-6 grid gap-3">
                {analytics.recentEvents.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-[var(--sand)] px-5 py-6 text-sm text-[var(--ink-soft)]">
                    No events recorded for this link yet.
                  </div>
                ) : (
                  analytics.recentEvents.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[1.5rem] border border-[var(--stroke)] bg-[var(--sand)] p-4 text-sm"
                    >
                      <p className="font-semibold">{event.event_type}</p>
                      <p className="mt-1 text-[var(--ink-soft)]">Source: {event.source_app || "web"}</p>
                      <p className="text-[var(--ink-soft)]">OS: {event.os || "unknown"}</p>
                      <p className="text-[var(--ink-soft)]">Browser: {event.browser || "unknown"}</p>
                      <p className="text-[var(--ink-soft)]">Place: {formatEventGeo(event.event_meta)}</p>
                      <p className="text-[var(--ink-soft)]">In-app: {event.in_app ? "yes" : "no"}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
