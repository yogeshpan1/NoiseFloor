"""
NoiseFloor — build_data.py

Regenerates gdelt-dashboard/data_bundle.js from the exported CSVs.

IMPORTANT (locked findings): the incident averages below are read straight
from the CSVs and are asserted against the LOCKED values — if any drift,
the build FAILS loudly rather than silently changing published results.

Adds new keys on top of the original bundle (originals are byte-compatible):
    event_log   — manually verified causal events (Task 3)
    anomalies   — 2-sigma rolling anomaly flags per country (stretch b)
    neighbors   — all-countries tone/volume for heatmap & small multiples
    weekly      — weekly aggregates of India/China daily tone
Run from repo root:  .venv\\Scripts\\python backend\\build_data.py
"""
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "gdelt-dashboard", "data_bundle.js")

# ---- LOCKED FINDINGS: do not change; build fails if CSVs ever disagree ----
LOCKED_INCIDENTS = {
    ("India", "2015 Earthquake"): -2.2623,
    ("China", "2015 Earthquake"): -0.2866,
    ("India", "2015 Blockade"): -2.4345,
    ("China", "2015 Blockade"): -0.445,
    ("India", "2025 Gen-Z Protest"): -2.2958,
    ("China", "2025 Gen-Z Protest"): -0.7109,
}

sys.path.insert(0, os.path.join(ROOT, "backend"))
from anomaly import detect_anomalies  # noqa: E402


def load_csv(name):
    path = os.path.join(ROOT, name)
    if not os.path.exists(path):
        path = os.path.join(ROOT, "data", name)
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    # coerce numeric-looking fields (keep None for blanks)
    out = []
    for r in rows:
        d = {}
        for k, v in r.items():
            if k is None:
                continue
            v = (v or "").strip()
            if v == "":
                d[k] = None
            else:
                try:
                    f = float(v)
                    d[k] = int(f) if f.is_integer() else f
                except ValueError:
                    d[k] = v
        out.append(d)
    return out


def _mean(xs):
    return sum(xs) / len(xs)


def main():
    bundle = {}

    incidents = load_csv("full_three_way_comparison.csv")
    if not incidents:
        raise SystemExit("full_three_way_comparison.csv missing/empty")
    bundle["incidents_summary"] = incidents

    daily = load_csv("daily_sentiment.csv")
    for r in daily:
        r["is_spike"] = str(r.get("is_spike")) in ("True", "true")
    bundle["daily_sentiment"] = daily

    ic_daily = load_csv("india_china_comparison.csv")
    bundle["india_china_daily"] = ic_daily

    countries = load_csv("source_countries.csv")
    bundle["countries"] = countries

    timeline = load_csv("combined_timeline_all_three.csv")
    bundle["timeline_all_three"] = timeline

    aligned = load_csv("combined_timeline_aligned.csv")
    bundle["timeline_aligned"] = aligned

    bundle["quadclass"] = load_csv("quadclass_comparison_pct.csv")
    bundle["quadclass_raw"] = load_csv("quadclass_comparison.csv")

    # ---- NEW: verified causal event log (Task 3) ----
    bundle["event_log"] = [e for e in load_csv("event_log.csv") if e.get("date")]

    # ---- NEW: anomaly detection (stretch b) ----
    ic_sorted = sorted(ic_daily, key=lambda r: r["event_date"])
    bundle["anomalies"] = {
        "india": detect_anomalies(ic_sorted, "india_tone"),
        "china": detect_anomalies(ic_sorted, "china_tone"),
        "overall": detect_anomalies(daily, "avg_tone"),
    }

    # ---- NEW: neighbors table for heatmap / small multiples ----
    NEIGHBOR_META = {
        "IND": "India", "CHN": "China", "BTN": "Bhutan", "BGD": "Bangladesh",
        "PAK": "Pakistan", "LKA": "Sri Lanka", "MDV": "Maldives",
        "AFG": "Afghanistan", "MMR": "Myanmar", "NPL": "Nepal (self)",
    }
    bundle["neighbors"] = [
        {
            "code": c["Actor1CountryCode"],
            "name": NEIGHBOR_META.get(c["Actor1CountryCode"], c["Actor1CountryCode"]),
            "is_neighbor": c["Actor1CountryCode"] in NEIGHBOR_META,
            "event_count": c["event_count"],
            "avg_tone": c["avg_tone"],
        }
        for c in countries
    ]

    # ---- NEW: weekly aggregation of India/China daily tone ----
    import datetime as _dt

    def iso_week(date_str):
        y, m, d = map(int, date_str.split("-"))
        return date_str[:4] + "-W" + f"{_dt.date(y, m, d).isocalendar()[1]:02d}"

    weekly = {}
    for r in ic_sorted:
        wk = iso_week(r["event_date"])
        slot = weekly.setdefault(wk, {"week": wk, "india_sum": [], "china_sum": []})
        if r["india_tone"] is not None:
            slot["india_sum"].append(r["india_tone"])
        if r["china_tone"] is not None:
            slot["china_sum"].append(r["china_tone"])
    bundle["weekly_india_china"] = [
        {
            "week": s["week"],
            "india_tone": round(_mean(s["india_sum"]), 4) if s["india_sum"] else None,
            "china_tone": round(_mean(s["china_sum"]), 4) if s["china_sum"] else None,
        }
        for _, s in sorted(weekly.items())
    ]

    # ---- Verify locked findings before writing ----
    for r in incidents:
        key = (r.get("country"), r.get("incident"))
        if key in LOCKED_INCIDENTS:
            got = round(float(r.get("avg_tone") or 999), 4)
            assert abs(got - LOCKED_INCIDENTS[key]) < 1e-6, (
                f"LOCKED VALUE DRIFT for {key}: csv={got} locked={LOCKED_INCIDENTS[key]}"
            )
    present = {(r.get("country"), r.get("incident")) for r in incidents}
    missing = set(LOCKED_INCIDENTS) - present
    assert not missing, f"locked incident rows missing: {missing}"

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* AUTO-GENERATED by backend/build_data.py - do not edit by hand.\n")
        f.write("   Regenerate with: .venv/Scripts/python backend/build_data.py   */\n")
        f.write("window.GDELT_DATA = ")
        json.dump(bundle, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    n_anom = len(bundle["anomalies"]["india"]) + len(bundle["anomalies"]["china"])
    print(f"Wrote {OUT}")
    print("keys:", ", ".join(bundle.keys()))
    print(f"locked findings verified OK; {len(bundle['event_log'])} events, {n_anom} country anomalies")


if __name__ == "__main__":
    main()

