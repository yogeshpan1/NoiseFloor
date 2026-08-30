# NoiseFloor — Geopolitical Intelligence Dashboard

**BSc Computing final-year Big Data capstone** — Islington College / London Metropolitan University
Big Data with PySpark elective, Summer Industry Enrichment Program.

A PySpark + GDELT pipeline analysing how India's and China's media covered Nepal across three
national crises — the **2015 earthquake**, the **2015 border blockade**, and the **2025 Gen-Z
protests** — exported to CSVs and visualised in a scrollytelling web dashboard.

## Repository layout

```
NoiseFloor/
├── noiseui/                    # React 18 + Vite + Three.js frontend (NoiseUI)
│   ├── src/                    # source code (17 pages, components, utils, data)
│   ├── package.json            # dependencies (React, Three.js, Recharts, Framer Motion)
│   ├── vite.config.js          # Vite build config
│   └── tailwind.config.js      # Tailwind theme (gold/black console aesthetic)
├── backend/                    # Python pipeline + DSA + tests
├── data/                       # Event log + all pipeline CSVs
├── assets/                     # Brand mark + globe (vector + raster)
├── NoiseFloor.ipynb            # Original PySpark notebook
├── notebook_addendum.ipynb     # Nepal->India/China reverse analysis
└── README.md
```

## Visual identity

| | |
|---|---|
| ![Gold-continent globe — Three.js coverage visualisation shown on app load](assets/earth-gold-globe.png) | **Global coverage globe** — every article plotted as a dot on a Three.js sphere, sized by mention volume. The real-time GDELT feed pulses new events live on this surface. Vector source at `assets/earth-gold-globe.svg`; raster fallback at `assets/earth-gold-globe.png`. |

**Palette:** dark (`#0a0a0a`) + gold (`#d4af37`) + alert red (`#e74c3c`) — no bright marketing colours, because the product is a data console, not a landing page.

**Assets directory** (brand mark + globe + all 21 page screenshots):

```
assets/
├── logo-nf.svg          2.8 KB   ← NF monogram (vector)
├── logo-nf.png          102 KB   ← NF monogram (raster, 512×512)
├── earth-gold-globe.svg  87 KB   ← globe continents (vector)
├── earth-gold-globe.png 233 KB   ← globe continents (raster)
└── screenshots/                  ← every page of the dashboard, captured via Playwright
    ├── loading-1.png             preloader frame 1 — typewriter mid-line, starfield
    ├── loading-2.png             preloader frame 2 — bar at 17 %
    ├── globe-intro.png           landing globe with the "Enter Noise Floor" CTA
    ├── dashboard.png             main entry surface (35.5M articles · 96 countries · 3 crises)
    ├── coverage-gap.png          scrolled dashboard showing coverage-gap analysis
    ├── findings.png              the four headline findings (t-test, stability, divergence, drift)
    ├── earthquake.png            2015 Gorkha earthquake — per-actor tone + verified timeline
    ├── blockade.png              2015–16 border blockade — 85-day tone curve + Madhesi unrest
    ├── protests.png              2025 Gen-Z protests — Sept–Nov tone curve + social-media ban
    ├── country-comparison.png    90-country choropleth, India/China outlined, Bhutan in gold
    ├── hypothesis-engine.png     Gaussian density model + live t-test console (HX-001..004)
    ├── insight-engine.png        plain-English Q&A over the verified dataset (TF-IDF retrieval)
    ├── date-explorer.png         binary-search DateIndex lookup with timing trace
    ├── trends-anomalies.png      daily/weekly tone + log volume + Pearson r(0.110)
    ├── data-explorer.png         raw CSV browser with search, column tabs and CSV export
    ├── neighbour-watch.png       India vs China tone toward Nepal / Bhutan / Bangladesh
    ├── cross-reactions.png       cross-coverage tone timelines (4 lines, 30 days)
    ├── nepal-dividend.png        documented aid ledger + what-if scenario simulator
    ├── live-feed.png             4-pane live news feed (IN, CN, NP, World) — GDELT DOC 2.0
    ├── data-sources.png          pipeline architecture + top source countries
    └── methodology.png           6-step pipeline + caveats + reproducibility checklist
```

## Screenshots walkthrough

A capture of every page in the running dashboard. All shots taken in a Chromium viewport of 1440×900 (1100 for the dashboard coverage-gap crop) against the Vite dev server, with the preloader/globe intro shown first.

### Entry experience

| | |
|---|---|
| ![Preloader mid-frame — "Between two" typewriter and 8 % progress bar on a gold-dotted starfield](assets/screenshots/loading-1.png) | **Preloader (frame 1)** — the typewriter-styled story ("Between two superpowers…") animates while a gold progress bar fills on a starfield. |
| ![Globe intro screen with Nepal/China/India highlighted on the gold Earth and the "Enter Noise Floor" CTA](assets/screenshots/globe-intro.png) | **Globe intro** — the gold-continent Earth highlights Nepal (red), India and China as the headline reads "96 countries watched. Two told very different stories." Clicking the CTA enters the dashboard. |

### Crises

| | |
|---|---|
| ![2015 Earthquake page with India tone -2.26, China tone -0.29 and the day-by-day tone curve](assets/screenshots/earthquake.png) | **2015 Gorkha Earthquake** — the headline crisis. India average tone -2.26 vs China -0.29, a 53-day tone curve, and the verified event timeline (USGS, BBC, AP). |
| ![2015 Blockade page with India tone -2.43, China tone -0.45 over an 85-day window](assets/screenshots/blockade.png) | **2015–16 Border Blockade** — the longest crisis window (85 days). India tone -2.43, China tone -0.45, with a 1,366-event Chinese dataset driving the curve. |
| ![2025 Gen-Z Protests page with India tone -2.30, China tone -0.71 and a ~70-day curve](assets/screenshots/protests.png) | **2025 Gen-Z Protests** — the newest crisis. India tone -2.30 (nearly identical to 2015), China -0.71, with the social-media ban and curfew as the verified headline. |

### Analysis suite

| | |
|---|---|
| ![Dashboard entry surface with three headline KPIs and the 3 Major Events header](assets/screenshots/dashboard.png) | **Dashboard** — the main entry surface: 35.5M articles, 96 countries, 3 major crises, plus the section index for the 3 Major Events. |
| ![Dashboard scrolled to the coverage-gap section](assets/screenshots/coverage-gap.png) | **Coverage gap** — the section of the dashboard that frames the rest of the app: how 96 countries covered Nepal but only India and China shaped the dominant narrative. |
| ![Key Findings page with four finding cards: tone gap, stability, correlation, drift](assets/screenshots/findings.png) | **Key Findings** — the four locked headline conclusions: India is ~5× more negative than China, India's tone hasn't shifted in 10 years, the two outlets don't copy each other, and China is slowly drifting more critical. |
| ![Country Comparison page with a 90-country world choropleth and India/China outlined](assets/screenshots/country-comparison.png) | **Country Comparison** — 96 countries (90 mappable + 5 GDELT regional aggregates) on a single choropleth. Click any country for a per-outlet breakdown. |
| ![Hypothesis Engine with two overlapping Gaussian distributions and the HX-001..004 test matrix](assets/screenshots/hypothesis-engine.png) | **Hypothesis Engine** — each actor's tone is modelled as a Gaussian distribution; drag the what-if sliders to shift the means live, then run a two-sample t-test. HX-001 alone rejects the null at p=0.0051. |
| ![Insight Engine — chat-style Q&A panel with three suggested questions and a submission input](assets/screenshots/insight-engine.png) | **Insight Engine** — plain-English Q&A over the verified dataset. Retrieval is hand-built (TF-IDF + inverted index); answers are quoted verbatim, never generated. |
| ![Date Explorer with date-range controls, timing trace, and daily tone + India/China comparison](assets/screenshots/date-explorer.png) | **Date Explorer** — binary-search DateIndex (O(log n + k) per query) with a live timing trace, spike-day counter, and dual-axis daily-tone + India/China curves. |
| ![Trends & Anomalies page with daily/weekly tone, log volume and a volume × tone scatter](assets/screenshots/trends-anomalies.png) | **Trends & Anomalies** — daily/weekly tone with a 7-day rolling baseline, log-scaled volume, and a scatter showing volume and tone are nearly independent (Pearson r = 0.110). |
| ![Data Explorer with column tabs, search box, and the first 100 rows of the daily-sentiment table](assets/screenshots/data-explorer.png) | **Data Explorer** — every raw dataset behind the dashboard, with column tabs (Daily Sentiment, India vs China Daily, Reporting Countries, Incident Summary, Aligned Timeline), search and one-click CSV export. |

### Regional Lens

| | |
|---|---|
| ![Neighbour Watch with a bar chart, attention-share radar, and a per-neighbour matrix](assets/screenshots/neighbour-watch.png) | **Neighbour Watch** — India vs China tone toward every country in their South & East Asian neighbourhood (Nepal, Bhutan, Bangladesh), plus an attention-share radar. |
| ![Cross-Reactions with India/CN baselines and cross-coverage tone timelines over 30 days](assets/screenshots/cross-reactions.png) | **Cross-Reactions** — a threat-framing detector: the tone of Indian coverage that mentions China's activities in Nepal, vs India's own baseline, and the symmetric Chinese side, over 30 days. |
| ![Nepal Dividend — documented engagement ledger and a what-if scenario simulator](assets/screenshots/nepal-dividend.png) | **Nepal Dividend** — a curated ledger of documented India/China aid and investment to Nepal, plus a what-if scenario simulator for how coverage volume could shift. |

### Live + Reference

| | |
|---|---|
| ![Live News Feed with four sections — IN, CN, NP, World — and a window selector](assets/screenshots/live-feed.png) | **Live News Feed** — four real-time GDELT DOC 2.0 streams (India→Nepal, China→Nepal, Nepal→India & China, World→Nepal) with selectable time windows and per-headline tone readings. |
| ![Data Sources page with totals, the 4-stage pipeline architecture, and a top-source-country bar chart](assets/screenshots/data-sources.png) | **Data Sources** — the GDELT ingestion pipeline (raw stream → PySpark parsing → actor extraction → statistical storage), 35.5M raw records, 148,180 Nepal-filtered events, and a top-source-country bar chart. |
| ![Methodology page with the 6-step pipeline, caveats panel, and reproducibility checklist](assets/screenshots/methodology.png) | **Methodology** — a beginner-friendly guide to how we collect data and calculate the results, the caveats that keep us honest, and the full reproducibility checklist. |

## Running everything

### One-time setup (if not already done)
```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
cd noiseui && npm install
```

### Run tests (DSA index correctness + benchmark + locked-findings sanity)
```bash
.venv\Scripts\python -m pytest backend\tests -v
```

### Regenerate the frontend data bundle after any CSV change
```bash
.venv\Scripts\python backend\build_data.py
```

### (Optional) fetch the Regional Lens datasets — resumable, cached, 429-safe
```bash
.venv\Scripts\python backend\build_extended.py
.venv\Scripts\python backend\build_data.py   # merge extended data into the bundle
```

> **Note:** the Cross-Reactions and Nepal Dividend pages already work using an offline-derived
> baseline (see `noiseui/src/data/regionalLens.js` — `source` field on each object). They populate
> immediately on load; the optional GDELT fetch above only enriches them with live 30-day data.

### Open the NoiseUI dashboard (development mode)
```bash
cd noiseui && npm run dev
```

### OR serve the production build
```bash
# (after npm run build, serve noiseui/dist/ with any static server)
python -m http.server 8765 --directory noiseui/dist
```

## GDELT quirk worth knowing
The DOC 2.0 API validates `sourcecountry:` against **FIPS 10-4 codes**, so China is `CH`, not `CN`. An invalid code returns an empty JSON object `{}`, which looks like "no coverage" and can silently poison the dataset cache with nulls for every China cell. Both `build_extended.py` and the Live Feed's CN·EN stream use `sourcecountry:CH`.

The Live Feed calls the GDELT DOC API directly from the browser. If a host ever blocks the request, an explicit error state is shown and the dashboard keeps working.

## Colab work
Upload `notebook_addendum.ipynb` to Colab and run top-to-bottom after the main notebook has produced the `nepal_events` parquet.

## Git workflow

```bat
git remote add origin https://github.com/yogeshpan1/NoiseFloor.git
git push -u origin main        :: authenticate in the browser popup if prompted
```

Commits are split per concern (baseline -> backend/DSA -> frontend features -> docs) so each professor
feedback item can be pointed at its own diff.
