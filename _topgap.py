"""Dev helper: top India-China daily tone-gap days from india_china_comparison.csv."""
import csv, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

rows = []
with open("india_china_comparison.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        try:
            i = float(r["india_tone"]) if r["india_tone"] else None
            c = float(r["china_tone"]) if r["china_tone"] else None
        except ValueError:
            continue
        if i is None or c is None:
            continue
        rows.append((r["event_date"], i, c, round(c - i, 2)))

rows.sort(key=lambda t: -abs(t[3]))
print("total days with both countries:", len(rows))
print("date       india   china   gap(china-india)")
for d, i, c, g in rows[:12]:
    print(f"{d}  {i:7.2f} {c:7.2f} {g:8.2f}")
