/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { findShortLinkBySlug } from "@/lib/links/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const YOUTUBE_THUMBNAIL_CANDIDATES = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];

function truncateText(value, max) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

async function fetchYouTubeThumbnailDataUrl(videoId) {
  for (const filename of YOUTUBE_THUMBNAIL_CANDIDATES) {
    const response = await fetch(`https://i.ytimg.com/vi/${videoId}/${filename}`, {
      cache: "force-cache",
      headers: {
        "user-agent": "OpenBridgeBot/1.0",
      },
    });

    if (!response.ok) {
      continue;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = await response.arrayBuffer();

    if (!bytes.byteLength) {
      continue;
    }

    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  }

  return "";
}

function buildCardCopy(link) {
  const title = truncateText(link.title || "OpenBridge smart link", 68);
  const description = truncateText(
    link.description ||
      (link.destinationType === "youtube_video"
        ? "Open this video with the strongest available YouTube handoff path."
        : "Open this destination with the strongest available handoff path."),
    110
  );

  return {
    title,
    description,
    label: truncateText(link.destinationLabel || link.destinationType || "Smart link", 28).toUpperCase(),
    slug: truncateText(link.slug || "openbridge", 40),
  };
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  const result = await findShortLinkBySlug(slug);

  if (!result.data) {
    return new Response("Not found", { status: 404 });
  }

  const link = result.data;
  const thumbnailDataUrl =
    link.destinationType === "youtube_video" ? await fetchYouTubeThumbnailDataUrl(link.destinationValue) : "";
  const copy = buildCardCopy(link);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #fbf8f3 0%, #efe3d2 45%, #f6f0e8 100%)",
          color: "#1d2b3b",
          fontFamily: "Arial, sans-serif",
          padding: 28,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 18,
            borderRadius: 34,
            background: "linear-gradient(135deg, rgba(29,43,59,0.08) 0%, rgba(217,108,50,0.06) 100%)",
          }}
        />

        {thumbnailDataUrl ? (
          <div
            style={{
              position: "absolute",
              top: 28,
              right: 28,
              bottom: 28,
              width: 668,
              borderRadius: 28,
              overflow: "hidden",
              display: "flex",
              background: "#101820",
              boxShadow: "0 24px 90px rgba(29,43,59,0.20)",
            }}
          >
            {/* next/image does not apply inside next/og image rendering. */}
            <img
              src={thumbnailDataUrl}
              alt={copy.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(17,24,39,0.72) 0%, rgba(17,24,39,0.42) 26%, rgba(17,24,39,0.06) 62%, rgba(17,24,39,0.04) 100%)",
              }}
            />
          </div>
        ) : null}

        <div
          style={{
            width: thumbnailDataUrl ? 460 : "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            zIndex: 1,
            padding: "26px 24px 26px 28px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: "#d96c32",
                  display: "flex",
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: 6,
                  color: "#1d2b3b",
                }}
              >
                OPENBRIDGE
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.76)",
                border: "1px solid rgba(29,43,59,0.10)",
                fontSize: 20,
                fontWeight: 700,
                color: "#3f5367",
                letterSpacing: 2,
              }}
            >
              {copy.label}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 66,
                lineHeight: 1.02,
                fontWeight: 800,
                color: "#142230",
                letterSpacing: -1.8,
              }}
            >
              {copy.title}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 29,
                lineHeight: 1.35,
                color: "rgba(29,43,59,0.78)",
              }}
            >
              {copy.description}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "12px 18px",
                  borderRadius: 18,
                  background: "#1d2b3b",
                  color: "#f6f0e8",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                }}
              >
                SMART LINK
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "12px 18px",
                  borderRadius: 18,
                  background: "rgba(217,108,50,0.12)",
                  color: "#d96c32",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                }}
              >
                @{copy.slug}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "rgba(29,43,59,0.56)",
              }}
            >
              openbrigde.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
