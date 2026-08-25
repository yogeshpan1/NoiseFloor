"""Dev helper: print numbered line ranges of a text file.
Usage: .venv\\Scripts\\python _dump.py <path> [start] [end]
1-based inclusive; defaults to whole file. Local scratch tool, not shipped."""
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

path = sys.argv[1]
start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
end = int(sys.argv[3]) if len(sys.argv) > 3 else 10**9
with open(path, encoding="utf-8", errors="replace") as f:
    for i, line in enumerate(f, 1):
        if start <= i <= end:
            print(f"{i}: {line}", end="")
