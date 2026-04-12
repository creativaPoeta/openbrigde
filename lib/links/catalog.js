export const DESTINATION_OPTIONS = [
  {
    value: "web",
    label: "Web URL",
    example: "https://example.com/article",
    description: "Any standard http or https URL.",
    defaultCta: "Open destination",
  },
  {
    value: "youtube_video",
    label: "YouTube video",
    example: "dQw4w9WgXcQ or https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Video ID or full YouTube URL.",
    defaultCta: "Open in YouTube",
  },
  {
    value: "instagram_profile",
    label: "Instagram profile",
    example: "@creator or https://www.instagram.com/creator/",
    description: "Instagram handle or profile URL.",
    defaultCta: "Open Instagram",
  },
  {
    value: "tiktok_profile",
    label: "TikTok profile",
    example: "@creator or https://www.tiktok.com/@creator",
    description: "TikTok handle or public profile URL.",
    defaultCta: "Open TikTok",
  },
  {
    value: "whatsapp_chat",
    label: "WhatsApp chat",
    example: "32412345678|Hello there or https://wa.me/32412345678?text=Hello",
    description: "Phone number with optional message separated by |, or a wa.me URL.",
    defaultCta: "Open WhatsApp",
  },
  {
    value: "telegram_profile",
    label: "Telegram profile",
    example: "@channelname or https://t.me/channelname",
    description: "Telegram username, channel, or full t.me URL.",
    defaultCta: "Open Telegram",
  },
  {
    value: "app_store_app",
    label: "App Store app",
    example: "id1234567890 or https://apps.apple.com/app/id1234567890",
    description: "iOS App Store ID or full app URL.",
    defaultCta: "Open App Store",
  },
  {
    value: "play_store_app",
    label: "Play Store app",
    example: "com.example.app or https://play.google.com/store/apps/details?id=com.example.app",
    description: "Android package name or full Play Store URL.",
    defaultCta: "Open Play Store",
  },
];

export function getDestinationOption(type) {
  return DESTINATION_OPTIONS.find((option) => option.value === type) || null;
}
