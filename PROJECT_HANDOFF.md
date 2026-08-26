# PROJECT HANDOFF — NoiseFloor

**Read this first.** This document explains the entire project: what it is, why it exists, how
every piece works, what is finished, what is still in-flight, and the strict rules for anyone
(especially Claude Code) modifying it. It was written so a designer/developer can restyle the
UI **without breaking the research, the data, or the graded features**.

---

## 1. What this project is

**NoiseFloor — a Geopolitical Intelligence Dashboard.**
BSc Computing final-year Big Data capstone (Islington College / London Metropolitan University),
Big Data with PySpark elective.

**The research question:** when Nepal went through three national crises, how did the media of
its two giant neighbours — **India** and **China** — actually cover it? Loud or silent? Warm or
hostile? The project measures the "noise floor" of foreign media attention toward Nepal and the
tone gap between the two rival powers.

**The three crises analysed (the core of the project):**

| Crisis | Window | What happened |
|---|---|---|
| 2015 Earthquake | Apr–May 2015 | M7.8 Gorkha earthquake + M7.3 aftershock (May 12) |
| 2015 Blockade | Sep 2015–Jan 2016 | India-border blockade; months-long fuel crisis |
| 2025 Gen-Z Protests | Sep 8–14 2025 focus | Sept 9: protests peaked, parliament burned, PM Oli resigned. Sept 12: interim government under Sushila Karki — **two different events, two different dates, never conflate them** |

## 2. Locked findings — DO NOT CHANGE ANY NUMBER

These values are **asserted by `backend/build_data.py` at build time; the build FAILS if the
CSVs ever drift from them.** Any redesign must display them exactly as they are:

| Incident | India avg tone | China avg tone |
|---|---|---|
| 2015 Earthquake | −2.2623 | −0.2866 |
| 2015 Blockade | −2.4345 | −0.4450 |
| 2025 Gen-Z Protest | −2.2958 | −0.7109 |

- Welch t-test: **t = −13.95, p = 0.0051, r = −0.0235** (India significantly darker than China)
- Verbal cooperative coverage: **62.65% (2015) → 56.10% (2025)**
- Bhutan is the only neighbour with positive tone in the event data (**+1.64, n=59**)
- **Sept 9, 2025** = major coverage spike day (**30.99× baseline**) — the day Oli resigned
- **Sept 12, 2025** = interim government sworn in

**The headline story:** India's media turns sharply negative toward Nepal in every crisis;
China's stays mildly negative/neutral. Attention ≠ sentiment (volume and tone decorrelate).

## 3. Architecture (how data flows)

```
NoiseFloor.ipynb (PySpark/Colab, UNCHANGED original pipeline)
        │  exports
        ▼
*.csv (8 result files in repo root)
        │  backend/build_data.py  ← asserts locked findings; merges extended.json if present
        ▼
gdelt-dashboard/data_bundle.js   ← window.GDELT_DATA = { ... }  (GENERATED — never hand-edit)
        │  loaded by
        ▼
gdelt-dashboard/index.html + app.js + geo_views.js + insights.js + feed.js + globe.js
        │                            (static site — just open index.html, no server needed)
```

Two live components call the **GDELT DOC 2.0 API** directly (CORS-friendly, no key needed):
- `feed.js` (Live Feed) — from the browser, at view time
- `backend/build_extended.py` (Regional Lens datasets) — offline build, cached & resumable

## 4. File inventory (what every file is)

```
NoiseFloor/
├── NoiseFloor.ipynb              # original PySpark pipeline — DO NOT EDIT
├── notebook_addendum.ipynb       # Colab add-on cells (reverse-direction stats, neighbour matrix)
├── README.md                     # build/run docs + locked findings
├── PROJECT_HANDOFF.md            # this file
├── Project Detail.pdf / Project Presentation.pdf   # coursework briefs (context)
├── data/
│   └── event_log.csv             # manually verified causal event log (date, event,
│                                 #   description, source URL — every URL fetch-verified,
│                                 #   unexplained spikes marked "unverified", never invented)
├── backend/
│   ├── date_index.py             # DSA component: DateIndex (sorted dates + inverted index)
│   ├── anomaly.py                # 2σ rolling-mean anomaly detection
│   ├── build_data.py             # CSVs → data_bundle.js (asserts locked findings)
│   ├── build_extended.py         # GDELT DOC API → data/extended/extended.json
│   │                             #   (Regional Lens data; resumable, cached, 429-safe)
│   ├── requirements.txt          # pyspark, etc.
│   └── tests/test_date_index.py  # correctness + empirical benchmark (pytest)
├── gdelt-dashboard/              # THE FRONTEND (static, no build step)
│   ├── index.html                # ALL views/markup. One .view-page per sidebar entry.
│   ├── style.css                 # dark "intelligence console" theme + print stylesheet
│   ├── app.js                    # view switching, Dashboard/crisis views, Key Findings,
│   │                             #   Hypothesis Engine, Date Explorer, Trends, Data Explorer
│   ├── geo_views.js              # Regional Lens: Neighbour Watch / Cross-Reactions / Nepal Dividend
│   ├── insights.js               # Insight Engine: inverted index → TF-IDF → cited answers
│   ├── feed.js                   # Live Feed: GDELT DOC queries, carousel, tone chips
│   ├── summarize.js              # on-device lexicon sentiment + extractive 3-point briefings
│   ├── globe.js                  # dependency-free 3D coverage globe (orthographic canvas)
│   ├── date_index.js             # JS twin of DateIndex — answers every Date Explorer search
│   ├── data.js                   # small legacy loader
│   ├── data_bundle.js            # GENERATED data (window.GDELT_DATA) — never hand-edit
│   └── data/extended/            # build_extended.py cache/output (gitignored)
└── *.csv                         # 8 pipeline result files (root) — inputs to build_data.py
```

**There are TWO html files in the workspace — only one is the project:**
- `gdelt-dashboard/index.html` — the real dashboard. **This is the file.**
- `gdelt-dashboard/_preview.html` — a local screenshot-test harness (gitignored, NOT in the
  repo/zip). It iframes index.html and, with `?mock=1`, injects fake `example.com` articles.
  Ignore it completely.

## 5. Every view & feature (sidebar order)

**Overview**
1. **Dashboard** — KPI cards (avg tones, event counts), tone-over-time chart, and a
   **3D Coverage Globe** (`globe.js`): hand-rolled orthographic canvas projection, one dot per
   source country sized by Nepal-coverage volume, pulsing Nepal marker, great-circle arcs from
   India & China, drag-to-rotate, auto-spin when idle. Zero libraries.

**Crises** (each: trajectory chart aligned by trigger day, volume chart, event annotations)
2. **Earthquake 2015** — daily trajectory comes from `timeline_all_three` (fallback logic in
   `app.js alignedTrajectory()`; `timeline_aligned` only covers Blockade+Gen-Z).
3. **Blockade 2015**
4. **Gen-Z 2025** — includes the Sept 9 spike (30.99× baseline) and Sept 12 interim-government
   annotation.

**Analysis**
5. **Key Findings** — the locked statistics rendered as cards + charts.
6. **Hypothesis Engine** (`app.js initHypothesis`) — models each actor's daily tone as a
   Gaussian; crisis dropdown + 4 quick-select buttons + two "what-if mean shift" sliders that
   recompute curves live; RUN TEST performs a Welch t-test and shows t, p, verdict.
7. **Insight Engine** (`insights.js`) — ask questions in plain English; hand-built inverted
   index → TF-IDF retrieval over the verified event log/findings/methodology; answers quote
   retrieved text verbatim with citations — never generated. DSA showcase #2.
8. **Date Explorer** (`app.js`, backed by `date_index.js` NFDateIndex) — single-date or range
   search; returns matching days, total events, avg tone, spike count, India-vs-China chart,
   daily volume+tone chart, tagged event-log rows. Global filter checkbox narrows Gen-Z
   waveform & Trends charts. Preset button jumps to the Sept 8–14 2025 spike week.
   - DSA detail: sorted array of distinct dates (binary search, hand-written lower/upper
     bounds) + inverted index `Map<date, rowId[]>`. Exact date O(1) avg, range O(log n + k).
     pytest `test_benchmark_beats_linear` proves it beats naive scanning.
9. **Trends & Anomalies** — tone-over-time (daily/weekly toggle), volume (log axis),
   volume×tone scatter with client-side Pearson r, neighbour heatmap (Nepal-self row excluded
   by design), 2σ anomaly day markers, event-log annotations (dashed lines + WHY tooltips).
10. **Data Explorer** — raw table browsing, CSV export, print/PDF stylesheet.

**Regional Lens** (`geo_views.js`; data from `extended.json` — see §7 status)
11. **Neighbour Watch** — India vs China avg tone toward all 8 neighbours (Pakistan,
    Bangladesh, Sri Lanka, Bhutan, Maldives, Myanmar, Afghanistan, Nepal) as bars + matrix
    table, plus an attention-share radar.
12. **Cross-Reactions** — threat-framing detector: tone of Indian coverage that mentions China
    activities in Nepal vs India's own Nepal baseline (and the symmetric Chinese side);
    delta = cross-coverage minus baseline.
13. **Nepal Dividend** — aid/investment attention & framing timelines, KPI cards, curated
    ledger of documented India/China assistance to Nepal (with sources), and a **Scenario
    Simulator** (sliders scale each donor's baseline coverage; share bar + verdict recompute).

**Live**
14. **Live Feed** (`feed.js`) — real GDELT DOC headlines in 4 perspectives: India→Nepal,
    China→Nepal (English + Simplified Chinese), Nepal→India&China, World→Nepal. Auto-sliding
    poster carousels (edge arrows fade in on hover, always visible ≤620px, hidden when only
    one page; >40px pointer swipe), per-headline on-device tone chip, per-stream 3-point
    briefing (`summarize.js` — no external AI), domain badges, auto-refresh every 15 min,
    manual REFRESH NOW, explicit error state if API unreachable.

**Reference**
15. **Data Sources** — every source cited in the project (all URLs fetch-verified).
16. **Methodology** — what GDELT tone measures, its limits (sarcasm, n=3 crises, attention≠
    importance), and honest caveats.

## 6. How to run

```bat
:: frontend: no build step — just open it
gdelt-dashboard\index.html

:: backend (optional, for rebuilds):
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
.venv\Scripts\python -m pytest backend\tests -v     :: DSA tests + benchmark
.venv\Scripts\python backend\build_data.py          :: CSVs → data_bundle.js (asserts findings)

:: Regional Lens datasets (only if extended.json is absent):
.venv\Scripts\python backend\build_extended.py      :: resumable, cached, 429-safe
.venv\Scripts\python backend\build_data.py          :: merge extended data into the bundle
```

## 7. CURRENT STATUS — what works, what's in-flight

**Fully working:** Dashboard, all 3 crisis views, Key Findings, Hypothesis Engine, Insight
Engine, Date Explorer, Trends & Anomalies, Data Explorer, Live Feed (needs internet), Data
Sources, Methodology. All locked findings verified.

**In-flight — the 3 Regional Lens views (Neighbour Watch / Cross-Reactions / Nepal Dividend):**
These read `GDELT_DATA.neighbour_matrix / cross_reaction / dividend`, which are only present
after `extended.json` is built and merged into `data_bundle.js`. The build fetches ~40 GDELT
DOC API timeline cells and GDELT is aggressively rate-limiting (HTTP 429 with 5–15 min
cool-downs), so it is slow by design (resumable, cache-preserving). Until it finishes, those
views show an intentional "Regional-lens dataset not built yet… fills in automatically"
placeholder, and the Dividend Scenario Simulator disables itself with an explanatory verdict
(its sliders need the 12-month baselines). **When `extended.json` lands and `build_data.py`
re-runs, all three views and the simulator populate with zero code changes.**

Progress at handoff: 5 of 8 neighbour subjects fetched with real China data (China tone is
*positive* everywhere so far: Nepal +0.62, Bhutan +0.33, Bangladesh +1.21, Pakistan +0.13,
Sri Lanka +0.37 — vs India's consistently negative tones). Remaining: Maldives, Myanmar,
Afghanistan + cross-reaction + dividend cells. To resume/finish: `cmd /c _run_ext.bat` (or
`.venv\Scripts\python backend\build_extended.py`), then
`.venv\Scripts\python backend\build_data.py`.

## 8. Known issues / quirks (do not "fix" blindly)

1. **Hypothesis Engine layout gap** — the density chart and Test Console sit in a
   `grid-template-columns: 2fr 1fr` grid; grid rows stretch to the tallest column (the
   console, especially after RUN TEST unhides the result panel), so empty space appears under
   the chart card. Purely cosmetic. If restyling: let the chart card fill the cell, or move
   guide text under it.
2. **GDELT FIPS 10-4 trap (solved, but remember it)** — the DOC API validates
   `sourcecountry:` against FIPS codes: China is **`CH`**, not `CN`. An invalid code returns an
   empty JSON `{}` that looks like "no data". Both `build_extended.py` and the Live Feed's
   CN·EN stream use `sourcecountry:CH`. A cache guard rejects payloads without a `"timeline"`
   key so this can never silently poison data again.
3. **GDELT rate limits** — the DOC API 429s aggressively. `build_extended.py` handles this with
   exponential backoff + 900s round cool-downs + a persistent cache; don't "simplify" that away.
   The Live Feed shows an explicit error state if the browser can't reach the API.
4. **Live Feed needs internet** — everything else works fully offline (all data is baked into
   `data_bundle.js`).
5. **Screenshot harness mock** — `_preview.html` injects fake articles only with `?mock=1`;
   without it, pages fetch the real API.
6. **`data_bundle.js` is generated** — after ANY CSV change, re-run `backend/build_data.py`.
   It hard-fails if locked findings drift; that failure is a feature.
7. **Two dates, one story** — Sept 9 2025 (Oli resigns, spike) vs Sept 12 2025 (interim
   government). The UI must never merge them.

## 9. RULES for restyling (for the designer / Claude Code)

**Free to change:**
- `style.css` — entirely, it's the theme layer
- `index.html` markup structure/classes — as long as element **IDs** and
  `data-view` attributes survive (JS hooks them)
- Adding new decorative sections, animations, transitions, icons, fonts

**Do NOT touch:**
- Any element `id=` (charts are mounted by ID: `chart-hyp-density`, `chart-nb-bars`,
  `chart-dv-volume`, `nb-matrix`, `dv-sim-ind`, `dv-sim-chn`, `dv-sim-verdict`, etc.)
- `data-view` names on sidebar links (deep-linking via `?view=` depends on them)
- `window.GDELT_DATA` key names or `data_bundle.js` (generated)
- `date_index.js`, `summarize.js`, `insights.js` logic, `globe.js` logic, all of `backend/`
- Any locked number in §2 — the build asserts them and will fail
- The event log's verified URLs and the unverified-spike honesty markers

**Keep working after restyle (acceptance checklist):**
sidebar navigation + `?view=` deep links; all charts render; Hypothesis RUN TEST computes
t/p; sliders recompute curves; Date Explorer range search returns Sept 8–14 2025; global
filter narrows Trends; CSV export downloads; print stylesheet works; Insight Engine answers
with citations; Live Feed carousels slide/swipe and show tone chips; Regional Lens views show
either data or the pending message (never a blank box); locked findings match §2 exactly.

## 10. Design language (current theme, for reference)

Near-black surfaces (`#0b0b0e` range), rounded panels, mono numerals, India red
`#F0544C` vs China cyan `#2CC8E8`, dim grey metadata text, Material Symbols icons,
"intelligence console" aesthetic with `LIVE · GDELT 2.0` and SNAPSHOT chips in the top bar.
The redesign may replace all of this — the constraint is §9, not this palette.

---

*Handoff written 2026-08-26. Git: `main`, all work pushed to `origin/main`
(https://github.com/yogeshpan1/NoiseFloor).*
