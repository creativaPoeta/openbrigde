"use client";

import { Copy, Share2 } from "lucide-react";
import { useState } from "react";

export default function LinkUtilityActions({ publicUrl, title }) {
  const [copyState, setCopyState] = useState("idle");
  const [shareState, setShareState] = useState("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyState("done");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: publicUrl,
        });
        setShareState("done");
        window.setTimeout(() => setShareState("idle"), 1600);
        return;
      } catch {}
    }

    await copyLink();
    setShareState("copied");
    window.setTimeout(() => setShareState("idle"), 1600);
  }

  return (
    <>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
      >
        <Copy className="h-4 w-4" />
        {copyState === "done" ? "Copied" : copyState === "failed" ? "Retry copy" : "Copy"}
      </button>

      <button
        type="button"
        onClick={shareLink}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
      >
        <Share2 className="h-4 w-4" />
        {shareState === "done" ? "Shared" : shareState === "copied" ? "Copied to share" : "Share"}
      </button>
    </>
  );
}
