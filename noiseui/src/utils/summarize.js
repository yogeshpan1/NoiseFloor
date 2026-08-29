/**
 * On-device, dependency-free headline sentiment + extractive briefing —
 * ported from the original gdelt-dashboard/summarize.js. No external AI
 * service: everything runs locally over the retrieved GDELT headlines.
 */

const NEG = [
  'attack', 'attacks', 'clash', 'clashes', 'crisis', 'dead', 'death', 'toll',
  'protest', 'protests', 'protester', 'protesters', 'unrest', 'corruption', 'collapse',
  'crackdown', 'violence', 'riot', 'riots', 'blockade', 'resign', 'resigns', 'ouster',
  'ousted', 'arrest', 'arrested', 'arrests', 'ban', 'bans', 'dispute', 'tensions',
  'tension', 'warning', 'warns', 'fear', 'chaos', 'coup', 'emergency', 'killed',
  'wounded', 'injured', 'flood', 'floods', 'drought', 'inflation', 'crash', 'scandal',
  'jailed', 'detained', 'sanctions', 'threat', 'threats', 'conflict', 'war', 'strike',
  'shutdown', 'curfew', 'turmoil', 'instability', 'flee', 'shortage', 'blame', 'blames',
  'condemn', 'condemns', 'criticize', 'criticises', 'slams', 'defiance', 'repression',
  'censorship', 'spy', 'spies', 'leak', 'fraud',
];

const POS = [
  'aid', 'grants', 'grant', 'agreement', 'agreements', 'partnership', 'investment',
  'growth', 'rebuild', 'rebuilding', 'reconstruction', 'recovery', 'support', 'cooperation',
  'cooperative', 'boost', 'boosts', 'strengthen', 'strengthens', 'peace', 'talks', 'resume',
  'donation', 'fund', 'funds', 'relief', 'rescue', 'help', 'development', 'developing',
  'launch', 'launches', 'opens', 'inaugurates', 'signs', 'deal', 'deals', 'railway',
  'hydropower', 'energy', 'success', 'wins', 'win', 'celebrate', 'celebrates', 'progress',
  'historic', 'milestone', 'reforms', 'stability', 'trade', 'connectivity', 'prosperity',
];

const norm = (w) => String(w || '').toLowerCase().replace(/[^a-z]/g, '');

export function scoreTone(title) {
  let score = 0;
  for (const w of String(title || '').split(/\s+/).map(norm)) {
    if (!w) continue;
    if (NEG.includes(w)) score -= 1;
    else if (POS.includes(w)) score += 1;
  }
  return Math.max(-4, Math.min(4, score));
}

const STOP = new Set(
  (
    'the a an and or of to in on for at by with from as is are was were be been being it its this that these those ' +
    'his her their our your they we he she you i not no but if then than so such about into over under after before between during ' +
    'will would could should may might can shall do does did done has have had more most other new news says say said report reports ' +
    'amid ahead update updates live latest analysis opinion video photos'
  ).split(' '),
);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

export function extractThemes(articles, topN = 3) {
  const tf = {};
  for (const a of articles) {
    for (const t of new Set(tokenize(a.title))) tf[t] = (tf[t] || 0) + 1;
  }
  return Object.entries(tf)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w, n]) => `${w} (${n})`);
}

/** Build a 3-bullet extractive briefing from GDELT articles [{title, domain}, ...]. */
export function buildBriefing(articles) {
  const arts = (articles || []).filter((a) => a && a.title);
  if (!arts.length) return [];

  const themes = extractThemes(arts, 3);

  let pos = 0;
  let neg = 0;
  for (const a of arts) {
    const s = scoreTone(a.title);
    if (s > 0) pos++;
    else if (s < 0) neg++;
  }
  const net = pos - neg;
  const mood = net >= 2 ? 'net positive' : net <= -2 ? 'net negative' : 'mixed';

  const ranked = arts
    .map((a) => ({ a, s: scoreTone(a.title) }))
    .sort((x, y) => Math.abs(y.s) - Math.abs(x.s) || y.a.title.length - x.a.title.length);
  const top = ranked[0];

  const domains = {};
  for (const a of arts) domains[a.domain || 'unknown'] = (domains[a.domain || 'unknown'] || 0) + 1;
  const topOutlet = Object.entries(domains).sort((a, b) => b[1] - a[1])[0];

  return [
    `Dominant themes across ${arts.length} headlines: ${themes.join(', ')}.`,
    `Headline mood is ${mood} — ${neg} negative vs ${pos} positive by lexicon score.`,
    top
      ? `Most charged story: “${String(top.a.title).slice(0, 140)}”` +
        (top.a.domain ? ` (${top.a.domain})` : '') +
        (topOutlet && topOutlet[1] > 1 ? ` · top outlet ${topOutlet[0]} (${topOutlet[1]} stories)` : '')
      : '',
  ].filter(Boolean);
}
