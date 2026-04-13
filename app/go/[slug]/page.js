import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SmartLinkClient from "@/components/SmartLinkClient";
import { detectLinkEnvironment } from "@/lib/links/environment";
import { resolveLinkPresentation } from "@/lib/links/presentation";
import { findShortLinkBySlug } from "@/lib/links/repository";
import { buildRequestUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await findShortLinkBySlug(slug);

  if (!result.data) {
    return {
      title: "Link not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const headerList = await headers();
  const publicUrl = buildRequestUrl(`/go/${slug}`, headerList);
  const previewImageUrl = buildRequestUrl(`/preview/${slug}`, headerList);
  const presentation = await resolveLinkPresentation(result.data);
  const baseDescription =
    presentation.description ||
    (result.data.destinationType === "youtube_video"
      ? "Open this video with the strongest available YouTube handoff path."
      : "Smart link handoff page.");
  const metadata = {
    title: presentation.activeTitle,
    description: baseDescription,
    alternates: {
      canonical: publicUrl,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: presentation.activeTitle,
      description: baseDescription,
      url: publicUrl,
      siteName: "OpenBridge",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: presentation.activeTitle,
      description: baseDescription,
    },
  };

  if (presentation.imageUrl || result.data.destinationType === "youtube_video") {
    metadata.openGraph.images = [
      {
        url: previewImageUrl,
        secureUrl: previewImageUrl,
        width: 1200,
        height: 630,
        alt: `${presentation.activeTitle} preview`,
      },
    ];
    metadata.twitter.card = "summary_large_image";
    metadata.twitter.images = [previewImageUrl];
  }

  return metadata;
}

export default async function ShortLinkPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const result = await findShortLinkBySlug(slug);

  if (!result.data || !result.data.isActive) {
    notFound();
  }

  const headerList = await headers();
  const environment = detectLinkEnvironment(headerList.get("user-agent"));
  const isFallbackMode = query.fallback === "1";
  const autoLaunchMode =
    result.data.destinationType === "youtube_video" &&
    environment.isAndroid &&
    environment.inApp &&
    !isFallbackMode
      ? "youtube_android"
      : "none";

  return (
    <SmartLinkClient
      link={result.data}
      initialEnvironment={environment}
      fallbackMode={isFallbackMode}
      autoLaunchMode={autoLaunchMode}
    />
  );
}
