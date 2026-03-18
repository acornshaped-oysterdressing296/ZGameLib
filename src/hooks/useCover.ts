import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/tauri";
import type { Game } from "@/lib/types";

const CACHE_MAX = 500;
const cache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  if (!cache.has(key)) return undefined;
  const val = cache.get(key)!;
  cache.delete(key);
  cache.set(key, val); // move to end (most recently used)
  return val;
}

function cacheSet(key: string, val: string) {
  if (cache.has(key)) cache.delete(key);
  else if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!); // evict oldest
  cache.set(key, val);
}

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
    return cacheGet(path) || null;
  });

  const genRef = useRef(0);

  useEffect(() => {
    if (!path) { setSrc(null); return; }
    if (path.startsWith("data:")) { setSrc(path); return; }
    const cached = cacheGet(path);
    if (cached) { setSrc(cached); return; }

    const gen = ++genRef.current;
    const isRemote = path.startsWith("http://") || path.startsWith("https://");
    const fetcher = isRemote ? () => api.fetchUrlAsBase64(path) : () => api.readImageBase64(path);

    queueFetch(fetcher, path)
      .then((dataUri) => {
        cacheSet(path, dataUri);
        if (genRef.current === gen) setSrc(dataUri);
      })
      .catch(() => {});
  }, [path]);

  return src;
}

export function setCoverCache(path: string, dataUri: string) {
  cacheSet(path, dataUri);
}

export function clearCoverCache(path: string) {
  cache.delete(path);
}
