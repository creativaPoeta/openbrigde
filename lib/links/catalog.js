export const DESTINATION_OPTIONS = [
  {
    value: "web",
    label: "Web URL",
    example: "https://example.com/article",
    description: "Paste any standard public http or https URL.",
    defaultCta: "Open destination",
  },
  {
    value: "youtube_video",
    label: "YouTube video",
    example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    description: "Paste the full YouTube video URL.",
    defaultCta: "Open in YouTube",
  },
  {
    value: "instagram_profile",
    label: "Instagram profile",
    example: "https://www.instagram.com/creator/",
    description: "Paste the public Instagram profile URL.",
    defaultCta: "Open Instagram",
  },
  {
    value: "tiktok_profile",
    label: "TikTok profile",
    example: "https://www.tiktok.com/@creator",
    description: "Paste the public TikTok profile URL.",
    defaultCta: "Open TikTok",
  },
  {
    value: "whatsapp_chat",
    label: "WhatsApp chat",
    example: "https://wa.me/32412345678?text=Hello",
    description: "Paste a wa.me or api.whatsapp.com URL.",
    defaultCta: "Open WhatsApp",
  },
  {
    value: "telegram_profile",
    label: "Telegram profile",
    example: "https://t.me/channelname",
    description: "Paste the public Telegram URL.",
    defaultCta: "Open Telegram",
  },
  {
    value: "app_store_app",
    label: "App Store app",
    example: "https://apps.apple.com/app/id1234567890",
    description: "Paste the full App Store URL.",
    defaultCta: "Open App Store",
  },
  {
    value: "play_store_app",
    label: "Play Store app",
    example: "https://play.google.com/store/apps/details?id=com.example.app",
    description: "Paste the full Play Store URL.",
    defaultCta: "Open Play Store",
  },
];

export function getDestinationOption(type) {
  return DESTINATION_OPTIONS.find((option) => option.value === type) || null;
}
