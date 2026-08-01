# NoiseFloor

**How loud does a country have to be to break through the noise floor of global media?**

A Big Data pipeline that measures how international media covers Nepal — comparing India's and China's news sentiment toward Nepal across three major crises spanning a decade: the 2015 earthquake, the 2015 India-Nepal border blockade, and the 2025 Gen-Z protests.

Built as a capstone project for the Big Data with PySpark module, Islington College Summer Industry Enrichment Program.

---

## The Question

When Nepal faces a crisis — a natural disaster, a diplomatic dispute, or political unrest — how does international media react? And do India and China, Nepal's two largest neighbours, cover these events differently?

Using the [GDELT Project](https://www.gdeltproject.org/) — a free, open database that monitors global news in 100+ languages every 15 minutes — this project builds an automated pipeline to answer that question with real data, not assumption.

## Key Finding

Across three structurally different crises spanning ten years, **Indian media coverage of Nepal was consistently more negative than Chinese coverage** — by a margin of roughly 1.5 to 2.0 points on GDELT's tone scale, in every single incident measured.

| Incident | India Avg Tone | China Avg Tone | India Events | China Events |
|---|---|---|---|---|
| 2015 Earthquake | -2.26 | -0.29 | 1,277 | 1,849 |
| 2015 Blockade | -2.43 | -0.45 | 859 | 1,366 |
| 2025 Gen-Z Protest | -2.30 | -0.71 | 568 | 368 |

A paired t-test across the three incidents confirms this pattern is statistically significant (t = -13.95, p = 0.0051), though the small sample size (n=3 incidents) means this should be read as a consistent pattern worth further study, not a definitive conclusion.

## Dataset Scale

- **21,998 GDELT files** processed across three time windows
- **~10 years** of comparative data (April 2015 – November 2025)
- Millions of raw global news events, filtered down to Nepal-specific coverage

| Incident | Time Window | Files Processed |
|---|---|---|
| 2015 Nepal Earthquake | Apr 15 – Jun 15, 2015 | 5,944 |
| 2015 India-Nepal Blockade | Aug 15 – Nov 15, 2015 | 8,758 |
| 2025 Gen-Z Protest | Sep 1 – Nov 15, 2025 | 7,296 |

## Pipeline Architecture

```
GDELT Master File List (free, no API key)
        ↓
   Bash download loop (curl + unzip)
        ↓
   Raw CSV landing zone
        ↓
   PySpark ETL — schema enforcement, date parsing
        ↓
   Nepal event filter (clean vs dead-letter pattern)
        ↓
   Parquet (snappy compression) — processed zone
        ↓
   Spark SQL — daily sentiment, spike detection,
   country comparison, event-type breakdown
        ↓
   CSV export → Power BI dashboard
```

## Tech Stack

- **Apache Spark (PySpark)** — distributed ETL and analysis, run on Google Colab
- **Spark SQL** — aggregations, window functions, joins
- **Parquet** — columnar storage (benchmarked faster than raw CSV reads)
- **Bash** — automated download pipeline, directory structuring
- **Power BI** — final dashboard and visualization
- **scipy** — statistical significance testing (t-tests)

## Analysis Performed

- Daily sentiment tracking (`AvgTone`) across each incident window
- Rolling 30-day spike/anomaly detection
- India vs China coverage comparison (volume + tone)
- Statistical significance testing (paired and independent t-tests)
- Tone correlation between India and China coverage patterns
- Event-type breakdown using GDELT's QuadClass (cooperation vs conflict framing)
- Cross-incident timeline alignment ("days since crisis start") for direct comparison across different calendar periods

## Performance

Parquet reads significantly outperform raw CSV reads for repeated queries — full benchmark numbers are documented in the notebook.

## Data Source

All data sourced from the [GDELT Project](https://www.gdeltproject.org/) — free and publicly available, no API key or cost required.

## Repository Structure

```
NoiseFloor/
├── NoiseFloor.ipynb          # Full pipeline: download, ETL, analysis
├── noisefloor_pipeline/       # Processed data and exports
│   └── processed/
│       └── powerbi_exports/   # CSVs feeding the Power BI dashboard
└── README.md
```

## Author

Yogesh Pant — BSc (Hons) Computing, Islington College (London Metropolitan University)

---

*Note: GDELT's `AvgTone` measures sentiment expressed in news text, not factual accuracy. Findings describe patterns in media framing, not claims about the truthfulness of coverage.*
