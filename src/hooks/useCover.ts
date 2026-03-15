import { useState, useEffect } from "react";
import { api } from "@/lib/tauri";
import type { Game } from "@/lib/types";

// Global cache so we don't re-read/re-download across component remounts
const cache = new Map<string, string>();
// Track in-flight requests to avoid duplicate fetches
const pending = new Map<string, Promise<string>>();

// ── Concurrency-limited queue ──────────────────────────────────────────────
const MAX_CONCURRENT = 4;
let activeCount = 0;
const queue: Array<{
  fetcher: () => Promise<string>;
  resolve: (v: string) => void;
  reject: (e: unknown) => void;
}> = [];

function processQueue() {
  while (activeCount < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    activeCount++;
    item.fetcher()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => { activeCount--; processQueue(); });
  }
}

/**
 * Queue any fetch (local file read or HTTP download) with concurrency limiting.
 * Deduplicates by key so multiple components requesting the same path share one request.
 */
function queueFetch(fetcher: () => Promise<string>, key: string): Promise<string> {
  if (pending.has(key)) return pending.get(key)!;

  const promise = new Promise<string>((resolve, reject) => {
    queue.push({ fetcher, resolve, reject });
    processQueue();
  });
  pending.set(key, promise);
  promise.finally(() => pending.delete(key));
  return promise;
}

/**
 * Resolves a game's cover image to a displayable data URI.
 * - data: URIs are returned as-is
 * - Local file paths → read via Rust, returned as base64 data URI
 * - HTTP/HTTPS URLs → downloaded via Rust (WebView2-safe), cached locally on disk
 * - Results are cached in-memory; reads and downloads are concurrency-limited
 */
export function useCover(game: Game): string | null {
  const path = game.cover_path;

  const [src, setSrc] = useState<string | null>(() => {
    if (!path) return null;
    // Show HTTPS URLs immediately — they may load natively in WebView2
    if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;
    return cache.get(path) || null;
  });

  useEffect(() => {
    if (!path) { setSrc(null); return; }
    if (path.startsWith("data:")) { setSrc(path); return; }
    if (cache.has(path)) { setSrc(cache.get(path)!); return; }

    let cancelled = false;
    const isRemote = path.startsWith("http://") || path.startsWith("https://");

    if (isRemote) {
      // Try to download via Rust (bypasses WebView2 network policy, caches locally)
      queueFetch(() => api.fetchUrlAsBase64(path), path)
        .then((dataUri) => {
          cache.set(path, dataUri);
          if (!cancelled) setSrc(dataUri);
        })
        .catch(() => {
          // Rust download failed — the direct URL set in initial state is already showing
          // so the img element will either load it or hit onError → placeholder
        });
    } else {
      queueFetch(() => api.readImageBase64(path), path)
        .then((dataUri) => {
          cache.set(path, dataUri);
          if (!cancelled) setSrc(dataUri);
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [path]);

  return src;
}

/** Manually add a cover to the cache (e.g. after setting a new cover) */
export function setCoverCache(path: string, dataUri: string) {
  cache.set(path, dataUri);
}

/** Clear a specific entry from the cache */
export function clearCoverCache(path: string) {
  cache.delete(path);
}
