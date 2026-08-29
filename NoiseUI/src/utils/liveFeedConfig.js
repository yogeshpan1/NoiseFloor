/**
 * GDELT DOC 2.0 API query config for the Live Feed's 4 perspectives.
 * Ported from the original gdelt-dashboard/feed.js.
 *
 * IMPORTANT: the DOC API validates `sourcecountry:` against FIPS 10-4
 * codes, NOT ISO codes — China is `CH`, not `CN`. An invalid code makes
 * the API return an empty JSON object (no error), which silently reads
 * as "no coverage" if you don't know to check for it. Smoke-tested live.
 */

export const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

export const MAX_RECORDS = 20;
// Real request spacing is enforced globally by utils/gdeltGate.js (GDELT
// itself states a 5s-per-request minimum). This is just how far apart each
// section *enqueues* its first fetch, so 4 sections don't all show
// "Loading…" from the same instant — cosmetic staggering, not the safety net.
export const SECTION_GAP_MS = 400;
export const REFRESH_MS = 15 * 60 * 1000;

export const SECTIONS = [
  {
    id: 'in2np',
    flag: '🇮🇳',
    title: 'India → Nepal',
    note: 'How Indian media houses are narrating Nepal right now (English + Hindi)',
    streams: [
      { id: 'in-en', label: 'IN · EN', query: '(nepal OR kathmandu) sourcecountry:in sourcelang:english' },
      { id: 'in-hi', label: 'IN · HI', query: '(nepal OR kathmandu) sourcelang:hindi' },
    ],
  },
  {
    id: 'cn2np',
    flag: '🇨🇳',
    title: 'China → Nepal',
    note: 'Chinese state and global outlets on Nepal (English + 简体中文)',
    streams: [
      // sourcecountry:CH is deliberate — see file header. Do NOT "fix" to CN.
      { id: 'cn-en', label: 'CN · EN', query: '(nepal OR kathmandu) sourcecountry:CH sourcelang:english' },
      { id: 'cn-zh', label: 'CN · ZH', query: '(nepal OR 尼泊尔) sourcelang:simplifiedchinese' },
    ],
  },
  {
    id: 'np2ic',
    flag: '🇳🇵',
    title: 'Nepal → India & China',
    note: 'Nepali media houses reporting on both neighbours (the reverse gaze)',
    streams: [
      { id: 'np-en', label: 'NP · EN', query: '(india OR china OR indian OR chinese) sourcecountry:np sourcelang:english' },
    ],
  },
  {
    id: 'gl2np',
    flag: '🌐',
    title: 'World → Nepal',
    note: 'Worldwide English baseline — how the rest of the world frames Nepal',
    streams: [{ id: 'gl-en', label: 'GL · EN', query: '(nepal OR kathmandu) sourcelang:english' }],
  },
];

export function buildUrl(query, dayOffset = null) {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: String(MAX_RECORDS),
    format: 'json',
    sort: 'datedesc',
  });
  if (dayOffset !== null) {
    const pad2 = (n) => String(n).padStart(2, '0');
    const stamp = (d) =>
      d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds());
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - dayOffset);
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 0);
    params.set('startdatetime', stamp(start));
    params.set('enddatetime', stamp(end));
  }
  return `${GDELT_DOC_API}?${params.toString()}`;
}
