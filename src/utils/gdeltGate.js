/**
 * Global request gate for the GDELT DOC API. GDELT's own error response
 * states its limit explicitly: "please limit requests to one every 5
 * seconds" — confirmed live (2026-08-26) via a direct curl against the
 * API, independent of this app. The original gdelt-dashboard's 900ms/
 * 1200ms stream/section gaps predate that and are too aggressive for
 * current conditions, so every GDELT fetch — across every Live Feed
 * section, regardless of mount order — is serialized through here with
 * a real minimum spacing, instead of relying on per-section sleeps that
 * don't account for how long a sibling section's own fetches took.
 */
const MIN_GAP_MS = 5200;

let chain = Promise.resolve();
let lastRequestAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function gatedFetch(url) {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return fetch(url);
  });
  // Keep the queue alive even if this fetch rejects, so later callers
  // still wait their turn instead of firing immediately after a failure.
  chain = run.catch(() => {});
  return run;
}
