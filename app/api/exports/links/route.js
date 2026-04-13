import { getDashboardExportRows } from "@/lib/links/repository";

export const dynamic = "force-dynamic";

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsv(rows) {
  const headers = [
    "slug",
    "title",
    "custom_title",
    "destination_type",
    "destination_label",
    "source_url",
    "short_url",
    "status",
    "campaign",
    "created_at",
    "total_events",
    "page_views",
    "primary_clicks",
    "fallback_count",
    "in_app_events",
    "top_source",
    "top_country",
    "last_event_at",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.slug,
        row.title,
        row.customTitle,
        row.destinationType,
        row.destinationLabel,
        row.sourceUrl,
        row.shortUrl,
        row.status,
        row.campaign,
        row.createdAt,
        row.totalEvents,
        row.pageViews,
        row.primaryClicks,
        row.fallbackCount,
        row.inAppEvents,
        row.topSource,
        row.topCountry,
        row.lastEventAt,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  return lines.join("\n");
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filters = {
    q: searchParams.get("q") || "",
    linkState: searchParams.get("linkState") || "",
    destination: searchParams.get("destination") || "",
    source: searchParams.get("source") || "",
    campaign: searchParams.get("campaign") || "",
  };

  const result = await getDashboardExportRows(filters);
  if (result.error) {
    return new Response(result.error, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const csv = buildCsv(result.data);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="openbridge-links-${timestamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
