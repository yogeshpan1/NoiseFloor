"""
NoiseFloor — Anomaly detection (stretch feature b)

Flags days where a country's tone deviates more than 2 standard deviations
from its own rolling average (window = 7 previous days, population std).

Deliberately simple and explainable for the viva:
    z_t = (tone_t - mean(tone_{t-7..t-1})) / std(tone_{t-7..t-1})
    flag if |z_t| > 2
No external statistics dependency needed — pure Python.
"""
from __future__ import annotations

from math import sqrt
from typing import Any, Dict, List


def _mean(xs):
    return sum(xs) / len(xs)


def _pstdev(xs):
    m = _mean(xs)
    return sqrt(sum((x - m) ** 2 for x in xs) / len(xs))


def detect_anomalies(rows: List[Dict[str, Any]], tone_key: str,
                     window: int = 7, threshold: float = 2.0) -> List[Dict[str, Any]]:
    """Return flagged days [{event_date, tone, rolling_mean, z}] for a series.

    rows must be sorted ascending by event_date.
    """
    out = []
    tones = []
    for r in rows:
        t = r.get(tone_key)
        if t is None or t == "":
            tones.append(None)
            continue
        t = float(t)
        prev = [x for x in tones[-window:] if x is not None]
        if len(prev) >= 3:
            mu = _mean(prev)
            sd = _pstdev(prev)
            if sd > 1e-9:
                z = (t - mu) / sd
                if abs(z) > threshold:
                    out.append({
                        "event_date": r["event_date"],
                        "tone": round(t, 4),
                        "rolling_mean": round(mu, 4),
                        "z": round(z, 2),
                    })
        tones.append(t)
    return out
