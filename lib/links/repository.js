import { cache } from "react";
import { inferDestinationTypeFromValue, normalizeDestination } from "@/lib/links/destinations";
import { formatCountryLabel } from "@/lib/links/events";
import { buildPublicUrl } from "@/lib/site";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeText(value, fallback = "", max = 240) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : fallback;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function randomSuffix() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}

function tableErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (error.code === "42P01") return "The Supabase table is missing. Run docs/SUPABASE.sql first.";
  if (error.code === "PGRST204" && String(error.message || "").includes("owner_id")) {
    return "Supabase still does not see short_links.owner_id. Run the latest docs/SUPABASE.sql, then execute: NOTIFY pgrst, 'reload schema';";
  }
  return error.message || fallback;
}

function emptySummary(error = "") {
  return {
    data: {
      totalLinks: 0,
      totalEvents: 0,
      pageViews: 0,
      inAppEvents: 0,
      topSources: [],
      topCountries: [],
      topCampaigns: [],
      eventTrend: [],
      destinationMix: [],
      availableSources: [],
      availableCampaigns: [],
      activeFilters: normalizeDashboardFilters(),
    },
    error,
  };
}

function countRows(rows, key, fallback = "unknown") {
  return rows.reduce((acc, row) => {
    const value = row[key] || fallback;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function countBy(rows, getValue, fallback = "unknown") {
  return rows.reduce((acc, row) => {
    const rawValue = getValue(row);
    const value = normalizeText(rawValue, fallback, 120) || fallback;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function toRankedItems(counts, limit = 5) {
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getEventCountry(row) {
  return formatCountryLabel(normalizeText(row?.event_meta?.geo?.country, "", 32));
}

function normalizeDashboardFilters(input = {}) {
  return {
    q: normalizeText(input.q, "", 120).toLowerCase(),
    linkState: normalizeText(input.linkState, "", 20),
    destination: normalizeText(input.destination, "", 40),
    source: normalizeText(input.source, "", 40),
    campaign: normalizeText(input.campaign, "", 120).toLowerCase(),
  };
}

function includesSearch(haystack, query) {
  return normalizeText(haystack, "", 500).toLowerCase().includes(query);
}

function linkMatchesFilters(linkRow, filters) {
  if (filters.linkState === "active" && linkRow.is_active === false) {
    return false;
  }

  if (filters.linkState === "paused" && linkRow.is_active !== false) {
    return false;
  }

  if (filters.destination && linkRow.destination_type !== filters.destination) {
    return false;
  }

  if (filters.campaign && !includesSearch(linkRow.campaign, filters.campaign)) {
    return false;
  }

  if (!filters.q) {
    return true;
  }

  return [
    linkRow.slug,
    linkRow.title,
    linkRow.description,
    linkRow.destination_value,
    linkRow.campaign,
  ].some((value) => includesSearch(value, filters.q));
}

function eventMatchesFilters(eventRow, filters) {
  if (filters.source && normalizeText(eventRow.source_app, "web", 40) !== filters.source) {
    return false;
  }

  if (!filters.q) {
    return true;
  }

  return [eventRow.slug_snapshot, eventRow.event_type, eventRow.source_app].some((value) =>
    includesSearch(value, filters.q),
  );
}

function buildEventTrend(rows, days = 7) {
  const dayBuckets = [];
  const counts = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    counts.set(iso, 0);
    dayBuckets.push({
      key: iso,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      shortLabel: date.toLocaleDateString("en-US", { weekday: "short" }),
      count: 0,
    });
  }

  for (const row of rows) {
    const createdAt = normalizeText(row?.created_at, "", 80);
    if (!createdAt) continue;

    const bucket = createdAt.slice(0, 10);
    if (counts.has(bucket)) {
      counts.set(bucket, (counts.get(bucket) || 0) + 1);
    }
  }

  return dayBuckets.map((bucket) => ({
    ...bucket,
    count: counts.get(bucket.key) || 0,
  }));
}

const loadDashboardRows = cache(async function loadDashboardRows(ownerId) {
  const client = getSupabaseAdminClient();

  if (!client) {
    return {
      linkRows: [],
      eventRows: [],
      error: "Supabase env vars are missing. Fill .env.local first.",
    };
  }

  if (!ownerId) {
    return {
      linkRows: [],
      eventRows: [],
      error: "Authentication is required.",
    };
  }

  const { data: linkRows, error: linksError } = await client
    .from("short_links")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1500);

  if (linksError) {
    return {
      linkRows: [],
      eventRows: [],
      error: tableErrorMessage(linksError, "Could not load dashboard data."),
    };
  }

  if (!linkRows || linkRows.length === 0) {
    return {
      linkRows: [],
      eventRows: [],
      error: "",
    };
  }

  const linkIds = linkRows.map((row) => row.id).filter(Boolean);
  const { data: eventRows, error: eventsError } = await client
    .from("link_events")
    .select("id, link_id, slug_snapshot, event_type, source_app, os, browser, in_app, created_at, event_meta")
    .in("link_id", linkIds)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (eventsError) {
    return {
      linkRows: [],
      eventRows: [],
      error: tableErrorMessage(eventsError, "Could not load dashboard data."),
    };
  }

  return {
    linkRows: linkRows || [],
    eventRows: eventRows || [],
    error: "",
  };
});

function buildDashboardOptions(linkRows, eventRows) {
  return {
    sources: toRankedItems(countRows(eventRows, "source_app", "web"), 12).map((item) => item.label),
    campaigns: toRankedItems(
      countBy(linkRows, (row) => row.campaign, ""),
      20,
    )
      .map((item) => item.label)
      .filter(Boolean),
  };
}

function buildLinkEventMetrics(rows) {
  const sourceCounts = countRows(rows, "source_app", "web");
  const countryCounts = countBy(rows, (row) => getEventCountry(row), "Unknown");
  const rankedSources = toRankedItems(sourceCounts, 1);
  const rankedCountries = toRankedItems(countryCounts, 1);

  return {
    totalEvents: rows.length,
    pageViews: rows.filter((row) => row.event_type === "page_view").length,
    primaryClicks: rows.filter((row) => row.event_type === "open_primary_click").length,
    fallbackCount: rows.filter((row) => row.event_type === "handoff_fallback").length,
    inAppEvents: rows.filter((row) => row.in_app === true).length,
    lastEventAt: rows[0]?.created_at || "",
    topSource: rankedSources[0]?.label || "",
    topCountry: rankedCountries[0]?.label || "",
  };
}

function applyDashboardFilters(linkRows, eventRows, rawFilters = {}) {
  const filters = normalizeDashboardFilters(rawFilters);
  let filteredLinks = linkRows.filter((row) => linkMatchesFilters(row, filters));
  const linkIdSet = new Set(filteredLinks.map((row) => row.id));
  const slugSet = new Set(filteredLinks.map((row) => row.slug));
  let filteredEvents = eventRows.filter((row) => {
    const matchesLink =
      (row.link_id && linkIdSet.has(row.link_id)) ||
      (row.slug_snapshot && slugSet.has(row.slug_snapshot));

    return matchesLink && eventMatchesFilters(row, filters);
  });

  if (filters.source) {
    const sourceLinkIds = new Set(filteredEvents.map((row) => row.link_id).filter(Boolean));
    const sourceSlugs = new Set(filteredEvents.map((row) => row.slug_snapshot).filter(Boolean));
    filteredLinks = filteredLinks.filter(
      (row) => sourceLinkIds.has(row.id) || sourceSlugs.has(row.slug),
    );
    const refreshedLinkIds = new Set(filteredLinks.map((row) => row.id));
    const refreshedSlugs = new Set(filteredLinks.map((row) => row.slug));
    filteredEvents = filteredEvents.filter(
      (row) =>
        (row.link_id && refreshedLinkIds.has(row.link_id)) ||
        (row.slug_snapshot && refreshedSlugs.has(row.slug_snapshot)),
    );
  }

  return {
    filters,
    linkRows: filteredLinks,
    eventRows: filteredEvents,
  };
}

async function getUniqueSlug(client, rawSlug, fallbackSource) {
  const base = slugify(rawSlug) || slugify(fallbackSource) || `link-${randomSuffix()}`;

  for (let index = 0; index < 12; index += 1) {
    const candidate = index === 0 ? base : `${base}-${randomSuffix()}`;
    const { data, error } = await client
      .from("short_links")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (error) {
      throw new Error(tableErrorMessage(error, "Could not validate the slug."));
    }

    if (!data || data.length === 0) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique slug.");
}

function mapShortLink(row) {
  if (!row) return null;

  const destination = normalizeDestination({
    destinationType: row.destination_type,
    destinationValue: row.destination_value,
    ctaLabel: row.cta_label,
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title || destination.summary,
    customTitle: row.title || "",
    description: row.description || "",
    campaign: row.campaign || "",
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    customCtaLabel: row.cta_label || "",
    destinationLabel: destination.destinationLabel,
    publicUrl: buildPublicUrl(`/go/${row.slug}`),
    ...destination,
  };
}

async function findShortLinkRowBySlug(client, slug, { activeOnly = false, ownerId = "" } = {}) {
  let query = client.from("short_links").select("*").eq("slug", slug);

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: null, error: tableErrorMessage(error, "Could not load this short link.") };
  }

  return { data: data || null, error: "" };
}

async function getLinkEventSummary(client, linkId) {
  const [
    totalEventsResult,
    pageViewsResult,
    primaryClicksResult,
    fallbackResult,
    inAppResult,
    sourceMixResult,
    recentEventsResult,
  ] = await Promise.all([
    client.from("link_events").select("*", { count: "exact", head: true }).eq("link_id", linkId),
    client.from("link_events").select("*", { count: "exact", head: true }).eq("link_id", linkId).eq("event_type", "page_view"),
    client.from("link_events").select("*", { count: "exact", head: true }).eq("link_id", linkId).eq("event_type", "open_primary_click"),
    client.from("link_events").select("*", { count: "exact", head: true }).eq("link_id", linkId).eq("event_type", "handoff_fallback"),
    client.from("link_events").select("*", { count: "exact", head: true }).eq("link_id", linkId).eq("in_app", true),
    client
      .from("link_events")
      .select("source_app, event_type, os, browser, created_at, slug_snapshot, event_meta")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(1000),
    client
      .from("link_events")
      .select("id, event_type, source_app, os, browser, in_app, created_at, slug_snapshot, event_meta")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const error =
    totalEventsResult.error ||
    pageViewsResult.error ||
    primaryClicksResult.error ||
    fallbackResult.error ||
    inAppResult.error ||
    sourceMixResult.error ||
    recentEventsResult.error;

  if (error) {
    return {
      data: {
        totalEvents: 0,
        pageViews: 0,
        primaryClicks: 0,
        fallbackCount: 0,
        inAppEvents: 0,
        sourceMix: [],
        countryMix: [],
        eventTypeMix: [],
        eventTrend: [],
        recentEvents: [],
      },
      error: tableErrorMessage(error, "Could not load link analytics."),
    };
  }

  const analyticsRows = sourceMixResult.data || [];
  const sourceCounts = countRows(analyticsRows, "source_app", "web");
  const countryCounts = countBy(analyticsRows, (row) => getEventCountry(row), "Unknown");
  const eventTypeCounts = countRows(analyticsRows, "event_type", "unknown");

  return {
    data: {
      totalEvents: totalEventsResult.count || 0,
      pageViews: pageViewsResult.count || 0,
      primaryClicks: primaryClicksResult.count || 0,
      fallbackCount: fallbackResult.count || 0,
      inAppEvents: inAppResult.count || 0,
      sourceMix: toRankedItems(sourceCounts),
      countryMix: toRankedItems(countryCounts),
      eventTypeMix: toRankedItems(eventTypeCounts),
      eventTrend: buildEventTrend(analyticsRows),
      recentEvents: recentEventsResult.data || [],
    },
    error: "",
  };
}

export async function createShortLink(input, ownerId) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
  }

  if (!ownerId) {
    return { data: null, error: "You must be signed in to create a short link." };
  }

  try {
    const sourceUrl = normalizeText(input.sourceUrl || input.destinationValue, "", 1200);
    const destinationType = normalizeText(input.destinationType, "", 40) || inferDestinationTypeFromValue(sourceUrl);
    const destination = normalizeDestination({
      destinationType,
      destinationValue: sourceUrl,
      ctaLabel: input.ctaLabel,
    });

    const slug = await getUniqueSlug(client, input.slug, input.title || destination.summary || destination.destinationValue);

    const payload = {
      slug,
      owner_id: ownerId,
      title: normalizeText(input.title, "", 120),
      description: normalizeText(input.description, "", 220),
      destination_type: destination.destinationType,
      destination_value: destination.destinationValue,
      cta_label: destination.ctaLabel,
      campaign: normalizeText(input.campaign, "", 120),
      is_active: true,
    };

    const { data, error } = await client
      .from("short_links")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return { data: null, error: tableErrorMessage(error, "Could not create the short link.") };
    }

    return { data: mapShortLink(data), error: "" };
  } catch (error) {
    return { data: null, error: error.message || "Could not create the short link." };
  }
}

export async function updateShortLink(slug, input, ownerId) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
  }

  if (!ownerId) {
    return { data: null, error: "You must be signed in to update this short link." };
  }

  try {
    const sourceUrl = normalizeText(input.sourceUrl || input.destinationValue, "", 1200);
    const destinationType = normalizeText(input.destinationType, "", 40) || inferDestinationTypeFromValue(sourceUrl);
    const destination = normalizeDestination({
      destinationType,
      destinationValue: sourceUrl,
      ctaLabel: input.ctaLabel,
    });

    const payload = {
      title: normalizeText(input.title, "", 120),
      description: normalizeText(input.description, "", 220),
      destination_type: destination.destinationType,
      destination_value: destination.destinationValue,
      cta_label: normalizeText(input.ctaLabel, "", 50),
      campaign: normalizeText(input.campaign, "", 120),
    };

    const { data, error } = await client
      .from("short_links")
      .update(payload)
      .eq("slug", slug)
      .eq("owner_id", ownerId)
      .select("*")
      .maybeSingle();

    if (error) {
      return { data: null, error: tableErrorMessage(error, "Could not update this short link.") };
    }

    if (!data) {
      return { data: null, error: "This short link does not exist." };
    }

    return { data: mapShortLink(data), error: "" };
  } catch (error) {
    return { data: null, error: error.message || "Could not update this short link." };
  }
}

export async function updateShortLinkStatus(slug, isActive, ownerId) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
  }

  if (!ownerId) {
    return { data: null, error: "You must be signed in to update link status." };
  }

  const { data, error } = await client
    .from("short_links")
    .update({ is_active: isActive === true })
    .eq("slug", slug)
    .eq("owner_id", ownerId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { data: null, error: tableErrorMessage(error, "Could not update link status.") };
  }

  if (!data) {
    return { data: null, error: "This short link does not exist." };
  }

  return { data: mapShortLink(data), error: "" };
}

export async function listRecentLinks(limit = 12, filters = {}, ownerId) {
  const { linkRows, eventRows, error } = await loadDashboardRows(ownerId);

  if (error) {
    return { data: [], error };
  }

  const filtered = applyDashboardFilters(linkRows, eventRows, filters);
  return {
    data: filtered.linkRows.slice(0, limit).map(mapShortLink),
    error: "",
    filters: filtered.filters,
  };
}

export async function listRecentEvents(limit = 20, filters = {}, ownerId) {
  const { linkRows, eventRows, error } = await loadDashboardRows(ownerId);

  if (error) {
    return { data: [], error };
  }

  const filtered = applyDashboardFilters(linkRows, eventRows, filters);
  return {
    data: filtered.eventRows.slice(0, limit),
    error: "",
    filters: filtered.filters,
  };
}

export async function getDashboardSummary(filters = {}, ownerId) {
  const { linkRows, eventRows, error } = await loadDashboardRows(ownerId);
  if (error) {
    return emptySummary(error);
  }

  const filtered = applyDashboardFilters(linkRows, eventRows, filters);
  const campaignByLinkId = new Map(
    filtered.linkRows
      .filter((row) => row.id)
      .map((row) => [row.id, normalizeText(row.campaign, "", 120)]),
  );
  const destinationCounts = countRows(filtered.linkRows, "destination_type");
  const sourceCounts = countRows(filtered.eventRows, "source_app", "web");
  const countryCounts = countBy(filtered.eventRows, (row) => getEventCountry(row), "Unknown");
  const campaignCounts = countBy(
    filtered.eventRows,
    (row) => campaignByLinkId.get(row.link_id),
    "",
  );
  delete campaignCounts[""];

  const options = buildDashboardOptions(linkRows, eventRows);

  return {
    data: {
      totalLinks: filtered.linkRows.length,
      totalEvents: filtered.eventRows.length,
      pageViews: filtered.eventRows.filter((row) => row.event_type === "page_view").length,
      inAppEvents: filtered.eventRows.filter((row) => row.in_app === true).length,
      destinationMix: toRankedItems(destinationCounts),
      topSources: toRankedItems(sourceCounts),
      topCountries: toRankedItems(countryCounts),
      topCampaigns: toRankedItems(campaignCounts),
      eventTrend: buildEventTrend(filtered.eventRows),
      availableSources: options.sources,
      availableCampaigns: options.campaigns,
      activeFilters: filtered.filters,
    },
    error: "",
  };
}

export async function getDashboardExportRows(filters = {}, ownerId) {
  const { linkRows, eventRows, error } = await loadDashboardRows(ownerId);
  if (error) {
    return { data: [], error };
  }

  const filtered = applyDashboardFilters(linkRows, eventRows, filters);
  const eventsByLinkId = new Map();

  for (const row of filtered.eventRows) {
    const key = row.link_id || row.slug_snapshot;
    if (!key) continue;
    if (!eventsByLinkId.has(key)) {
      eventsByLinkId.set(key, []);
    }

    eventsByLinkId.get(key).push(row);
  }

  const rows = filtered.linkRows.map((row) => {
    const key = row.id || row.slug;
    const metrics = buildLinkEventMetrics(eventsByLinkId.get(key) || []);
    const mapped = mapShortLink(row);

    return {
      slug: mapped.slug,
      title: mapped.title,
      customTitle: mapped.customTitle,
      destinationType: mapped.destinationType,
      destinationLabel: mapped.destinationLabel,
      sourceUrl: mapped.webUrl,
      shortUrl: mapped.publicUrl,
      status: mapped.isActive ? "active" : "paused",
      campaign: mapped.campaign,
      createdAt: mapped.createdAt,
      totalEvents: metrics.totalEvents,
      pageViews: metrics.pageViews,
      primaryClicks: metrics.primaryClicks,
      fallbackCount: metrics.fallbackCount,
      inAppEvents: metrics.inAppEvents,
      topSource: metrics.topSource,
      topCountry: metrics.topCountry,
      lastEventAt: metrics.lastEventAt,
    };
  });

  return {
    data: rows,
    error: "",
    filters: filtered.filters,
  };
}

export async function findShortLinkBySlug(slug) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
  }

  const result = await findShortLinkRowBySlug(client, slug, { activeOnly: true });
  return {
    data: mapShortLink(result.data),
    error: result.error,
  };
}

export async function getShortLinkDetailBySlug(slug, ownerId) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      data: null,
      error: "Supabase env vars are missing. Fill .env.local first.",
    };
  }

  if (!ownerId) {
    return { data: null, error: "Authentication is required." };
  }

  const rowResult = await findShortLinkRowBySlug(client, slug, { ownerId });
  if (rowResult.error) {
    return { data: null, error: rowResult.error };
  }

  if (!rowResult.data) {
    return { data: null, error: "This short link does not exist." };
  }

  const link = mapShortLink(rowResult.data);
  const analyticsResult = await getLinkEventSummary(client, rowResult.data.id);

  if (analyticsResult.error) {
    return {
      data: {
        link,
        analytics: analyticsResult.data,
      },
      error: analyticsResult.error,
    };
  }

  return {
    data: {
      link,
      analytics: analyticsResult.data,
    },
    error: "",
  };
}
