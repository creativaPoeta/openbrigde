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

async function findShortLinkRowBySlug(client, slug, { activeOnly = false } = {}) {
  let query = client.from("short_links").select("*").eq("slug", slug);

  if (activeOnly) {
    query = query.eq("is_active", true);
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

export async function createShortLink(input) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
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

export async function updateShortLink(slug, input) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
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

export async function updateShortLinkStatus(slug, isActive) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: null, error: "Supabase env vars are missing. Fill .env.local first." };
  }

  const { data, error } = await client
    .from("short_links")
    .update({ is_active: isActive === true })
    .eq("slug", slug)
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

export async function listRecentLinks(limit = 12) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: [], error: "Supabase env vars are missing. Fill .env.local first." };
  }

  const { data, error } = await client
    .from("short_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: tableErrorMessage(error, "Could not load short links.") };
  }

  return { data: (data || []).map(mapShortLink), error: "" };
}

export async function listRecentEvents(limit = 20) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { data: [], error: "Supabase env vars are missing. Fill .env.local first." };
  }

  const { data, error } = await client
    .from("link_events")
    .select("id, link_id, slug_snapshot, event_type, source_app, os, browser, in_app, created_at, event_meta")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: tableErrorMessage(error, "Could not load recent events.") };
  }

  return { data: data || [], error: "" };
}

export async function getDashboardSummary() {
  const client = getSupabaseAdminClient();
  if (!client) {
    return emptySummary("Supabase env vars are missing. Fill .env.local first.");
  }

  const [
    linksCountResult,
    eventsCountResult,
    pageViewCountResult,
    inAppCountResult,
    linksResult,
    eventsResult,
  ] = await Promise.all([
    client.from("short_links").select("*", { count: "exact", head: true }),
    client.from("link_events").select("*", { count: "exact", head: true }),
    client.from("link_events").select("*", { count: "exact", head: true }).eq("event_type", "page_view"),
    client.from("link_events").select("*", { count: "exact", head: true }).eq("in_app", true),
    client.from("short_links").select("id, campaign, destination_type").limit(1000),
    client
      .from("link_events")
      .select("link_id, source_app, event_type, created_at, event_meta")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const error =
    linksCountResult.error ||
    eventsCountResult.error ||
    pageViewCountResult.error ||
    inAppCountResult.error ||
    linksResult.error ||
    eventsResult.error;

  if (error) {
    return emptySummary(tableErrorMessage(error, "Could not load dashboard summary."));
  }

  const linkRows = linksResult.data || [];
  const eventRows = eventsResult.data || [];
  const campaignByLinkId = new Map(
    linkRows
      .filter((row) => row.id)
      .map((row) => [row.id, normalizeText(row.campaign, "", 120)]),
  );
  const destinationCounts = countRows(linkRows, "destination_type");
  const sourceCounts = countRows(eventRows, "source_app", "web");
  const countryCounts = countBy(eventRows, (row) => getEventCountry(row), "Unknown");
  const campaignCounts = countBy(
    eventRows,
    (row) => campaignByLinkId.get(row.link_id),
    "",
  );
  delete campaignCounts[""];

  return {
    data: {
      totalLinks: linksCountResult.count || 0,
      totalEvents: eventsCountResult.count || 0,
      pageViews: pageViewCountResult.count || 0,
      inAppEvents: inAppCountResult.count || 0,
      destinationMix: toRankedItems(destinationCounts),
      topSources: toRankedItems(sourceCounts),
      topCountries: toRankedItems(countryCounts),
      topCampaigns: toRankedItems(campaignCounts),
      eventTrend: buildEventTrend(eventRows),
    },
    error: "",
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

export async function getShortLinkDetailBySlug(slug) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      data: null,
      error: "Supabase env vars are missing. Fill .env.local first.",
    };
  }

  const rowResult = await findShortLinkRowBySlug(client, slug);
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
