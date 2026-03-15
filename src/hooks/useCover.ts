import { useState, useEffect } from "react";
import { api } from "@/lib/tauri";
import type { Game } from "@/lib/types";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

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

export function useCover(game: Game): string | null {
  const path = game.cover_path;

  const [src, setSrc] = useState<string | null>(() => {
    if (!path) return null;
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
      queueFetch(() => api.fetchUrlAsBase64(path), path)
        .then((dataUri) => {
          cache.set(path, dataUri);
          if (!cancelled) setSrc(dataUri);
        })
        .catch(() => {});
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

export function setCoverCache(path: string, dataUri: string) {
  cache.set(path, dataUri);
}

export function clearCoverCache(path: string) {
  cache.delete(path);
}
