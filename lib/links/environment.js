export function detectLinkEnvironment(userAgent) {
  const ua = String(userAgent || "");

  let os = "desktop";
  if (/android/i.test(ua)) os = "android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "ios";

  let sourceApp = "web";
  if (/instagram/i.test(ua)) sourceApp = "instagram";
  else if (/fban|fbav|fb_iab|facebook/i.test(ua)) sourceApp = "facebook";
  else if (/tiktok/i.test(ua)) sourceApp = "tiktok";
  else if (/linkedinapp/i.test(ua)) sourceApp = "linkedin";
  else if (/snapchat/i.test(ua)) sourceApp = "snapchat";

  let browser = "unknown";
  if (/edg/i.test(ua)) browser = "edge";
  else if (/crios|chrome/i.test(ua)) browser = "chrome";
  else if (/fxios|firefox/i.test(ua)) browser = "firefox";
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = "safari";

  return {
    os,
    browser,
    sourceApp,
    inApp: sourceApp !== "web",
    isAndroid: os === "android",
    isIOS: os === "ios",
    isDesktop: os === "desktop",
  };
}

export function getSourceAppLabel(sourceApp) {
  if (sourceApp === "facebook") return "Facebook";
  if (sourceApp === "instagram") return "Instagram";
  if (sourceApp === "tiktok") return "TikTok";
  if (sourceApp === "linkedin") return "LinkedIn";
  if (sourceApp === "snapchat") return "Snapchat";
  return "the embedded browser";
}

export function buildEnvironmentInstruction(environment, linkType) {
  if (!environment?.inApp) {
    return "This link will continue automatically in a moment.";
  }

  const label = getSourceAppLabel(environment.sourceApp);

  if (environment.isIOS && linkType === "youtube_video") {
    return `On iPhone, this tap can still open the YouTube app through universal links. ${label} still cannot reliably force Safari for an arbitrary site.`;
  }

  if (environment.isIOS) {
    return `On iPhone, ${label} usually keeps its own session silo. Use the menu inside ${label} and choose the option to open in your browser.`;
  }

  if (environment.isAndroid && linkType === "youtube_video") {
    return `On Android, the primary button will try YouTube first. If ${label} still traps the visit, use the menu inside ${label} to open externally.`;
  }

  if (environment.isAndroid) {
    return `On Android, the primary button will try to hand off to an external browser. If ${label} still traps the visit, use the menu inside ${label} to open externally.`;
  }

  return `${label} may isolate cookies and attribution. Use its menu to open the destination in a standard browser.`;
}
