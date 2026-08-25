"""Dev helper: print daily_sentiment rows in a date window."""
import csv, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

start, end = sys.argv[1], sys.argv[2]
with open("daily_sentiment.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if start <= r["event_date"] <= end:
            print(r["event_date"], r["total_events"], r["avg_tone"], r["is_spike"])
