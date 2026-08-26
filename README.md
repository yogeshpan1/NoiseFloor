# NoiseFloor — Geopolitical Intelligence Dashboard

**BSc Computing final-year Big Data capstone** — Islington College / London Metropolitan University
Big Data with PySpark elective, Summer Industry Enrichment Program.

A PySpark + GDELT pipeline analysing how India's and China's media covered Nepal across three
national crises — the **2015 earthquake**, the **2015 border blockade**, and the **2025 Gen-Z
protests** — exported to CSVs and visualised in a scrollytelling web dashboard.

---

## ⚠️ LOCKED FINDINGS — do not alter

All values below are asserted by `backend/build_data.py` at build time; the build **fails** if the
CSVs ever drift from them:

| Incident | India avg tone | China avg tone |
|---|---|---|
| 2015 Earthquake | −2.2623 | −0.2866 |
| 2015 Blockade | −2.4345 | −0.4450 |
| 2025 Gen-Z Protest | −2.2958 | −0.7109 |

- Stat significance: **t = −13.95, p = 0.0051, r = −0.0235**
- Verbal cooperative coverage: **62.65% (2015) → 56.10% (2025)**
- Bhutan is the only neighbour with positive tone (**+1.64, n=59**)
- **Sept 9, 2025** was the major coverage spike day (30.99× baseline)

---

## ✅ FACTUAL CORRECTION (professor feedback) — Sept 9 vs Sept 12

These are **two different events on two different dates**:

| Date | What actually happened |
|---|---|
| **Sept 9, 2025** | Gen-Z protests peaked & turned violent; parliament burned; curfew imposed; **PM K.P. Sharma Oli resigned** |
| **Sept 12, 2025** | **Interim government sworn in under Sushila Karki** (first woman PM); parliament dissolved |

Audit result across the repo:

- `gdelt-dashboard/index.html` — the "Interim government formed" row was already on the **Sep 12**
  table row → correct, untouched.
- The Sept 9 spike callout was sharpened to explicitly say *"Oli resigned"* on the 9th and to point
  at **September 12** for the interim-government formation.
- `NoiseFloor.ipynb` — scanned all 64 cells; no cell labels Sept 9 as government formation → no edit needed.
- `data/event_log.csv` — encodes both dates explicitly with sources (see Task 3 below).

---

## Repository layout

```
NoiseFloor/
├── NoiseFloor.ipynb            # original Colab PySpark pipeline (unchanged)
├── notebook_addendum.ipynb     # NEW: Colab cells — Nepal→India/China reverse direction,
│                               #   neighbour×incident matrix for the heatmap
├── data/
│   └── event_log.csv           # NEW: manually verified causal event log (date,event,source)
├── backend/                    # Python tooling (run inside .venv)
│   ├── date_index.py           # NEW: DSA component — DateIndex (see below)
│   ├── anomaly.py              # NEW: 2σ rolling-mean anomaly detection
│   ├── build_data.py           # NEW: CSVs → data_bundle.js (asserts locked findings)
│   ├── requirements.txt
│   └── tests/test_date_index.py# NEW: incl. empirical before/after benchmark
├── gdelt-dashboard/            # static frontend ("antigravity" build, Version B)
│   ├── index.html              # existing views + NEW: Date Explorer / Trends / Live Feed
│   ├── app.js                  # existing logic + new views' logic
│   ├── date_index.js           # NEW: JS twin of the DSA DateIndex (load-bearing!)
│   ├── feed.js                 # NEW: GDELT DOC API live feeds, 15-min auto-refresh
│   ├── style.css               # feed/heatmap/print styles
│   ├── data_bundle.js          # generated — run backend/build_data.py after any CSV change
│   ├── globe.js                # NEW: dependency-free 3D coverage globe (Dashboard)
│   ├── summarize.js            # NEW: headline tone lexicon + extractive 3-point briefings
│   ├── geo_views.js            # NEW: Neighbour Watch / Cross-Reactions / Nepal Dividend views
│   ├── insights.js             # NEW: Insight Engine — TF-IDF inverted-index Q&A over verified findings
│   └── data/extended/          # generated cache from backend/build_extended.py
└── *.csv                       # original pipeline exports (untouched)
```

## 🎨 2026 redesign — Figma console UI + Regional Lens

The dashboard was rebuilt around a dark intelligence-console design (near-black surfaces,
rounded panels, mono numerals; India red `#F0544C` vs China cyan `#2CC8E8`). All previous
views and every locked statistic are preserved.

New since the original build:

- **Figma-replica shell** — grouped sidebar navigation, top bar with live view title,
  `DATASET GDELT / LAST UPDATED` sidebar footer, KPI cards with big mono values.
- **3D Coverage Globe** (Dashboard) — hand-rolled orthographic canvas projection: one dot per
  source country sized by Nepal-coverage volume, pulsing Nepal marker, great-circle arcs from
  India and China. Drag to rotate, auto-spins when idle. No WebGL/library dependencies.
- **Regional Lens views** (`backend/build_extended.py` → `geo_views.js`):
  - *Neighbour Watch* — India vs China tone toward **every** neighbour (Pakistan, Bangladesh,
    Sri Lanka, Bhutan, Maldives, Myanmar, Afghanistan, Nepal) with attention-share radar.
  - *Cross-Reactions* — how Indian media frames China's activities in Nepal (and vice versa):
    rival-mention coverage tone vs each outlet's own baseline, i.e. a threat-framing detector.
  - *Nepal Dividend* — aid/investment attention & framing timelines plus a curated ledger of
    documented assistance with sources.
- **Live Feed upgrade** — every headline carries an on-device tone chip, and each stream gets a
  3-point **AI briefing** generated locally by `summarize.js` (lexicon sentiment + term-frequency
  extraction over the retrieved titles). No external AI service; nothing invented.
- **Insight Engine** — ask questions in plain English; a hand-built **verified-answer search**
  engine (inverted index → TF-IDF retrieval → cited passages) answers strictly from NoiseFloor's
  verified event log, findings and methodology — retrieved text is shown verbatim, never generated.
  DSA showcase #2 alongside the DateIndex.


## 🆕 Feature map (what was added where)

### Task 1 — Date-specific search
- **UI**: sidebar → *Date Explorer* (`index.html` view `view-dateexplorer`, logic in `app.js`
  `initDateExplorer()` / `runDateSearch()`).
- Single-date or range mode; returns matching days, total events, avg tone, spike count,
  India-vs-China tone chart, daily volume+tone chart, tagged events from the event log.
- **Global filter checkbox** narrows the Gen-Z waveform and Trends charts via the same index.
- Preset button jumps to the Sept 8–14, 2025 spike week.

### Task 2 — More visuals
Sidebar → *Trends & Anomalies* (`app.js`: `buildToneOverTime`, `buildVolumeChart`,
`buildScatter`, `buildHeatmap`, `buildAnomalyTable`):

- Tone-over-time per country, daily **or weekly** granularity toggle.
- Article-volume-over-time (attention) on a log axis, separate from tone.
- Volume × tone scatter with Pearson r computed client-side — shows attention ≠ sentiment.
- Neighbour comparison table-heatmap: every publishing country, colour-coded average tone.

All timeline charts carry **event-log annotations**: dashed vertical lines + tooltip "WHY" text.

### Task 3 — Causal context for spikes
- `data/event_log.csv`: small, **manually verified** event log (date, event, description, source
  URL, confidence). Unexplained spike days (e.g. the 2024-09-01 blip in `daily_sentiment.csv`) are
  marked `unverified` rather than given invented causes.
- Rendered as annotations/tooltips on Trends charts and as a lookup table inside Date Explorer.

### Task 4 — DSA component: custom date index ⭐
- **Python engine**: `backend/date_index.py` — `DateIndex` class.
- **JS twin**: `gdelt-dashboard/date_index.js` — `NFDateIndex`; this is what actually answers every
  search in the browser.
- Structure: a **sorted array of distinct dates** (binary-searched with hand-implemented
  lower/upper bounds) plus an **inverted index** `Map<date, rowId[]>` built once at load time.
- Complexity:

  | | build | exact date | range query |
  |---|---|---|---|
  | **DateIndex** | O(n log n) once | O(1) avg | **O(log n + k)** |
  | naive scan (before) | — | O(n) | O(n) |

  `n` = rows, `k` = matches. Before, every filter re-scanned every row; now the index is paid for
  once and each query costs two binary searches (≈ ⌈log₂97⌉ steps over distinct dates) plus only
  the matching rows. The gap widens with dataset size since search grows as log₂(n).
- Empirical before/after proof:
  `.venv\Scripts\python -m pytest backend\tests -v` — see `test_benchmark_beats_linear`.
- One deliberately load-bearing structure (no decorative heaps/trees), documented inline for the viva.

### Stretch features
- **(a) Country-comparison mode** — legend-click isolation/diffing on the tone-over-time chart.
- **(b) Anomaly detection** — `backend/anomaly.py` flags days with |z| > 2 vs the country's own
  7-day rolling mean; shown as red/cyan triangle markers + an anomaly log table.
- **(c) Spike-day headlines** — "FETCH REAL HEADLINES" button in Date Explorer pulls actual article
  titles for the selected window from the GDELT DOC API (nothing invented).
- **(d) Exportable report** — CSV export of the filtered window + print/PDF snapshot
  (dedicated print stylesheet).

### User-requested additions
1. **Nepal's tone toward India & China** (reverse direction): needs the Spark-scale event data, so
   it ships as ready-to-run Colab cells in `notebook_addendum.ipynb` (Part R1) producing
   `nepal_toward_india_china.csv`. The live "now" layer works without Colab (next items).
2. **Live foreign-media feed on Nepal** — sidebar → *Live Feed*, section A: Indian & Chinese
   coverage including **native-language streams** (`sourcelang:hindi`,
   `sourcelang:simplifiedchinese`) via the GDELT DOC 2.0 API (`feed.js`).
3. **Nepali media covering India & China** — same view, section B (`sourcecountry:np`).
4. Both sections **auto-refresh every 15 minutes** (matching GDELT's own index lag); manual
   REFRESH NOW button included; explicit error state if the API is unreachable.

## Running everything

```bat
:: one-time setup (already done in this workspace)
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt

:: run tests (DSA index correctness + benchmark + locked-findings sanity)
.venv\Scripts\python -m pytest backend\tests -v

:: regenerate the frontend data bundle after any CSV change
.venv\Scripts\python backend\build_data.py

:: (optional) fetch the Regional Lens datasets — resumable, cached, 429-safe
.venv\Scripts\python backend\build_extended.py
.venv\Scripts\python backend\build_data.py   :: merge extended data into the bundle

:: open the dashboard (no server needed — pure static files)
start gdelt-dashboard\index.html
```

> **GDELT quirk worth knowing (cost us a debugging session):** the DOC 2.0 API
> validates `sourcecountry:` against **FIPS 10-4 codes**, so China is `CH`, not
> `CN`. An invalid code does not error — the API returns an empty JSON object
> `{}`, which looks like "no coverage" and (before a cache guard was added)
> silently poisoned the dataset cache with nulls for every China cell. Both
> `build_extended.py` and the Live Feed's CN·EN stream use `sourcecountry:CH`.

The Live Feed calls the GDELT DOC API directly from the browser (the API sends CORS-friendly
headers). If a host ever blocks the request, an explicit error state is shown and the rest of the
dashboard keeps working.

Colab work (reverse-direction stats, neighbour matrix): upload `notebook_addendum.ipynb` to Colab
and run top-to-bottom after the main notebook has produced the `nepal_events` parquet.

## Git workflow

```bat
git remote add origin https://github.com/yogeshpan1/NoiseFloor.git
git push -u origin main        :: authenticate in the browser popup if prompted
```

Commits are split per concern (baseline → backend/DSA → frontend features → docs) so each professor
feedback item can be pointed at its own diff.


