import Link from "next/link";
import { createShortLinkAction } from "@/app/dashboard/actions";
import LinkUtilityActions from "@/components/links/LinkUtilityActions";
import PlatformMark from "@/components/links/PlatformMark";
import { DESTINATION_OPTIONS } from "@/lib/links/catalog";
import { formatEventGeo } from "@/lib/links/events";
import { resolveLinkPresentation } from "@/lib/links/presentation";
import { getDashboardSummary, listRecentEvents, listRecentLinks } from "@/lib/links/repository";
import { buildPublicUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function Flash({ created, error, status }) {
  if (created || status === "created") {
    return (
      <div className="rounded-[1.5rem] border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
        Link created successfully.
      </div>
    );
  }

  if (status === "activated" || status === "deactivated" || status === "updated") {
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

function FilterChip({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <span className="rounded-full border border-[var(--stroke)] bg-white px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">
      {label}: {value}
    </span>
  );
}

function BarList({ title, items, emptyLabel }) {
  const max = items.length > 0 ? Math.max(...items.map((item) => item.count), 1) : 1;

  return (
    <div className="rounded-[1.5rem] bg-[var(--sand)] p-4">
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--ink-soft)]">{emptyLabel}</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div key={item.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[var(--ink-soft)]">{item.label}</span>
                <span className="font-semibold text-[var(--ink)]">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-[var(--signal)]"
                  style={{ width: `${Math.max(10, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendBars({ items }) {
  const max = items.length > 0 ? Math.max(...items.map((item) => item.count), 1) : 1;

  return (
    <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Trend</p>
      <h2 className="mt-3 text-2xl font-bold">Event volume over the last 7 days</h2>

      {items.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] bg-[var(--sand)] px-5 py-6 text-sm text-[var(--ink-soft)]">
          No trend data yet.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-7 gap-3">
          {items.map((item) => (
            <div key={item.key} className="flex flex-col items-center gap-3">
              <span className="text-xs font-semibold text-[var(--ink)]">{item.count}</span>
              <div className="flex h-36 w-full items-end rounded-[1.5rem] bg-[var(--sand)] px-2 py-2">
                <div
                  className="w-full rounded-[1rem] bg-[var(--signal)]"
                  style={{ height: `${item.count === 0 ? 10 : Math.max(14, (item.count / max) * 100)}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  {item.shortLabel}
                </p>
                <p className="text-xs text-[var(--ink-soft)]">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    q: params.q,
    linkState: params.linkState,
    destination: params.destination,
    source: params.source,
    campaign: params.campaign,
  };
  const linksResult = await listRecentLinks(12, filters);
  const eventsResult = await listRecentEvents(20, filters);
  const summaryResult = await getDashboardSummary(filters);
  const appUrl = buildPublicUrl("/").replace(/\/$/, "");
  const enrichedLinks = await Promise.all(
    linksResult.data.map(async (link) => ({
      ...link,
      presentation: await resolveLinkPresentation(link),
    })),
  );
  const activeFilters = summaryResult.data.activeFilters || {};
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[var(--paper)] px-6 py-12 text-[var(--ink)]">
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">OpenBridge dashboard</p>
            <h1 className="mt-4 text-4xl font-black sm:text-5xl">Paste one URL. OpenBridge handles the rest.</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
              The app now auto-detects the destination adapter, generates the slug, and prepares the best available
              handoff path. Advanced edits happen after creation on the link detail page.
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

        <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Search and filter</p>
              <h2 className="mt-3 text-2xl font-bold">Slice the dashboard by query, source, campaign, and status</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
                These filters affect the links list, the analytics cards, the trend bars, and the recent tracking
                signals below.
              </p>
            </div>
            {activeFilterCount > 0 && (
              <Link
                href="/dashboard"
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
              >
                Clear all filters
              </Link>
            )}
          </div>

          <form method="get" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-2 text-sm font-semibold">
              Search
              <input
                name="q"
                defaultValue={params.q || ""}
                placeholder="slug, title, URL, or event"
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Link status
              <select
                name="linkState"
                defaultValue={params.linkState || ""}
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Destination
              <select
                name="destination"
                defaultValue={params.destination || ""}
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              >
                <option value="">All</option>
                {DESTINATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Source app
              <select
                name="source"
                defaultValue={params.source || ""}
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              >
                <option value="">All</option>
                {summaryResult.data.availableSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Campaign
              <input
                name="campaign"
                defaultValue={params.campaign || ""}
                list="campaign-options"
                placeholder="campaign name"
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              />
            </label>

            <div className="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-5">
              <button
                type="submit"
                className="rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Apply filters
              </button>
              <span className="text-sm text-[var(--ink-soft)]">
                Showing {summaryResult.data.totalLinks} links and {summaryResult.data.totalEvents} events.
              </span>
            </div>
          </form>

          <datalist id="campaign-options">
            {summaryResult.data.availableCampaigns.map((campaign) => (
              <option key={campaign} value={campaign} />
            ))}
          </datalist>

          {activeFilterCount > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <FilterChip label="Search" value={params.q} />
              <FilterChip label="Status" value={params.linkState} />
              <FilterChip label="Destination" value={params.destination} />
              <FilterChip label="Source" value={params.source} />
              <FilterChip label="Campaign" value={params.campaign} />
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Create a link</p>
            <h2 className="mt-3 text-2xl font-bold">One field in, full smart link out.</h2>

            <form action={createShortLinkAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Destination URL
                <input
                  name="sourceUrl"
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  required
                  className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
                />
              </label>

              <div className="rounded-[1.5rem] bg-[var(--sand)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
                OpenBridge will auto-detect the adapter, generate a unique slug, and choose a default CTA. You can
                rename the link, add campaign notes, or swap the destination right after creation.
              </div>

              <button
                type="submit"
                className="mt-2 rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Create smart link
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Supported URLs</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {DESTINATION_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="rounded-[1.25rem] border border-[var(--stroke)] bg-[var(--sand)] px-4 py-4"
                >
                  <p className="font-semibold text-[var(--ink)]">{option.label}</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">{option.description}</p>
                  <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs text-[var(--ink-soft)]">
                    {option.example}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[var(--sand)] px-4 py-4 text-sm leading-7 text-[var(--ink-soft)]">
              The public shareable pattern stays <code className="rounded bg-white px-2 py-1">{appUrl}/go/your-slug</code>.
              Slugs are generated automatically and the detail page becomes the place for campaign labels, custom
              titles, CTA overrides, and pause/reactivate actions.
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
            <h2 className="mt-3 text-2xl font-bold">
              {activeFilterCount > 0 ? "Matching short links" : "Latest short links"}
            </h2>

            <div className="mt-6 grid gap-4">
              {enrichedLinks.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[var(--sand)] px-5 py-6 text-sm text-[var(--ink-soft)]">
                  No links yet. Paste the first URL above.
                </div>
              ) : (
                enrichedLinks.map((link) => (
                  <article
                    key={link.id}
                    className="rounded-[1.5rem] border border-[var(--stroke)] bg-[var(--sand)] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <PlatformMark type={link.destinationType} label={link.presentation.providerLabel} />
                          <StatusBadge isActive={link.isActive} />
                          <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">{link.slug}</p>
                        </div>
                        <h3 className="mt-4 text-xl font-bold">{link.presentation.originalTitle}</h3>
                        {link.customTitle && link.customTitle !== link.presentation.originalTitle && (
                          <p className="mt-2 text-sm text-[var(--ink-soft)]">
                            Active custom title: <strong className="text-[var(--ink)]">{link.customTitle}</strong>
                          </p>
                        )}
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                          Original destination URL
                        </p>
                        <p className="mt-2 break-all text-sm leading-7 text-[var(--ink-soft)]">{link.presentation.sourceUrl}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">OpenBridge short URL</p>
                        <p className="mt-2 break-all text-sm leading-7 text-[var(--ink-soft)]">{link.publicUrl}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <LinkUtilityActions publicUrl={link.publicUrl} title={link.presentation.activeTitle} />
                        {link.isActive && (
                          <Link
                            href={`/go/${link.slug}`}
                            className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                          >
                            Open
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/links/${link.slug}`}
                          className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Traffic mix</p>
              <h2 className="mt-3 text-2xl font-bold">Sources, countries, campaigns, and adapters</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <BarList
                  title="Source apps"
                  items={summaryResult.data.topSources}
                  emptyLabel="No source data yet."
                />
                <BarList
                  title="Top countries"
                  items={summaryResult.data.topCountries}
                  emptyLabel="No country data yet."
                />
                <BarList
                  title="Top campaigns"
                  items={summaryResult.data.topCampaigns}
                  emptyLabel="No campaign data yet."
                />
                <BarList
                  title="Destination mix"
                  items={summaryResult.data.destinationMix}
                  emptyLabel="No links yet."
                />
              </div>
            </section>

            <TrendBars items={summaryResult.data.eventTrend} />

            <section className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Recent events</p>
              <h2 className="mt-3 text-2xl font-bold">
                {activeFilterCount > 0 ? "Matching tracking signals" : "Latest tracking signals"}
              </h2>
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
                      <p className="text-[var(--ink-soft)]">Place: {formatEventGeo(event.event_meta)}</p>
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
