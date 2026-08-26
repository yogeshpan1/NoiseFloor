"""
NoiseFloor — build_extended.py

Fetches the extra GDELT DOC 2.0 timeline series that power the three
Regional Lens views (Neighbour Watch, Cross-Reactions, Nepal Dividend).

Resumable: every successful API result is cached to _cellcache.json inside
gdelt-dashboard/data/extended/, so re-running continues where it stopped —
important because GDELT rate-limits aggressively (HTTP 429).

Usage:
    .venv\\Scripts\\python backend/build_extended.py
    .venv\\Scripts\\python backend/build_extended.py --refresh   # ignore cache

Never mutates the locked statistical findings.
"""
import argparse
import json
import os
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "gdelt-dashboard", "data", "extended")
OUT = os.path.join(OUT_DIR, "extended.json")
CACHE = os.path.join(OUT_DIR, "_cellcache.json")

API = "https://api.gdeltproject.org/api/v2/doc/doc"
TIMESPAN = "1y"
GAP = 20                         # seconds between requests (raised: GDELT rate-limits hard)
BACKOFF = (60, 120, 300, 600)    # escalating waits on HTTP 429
COOLDOWN = 900                   # whole-build cool-down after a cell exhausts BACKOFF
MAX_ROUNDS = 24                  # give up only after ~6h of cool-down cycles

REPORTERS = {"india": "sourcecountry:IN", "china": "sourcecountry:CH"}
# NOTE: GDELT DOC API uses FIPS 10-4 codes - China is CH, not CN. An invalid
# code makes the API return an empty JSON object {}, which silently poisons
# the cache with "no data" (this is why every china cell was None before).

SUBJECTS = {
    "nepal": "(nepal OR kathmandu)",
    "bhutan": "(bhutan OR thimphu)",
    "bangladesh": "(bangladesh OR dhaka)",
    "pakistan": "(pakistan OR islamabad)",
    "sri lanka": '("sri lanka" OR colombo)',
    "maldives": "(maldives)",
    "myanmar": "(myanmar OR yangon)",
    "afghanistan": "(afghanistan OR kabul)",
}

_CACHE = {}


def load_cache():
    global _CACHE
    try:
        with open(CACHE, encoding="utf-8") as f:
            _CACHE = json.load(f)
    except (OSError, ValueError):
        _CACHE = {}
    return _CACHE


def save_cache():
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = CACHE + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(_CACHE, f, ensure_ascii=False)
    os.replace(tmp, CACHE)


def doc_fetch(params):
    """GET one DOC API JSON payload; raises after exhausting BACKOFF."""
    url = API + "?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(len(BACKOFF) + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NoiseFloor-capstone/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode("utf-8", errors="replace")
            return json.loads(raw)
        except json.JSONDecodeError as e:
            # GDELT occasionally serves an HTML/text error page with HTTP 200
            last = e
            if attempt < len(BACKOFF):
                print(f"    non-JSON response; waiting {BACKOFF[attempt]}s…", flush=True)
                time.sleep(BACKOFF[attempt])
            else:
                raise
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429 and attempt < len(BACKOFF):
                print(f"    429; waiting {BACKOFF[attempt]}s…", flush=True)
                time.sleep(BACKOFF[attempt])
            else:
                raise
        except urllib.error.URLError as e:   # timeouts / DNS / refused connections
            last = e
            if attempt < len(BACKOFF):
                print(f"    network error ({e.reason}); waiting {BACKOFF[attempt]}s…", flush=True)
                time.sleep(BACKOFF[attempt])
            else:
                raise
    raise last



def cached_fetch(key, params):
    """doc_fetch backed by a persistent per-key cache."""
    if key in _CACHE:
        print(f"    [cache] {key}", flush=True)
        return _CACHE[key]
    payload = doc_fetch(params)
    if not isinstance(payload, dict) or "timeline" not in payload:
        # {} is what the API returns for an invalid query (e.g. bad FIPS code);
        # never cache it as if it were real "no coverage" data.
        raise ValueError(f"non-timeline payload for {key}: {str(payload)[:80]!r}; not caching")
    _CACHE[key] = payload
    time.sleep(GAP)
    save_cache()
    return payload


def avg_timeline(payload):
    try:
        data = payload["timeline"][0]["data"]
        vals = [float(p.get("value") or 0) for p in data]
        return (sum(vals) / len(vals) if vals else None), vals
    except (KeyError, IndexError, TypeError, ValueError):
        return None, []


def tone_series(payload):
    try:
        return [{"date": p.get("date"), "value": round(float(p.get("value") or 0), 4)}
                for p in payload["timeline"][0]["data"]]
    except (KeyError, IndexError, TypeError, ValueError):
        return []


def build():
    out = {"generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "timespan": TIMESPAN}

    # ---- 1. Neighbour matrix -------------------------------------------------
    print("[1/3] neighbour matrix…", flush=True)
    matrix = []
    for subject, frag in SUBJECTS.items():
        row = {"subject": subject}
        for rep, filt in REPORTERS.items():
            q = f"{frag} {filt}"
            tone_p = cached_fetch(f"tone|{subject}|{rep}",
                                  {"query": q, "mode": "timelinetone",
                                   "timespan": TIMESPAN, "format": "json"})
            vol_p = cached_fetch(f"vol|{subject}|{rep}",
                                 {"query": q, "mode": "timelinevol",
                                  "timespan": TIMESPAN, "format": "json"})
            tone, _ = avg_timeline(tone_p)
            vol, _ = avg_timeline(vol_p)
            row[f"{rep}_tone"] = round(tone, 4) if tone is not None else None
            row[f"{rep}_vol"] = round(vol, 3) if vol is not None else None
        print(f"    {row['subject']}: india={row['india_tone']} china={row['china_tone']}", flush=True)
        matrix.append(row)
    out["neighbour_matrix"] = matrix

    # ---- 2. Cross-reactions --------------------------------------------------
    print("[2/3] cross-reaction timelines…", flush=True)
    nep = SUBJECTS["nepal"]
    cross_queries = {
        "in_china": f'((china OR chinese OR beijing OR bri OR "belt and road")) {nep} {REPORTERS["india"]}',
        "in_base": f'{nep} {REPORTERS["india"]}',
        "cn_india": f'((india OR indian OR delhi OR modi)) {nep} {REPORTERS["china"]}',
        "cn_base": f'{nep} {REPORTERS["china"]}',
    }
    cross = {}
    for key, q in cross_queries.items():
        s = tone_series(cached_fetch(f"cross|{key}",
                        {"query": q, "mode": "timelinetone",
                         "timespan": TIMESPAN, "format": "json"}))
        vals = [p["value"] for p in s]
        cross[key] = {"avg_tone": round(sum(vals) / len(vals), 4) if vals else None,
                      "series": s}
        print(f"    {key}: n={len(s)} avg={cross[key]['avg_tone']}", flush=True)
    out["cross_reaction"] = cross

    # ---- 3. Nepal Dividend ---------------------------------------------------
    print("[3/3] aid & investment framing…", flush=True)
    div = {}
    div_queries = {
        "india": "((aid OR grant OR assistance OR investment OR loan) (india OR indian OR delhi) nepal)",
        "china": '((aid OR grant OR assistance OR investment OR loan OR bri OR "belt and road") (china OR chinese OR beijing) nepal)',
    }
    for key, q in div_queries.items():
        vol_p = cached_fetch(f"divvol|{key}",
                             {"query": q, "mode": "timelinevol",
                              "timespan": TIMESPAN, "format": "json"})
        tone_p = cached_fetch(f"divtone|{key}",
                              {"query": q, "mode": "timelinetone",
                               "timespan": TIMESPAN, "format": "json"})
        vavg, vvals = avg_timeline(vol_p)
        tavg, _ = avg_timeline(tone_p)
        vdates = [p.get("date") for p in vol_p.get("timeline", [{}])[0].get("data", [])]
        div[key] = {
            "attention_avg": round(vavg, 3) if vavg is not None else None,
            "tone_avg": round(tavg, 4) if tavg is not None else None,
            "volume_series": [{"date": d, "value": round(v, 3)}
                              for d, v in zip(vdates, vvals)],
        }
        print(f"    {key}: attn={div[key]['attention_avg']} tone={div[key]['tone_avg']}", flush=True)
    out["dividend"] = div
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true",
                    help="ignore the persistent cell cache and refetch everything")
    args = ap.parse_args()
    if args.refresh and os.path.exists(CACHE):
        os.remove(CACHE)
    load_cache()

    data = None
    for attempt in range(1, MAX_ROUNDS + 1):
        try:
            data = build()
            break
        except (urllib.error.HTTPError, urllib.error.URLError,
                json.JSONDecodeError, ValueError) as e:
            # JSONDecodeError/ValueError: GDELT served a non-JSON or empty
            # payload for every backoff attempt on this cell — cool down and
            # retry the round instead of dying (cache is preserved either way).
            print(f"[round {attempt}/{MAX_ROUNDS}] cell exhausted backoffs "
                  f"({e}); cooling down {COOLDOWN}s — cache preserved, "
                  f"will resume automatically", flush=True)
            time.sleep(COOLDOWN)
    if data is None:
        raise SystemExit(f"gave up after {MAX_ROUNDS} cool-down rounds; "
                         "cache preserved — rerun to resume")

    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, OUT)
    save_cache()
    print(f"wrote {OUT} ({len(_CACHE)} cached API cells)")


if __name__ == "__main__":
    main()
