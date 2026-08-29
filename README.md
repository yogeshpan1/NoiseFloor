<<<<<<< HEAD
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
=======
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
├── noiseui/                    # React 18 + Vite + Three.js frontend (NoiseUI)
│   ├── src/                    # source code (17 pages, components, utils, data)
│   ├── package.json            # dependencies (React, Three.js, Recharts, Framer Motion)
│   ├── vite.config.js          # Vite build config
│   └── tailwind.config.js      # Tailwind theme (gold/black console aesthetic)
├── backend/                    # Python pipeline + DSA + tests
├── data/                       # Event log + pipeline CSVs
├── *.csv                       # Pipeline outputs (daily_sentiment, comparisons...)
├── NoiseFloor.ipynb            # Original PySpark notebook
├── notebook_addendum.ipynb     # Nepal->India/China reverse analysis
├── README.md
└── PROJECT_HANDOFF.md          # Brief for UI collaborators
```
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

:: open the NoiseUI dashboard (development mode)
cd noiseui && npm run dev

:: OR serve the production build
:: (after npm run build, serve noiseui/dist/ with any static server)
python -m http.server 8765 --directory noiseui/dist
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


>>>>>>> a8bbf1907bc9c63e8fdc0a95cc0cd099232e43db
