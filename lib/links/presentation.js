import { cache } from "react";

const BOT_HEADERS = {
  "user-agent": "OpenBridgeBot/1.0 (+https://openbrigde.vercel.app)",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

const PLATFORM_LABELS = {
  web: "Web",
  youtube_video: "YouTube",
  instagram_profile: "Instagram",
  tiktok_profile: "TikTok",
  whatsapp_chat: "WhatsApp",
  telegram_profile: "Telegram",
  app_store_app: "App Store",
  play_store_app: "Play Store",
};

function cleanText(value, max = 320) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : "";
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/gi, "/");
}

function escapeForRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html, key) {
  const escapedKey = escapeForRegex(key);
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedKey}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return "";
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function resolveAbsoluteUrl(candidate, baseUrl) {
  const cleaned = cleanText(candidate, 2000);
  if (!cleaned) {
    return "";
  }

  try {
    return new URL(cleaned, baseUrl).toString();
  } catch {
    return "";
  }
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: BOT_HEADERS,
      redirect: "follow",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return "";
    }

    return await response.text();
  } catch {
    return "";
  }
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: BOT_HEADERS,
      redirect: "follow",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function resolveYouTubeMetadata(webUrl) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(webUrl)}&format=json`;
  const json = await fetchJson(oembedUrl);

  if (!json) {
    return null;
  }

  return {
    title: cleanText(json.title, 160),
    description: cleanText(json.author_name ? `By ${json.author_name}` : "", 160),
    imageUrl: resolveAbsoluteUrl(json.thumbnail_url, webUrl),
    siteName: "YouTube",
  };
}

async function resolveGenericMetadata(webUrl, platformLabel) {
  const html = await fetchHtml(webUrl);
  if (!html) {
    return null;
  }

  const title =
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    extractTitleTag(html);
  const description =
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "twitter:description") ||
    extractMetaContent(html, "description");
  const imageUrl =
    resolveAbsoluteUrl(extractMetaContent(html, "og:image"), webUrl) ||
    resolveAbsoluteUrl(extractMetaContent(html, "twitter:image"), webUrl);
  const siteName =
    extractMetaContent(html, "og:site_name") ||
    extractMetaContent(html, "application-name") ||
    platformLabel;

  return {
    title: cleanText(title, 160),
    description: cleanText(description, 220),
    imageUrl,
    siteName: cleanText(siteName, 80),
  };
}

export const resolveLinkPresentation = cache(async function resolveLinkPresentation(link) {
  const providerLabel = PLATFORM_LABELS[link.destinationType] || link.destinationLabel || "OpenBridge";
  let external = null;

  if (link.destinationType === "youtube_video") {
    external = await resolveYouTubeMetadata(link.webUrl);
  }

  if (!external) {
    external = await resolveGenericMetadata(link.webUrl, providerLabel);
  }

  const originalTitle = cleanText(external?.title, 160) || cleanText(link.title, 160) || providerLabel;
  const activeTitle = cleanText(link.customTitle, 160) || originalTitle;
  const description =
    cleanText(link.description, 220) ||
    cleanText(external?.description, 220) ||
    "Smart link handoff page.";
  const siteName = cleanText(external?.siteName, 80) || providerLabel;
  const sourceHost = (() => {
    try {
      return new URL(link.webUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return {
    providerLabel,
    activeTitle,
    originalTitle,
    description,
    imageUrl: cleanText(external?.imageUrl, 2000),
    siteName,
    sourceUrl: link.webUrl,
    sourceHost,
  };
});
