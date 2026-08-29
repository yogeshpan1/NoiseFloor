import { useCallback, useEffect, useRef, useState } from 'react';
import { buildUrl, REFRESH_MS } from '../utils/liveFeedConfig';
import { gatedFetch } from '../utils/gdeltGate';
import { buildBriefing } from '../utils/summarize';

const sessionCache = new Map();

async function fetchStream(stream, dayOffset) {
  const key = `${stream.id}:${dayOffset ?? 'latest'}`;
  if (sessionCache.has(key)) return sessionCache.get(key);

  const res = await gatedFetch(buildUrl(stream.query, dayOffset));
  if (res.status === 429) throw Object.assign(new Error('GDELT is rate-limiting this request.'), { rateLimited: true });
  if (!res.ok) throw new Error(`GDELT returned HTTP ${res.status}.`);

  // GDELT occasionally serves a plain-text/HTML error body with HTTP 200
  // (a known quirk — the offline build_extended.py pipeline hits the same
  // thing). Never let a raw JSON.parse SyntaxError leak into the UI as
  // the error message.
  const raw = await res.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('GDELT returned a non-JSON response for this query (likely a temporary server-side hiccup).');
  }
  if (!payload || !Array.isArray(payload.articles)) {
    // Not an error — GDELT returns {} for a genuinely empty result set too.
    sessionCache.set(key, []);
    return [];
  }

  const arts = payload.articles.map((a) => ({ ...a, _tag: stream.label }));
  sessionCache.set(key, arts);
  return arts;
}

/**
 * Fetches + merges one Live Feed perspective's streams. All fetches —
 * across every section — are serialized through a single global gate
 * (see utils/gdeltGate.js) that respects GDELT's real rate limit, so the
 * `initialDelayMs` here only needs to spread out which section's effect
 * *enqueues* first, not guarantee real spacing itself.
 */
export function useLiveFeed(section, { initialDelayMs = 0, dayOffset = null } = {}) {
  // status: 'idle' | 'loading' | 'ready' | 'empty' | 'error'
  const [state, setState] = useState({ status: 'idle', articles: [], briefing: [], error: null });
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const settled = await Promise.allSettled(section.streams.map((stream) => fetchStream(stream, dayOffset)));
      const fulfilled = settled.filter((r) => r.status === 'fulfilled');

      // Only surface an error if EVERY stream in this section failed — a
      // multi-language section (e.g. China's EN+ZH) shouldn't go dark just
      // because one of its two queries got rate-limited while the other
      // succeeded. Show what we have; the failed stream retries next cycle.
      if (!fulfilled.length) {
        throw settled[0].reason;
      }

      const seen = new Set();
      const merged = fulfilled
        .flatMap((r) => r.value)
        .filter((a) => a && a.url && !seen.has(a.url) && seen.add(a.url))
        .sort((a, b) => String(b.seendate || '').localeCompare(String(a.seendate || '')));
      setState({
        status: merged.length ? 'ready' : 'empty',
        articles: merged,
        briefing: buildBriefing(merged),
        error: null,
      });
    } catch (err) {
      setState({ status: 'error', articles: [], briefing: [], error: err });
    } finally {
      loadingRef.current = false;
    }
  }, [section, dayOffset]);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) load();
    }, initialDelayMs);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, dayOffset]);

  useEffect(() => {
    if (dayOffset !== null) return undefined; // only the rolling LATEST window auto-refreshes
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, dayOffset]);

  return { ...state, refresh: load };
}
