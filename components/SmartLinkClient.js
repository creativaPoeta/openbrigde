"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  buildEnvironmentInstruction,
  detectLinkEnvironment,
  getSourceAppLabel,
} from "@/lib/links/environment";

const AUTO_REDIRECT_DELAY_MS = 700;
const HANDOFF_FALLBACK_DELAY_MS = 1500;
const AUTO_APP_DECISION_DELAY_MS = 5000;

function postEvent(payload) {
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
      return;
    }
  } catch {}

  fetch("/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}

export default function SmartLinkClient({
  link,
  initialEnvironment,
  fallbackMode = false,
  autoLaunchMode = "none",
}) {
  const environment =
    initialEnvironment ||
    detectLinkEnvironment(typeof navigator === "undefined" ? "" : navigator.userAgent);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("idle");
  const hasTrackedView = useRef(false);
  const hasAutoLaunched = useRef(false);
  const fallbackTimer = useRef(null);
  const visibilityEventType = useRef("");

  useEffect(() => {
    if (hasTrackedView.current) return;

    hasTrackedView.current = true;

    postEvent({
      linkId: link.id,
      slug: link.slug,
      destinationUrl: link.webUrl,
      eventType: "page_view",
      sourceApp: environment.sourceApp,
      os: environment.os,
      browser: environment.browser,
      inApp: environment.inApp,
      pageUrl: window.location.href,
      meta: {
        destinationType: link.destinationType,
      },
    });
  }, [environment, link]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "hidden" || !visibilityEventType.current) {
        return;
      }

      postEvent({
        linkId: link.id,
        slug: link.slug,
        destinationUrl: link.webUrl,
        eventType: visibilityEventType.current,
        sourceApp: environment.sourceApp,
        os: environment.os,
        browser: environment.browser,
        inApp: environment.inApp,
        pageUrl: window.location.href,
        meta: {
          destinationType: link.destinationType,
        },
      });

      visibilityEventType.current = "";
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [environment, link]);

  useEffect(() => {
    if (environment.inApp) return;

    const timer = window.setTimeout(() => {
      postEvent({
        linkId: link.id,
        slug: link.slug,
        destinationUrl: link.webUrl,
        eventType: "auto_redirect",
        sourceApp: environment.sourceApp,
        os: environment.os,
        browser: environment.browser,
        inApp: environment.inApp,
        pageUrl: window.location.href,
        meta: {
          destinationType: link.destinationType,
        },
      });

      window.location.assign(link.webUrl);
    }, AUTO_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [environment, link]);

  useEffect(() => {
    return () => {
      if (fallbackTimer.current) {
        window.clearTimeout(fallbackTimer.current);
      }
    };
  }, []);

  const instruction = buildEnvironmentInstruction(environment, link.destinationType);
  const environmentLabel = environment.inApp ? getSourceAppLabel(environment.sourceApp) : "Standard browser";
  const canTryYouTubeIntent =
    environment.isAndroid && link.destinationType === "youtube_video" && Boolean(link.androidIntentUrl);
  const canTryChromeIntent = environment.isAndroid && Boolean(link.chromeIntentUrl);

  function track(eventType, meta = {}) {
    postEvent({
      linkId: link.id,
      slug: link.slug,
      destinationUrl: link.webUrl,
      eventType,
      sourceApp: environment.sourceApp,
      os: environment.os,
      browser: environment.browser,
      inApp: environment.inApp,
      pageUrl: window.location.href,
      meta: {
        destinationType: link.destinationType,
        ...meta,
      },
    });
  }

  function openWithFallback(
    intentUrl,
    {
      navigateOnFallback = true,
      attemptEventType = "open_primary_click",
      fallbackDelayMs = HANDOFF_FALLBACK_DELAY_MS,
    } = {}
  ) {
    if (fallbackTimer.current) {
      window.clearTimeout(fallbackTimer.current);
    }

    visibilityEventType.current = "handoff_hidden";
    setStatus("handoff");
    track(attemptEventType);
    window.location.assign(intentUrl);

    fallbackTimer.current = window.setTimeout(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      visibilityEventType.current = "";
      track("handoff_fallback");

      if (navigateOnFallback) {
        window.location.assign(link.webUrl);
        return;
      }

      setStatus("blocked");
    }, fallbackDelayMs);
  }

  const triggerAutoLaunch = useEffectEvent(() => {
    openWithFallback(link.androidIntentUrl, {
      navigateOnFallback: true,
      attemptEventType: "auto_app_attempt",
      fallbackDelayMs: AUTO_APP_DECISION_DELAY_MS,
    });
  });

  useEffect(() => {
    const shouldAutoLaunchYouTube =
      autoLaunchMode === "youtube_android" &&
      environment.isAndroid &&
      environment.inApp &&
      link.destinationType === "youtube_video" &&
      Boolean(link.androidIntentUrl);

    if (!shouldAutoLaunchYouTube || hasAutoLaunched.current) {
      return;
    }

    hasAutoLaunched.current = true;
    triggerAutoLaunch();
  }, [autoLaunchMode, environment, link]);

  function handlePrimaryClick() {
    if (canTryYouTubeIntent) {
      openWithFallback(link.androidIntentUrl, {
        navigateOnFallback: !environment.inApp,
      });
      return;
    }

    if (canTryChromeIntent) {
      openWithFallback(link.chromeIntentUrl, {
        navigateOnFallback: !environment.inApp,
      });
      return;
    }

    setStatus("web");
    track("open_primary_click");
    window.location.assign(link.webUrl);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link.publicUrl || link.webUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }

    track("copy_link");
  }

  function handleContinue() {
    setStatus("web");
    track("continue_in_browser");
    window.location.assign(link.webUrl);
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-6 py-12 text-[var(--ink)]">
      <section className="mx-auto grid max-w-5xl gap-6 rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-6 shadow-[0_30px_90px_rgba(29,43,59,0.08)] lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">OpenBridge smart link</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">{link.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
            {link.description || "This landing page tries the best available handoff before falling back to the web destination."}
          </p>

          {fallbackMode && (
            <div className="mt-5 rounded-[1.25rem] border border-[var(--signal)]/30 bg-[var(--signal)]/10 px-4 py-4 text-sm leading-7 text-[var(--ink)]">
              Automatic app launch was already attempted. If Facebook or Instagram blocked it, tap the main button below to retry with a direct user gesture.
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-[var(--stroke)] px-3 py-1 text-[var(--ink-soft)]">
              {environment.isIOS ? "iPhone / iPad" : environment.isAndroid ? "Android" : "Desktop"}
            </span>
            <span className="rounded-full border border-[var(--stroke)] px-3 py-1 text-[var(--ink-soft)]">{environmentLabel}</span>
            <span className="rounded-full border border-[var(--stroke)] px-3 py-1 text-[var(--ink-soft)]">
              {link.destinationLabel || link.destinationType}
            </span>
          </div>

          <div className="mt-8 rounded-[1.5rem] bg-[var(--ink)] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">Diagnostic</p>
            <p className="mt-3 text-base leading-7 text-white/85">{instruction}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
            >
              {link.ctaLabel}
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-full border border-[var(--stroke)] px-6 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--sand)]"
            >
              Continue on web
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-[var(--stroke)] px-6 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--sand)]"
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>

          <div className="mt-5 text-sm text-[var(--ink-muted)]">
            {status === "handoff" && <p>Trying the app or browser handoff now. Web fallback is armed.</p>}
            {status === "web" && <p>Opening the web destination now.</p>}
            {status === "blocked" && <p>The automatic handoff was blocked. Try the main button or the in-app browser menu.</p>}
            {!environment.inApp && <p>Automatic redirect is running because this is already a standard browser.</p>}
          </div>
        </div>

        <aside className="rounded-[1.75rem] bg-[var(--sand)] p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Handoff snapshot</p>
          <dl className="mt-5 grid gap-4 text-sm">
            <div className="rounded-[1.25rem] bg-white p-4">
              <dt className="font-semibold">Public link</dt>
              <dd className="mt-2 break-all text-[var(--ink-soft)]">{link.publicUrl}</dd>
            </div>
            <div className="rounded-[1.25rem] bg-white p-4">
              <dt className="font-semibold">Destination</dt>
              <dd className="mt-2 break-all text-[var(--ink-soft)]">{link.webUrl}</dd>
            </div>
            <div className="rounded-[1.25rem] bg-white p-4">
              <dt className="font-semibold">Important limit</dt>
              <dd className="mt-2 leading-7 text-[var(--ink-soft)]">
                iPhone webviews can still block a clean browser exit for arbitrary sites. The product can optimize the handoff, not abolish platform rules.
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
