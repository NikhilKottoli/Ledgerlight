"""Plan 02 task 2.8: Claims linter — scans generated text, UI strings, docs for banned patterns."""
from __future__ import annotations
import re
from pathlib import Path

# Banned patterns (regex, description)
BANNED = [
    (r"\busers?\b(?!.*\b(?:unique sender addresses|addresses|active accounts)\b)", 
     '"users" without "unique sender addresses"/"addresses" qualifier'),
    (r"\bburn\b.*\bbuyback\b|\bbuyback\b.*\bburn\b", 
     '"burn" used for buyback quantity'),
    (r"\brevenue\b.*\bvolume\b|\bvolume\b.*\brevenue\b", 
     '"revenue" and "volume" equated in one sentence'),
    (r"\bgross\b.*\bnet\b.*\brevenue\b|\bnet\b.*\bgross\b.*\brevenue\b",
     '"gross" and "net" revenue conflated'),
]

# Allow-list for paths that document the rules themselves (meta-documentation)
ALLOW_PATHS = {
    "metrics/registry.yaml", "web/src/app/flows/page.tsx", "pipeline/flows/ledger.py",
    "AGENTS.md", "DECISIONS.md", "plans/", "research/", "THIRD_PARTY_NOTICES.md",
    "pipeline/verify/claims_lint.py",
    "README.md", "pipeline/types/units.py", "web/src/app/page.tsx",
}

# Exclude patterns - exact directory names
EXCLUDE_DIRS = {".venv", "node_modules", ".git", "__pycache__", ".next", "data", "raw", "out"}

def should_scan(path: Path) -> bool:
    rel = str(path.relative_to(Path.cwd()))
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return False
    for allow in ALLOW_PATHS:
        if rel.startswith(allow):
            return False
    return True

def scan_file(path: Path) -> list[tuple[int, str, str]]:
    violations = []
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception:
        return violations
    for i, line in enumerate(lines, 1):
        for pattern, desc in BANNED:
            if re.search(pattern, line, re.IGNORECASE):
                violations.append((i, desc, line.strip()[:120]))
    return violations

def main():
    root = Path.cwd()
    all_violations = []
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in {".md", ".py", ".ts", ".tsx", ".json", ".yaml", ".yml", ".txt", ".html"}:
            if should_scan(path):
                for line_no, desc, snippet in scan_file(path):
                    all_violations.append((path, line_no, desc, snippet))

    if all_violations:
        print(f"CLAIMS LINT FAILED: {len(all_violations)} violation(s)")
        for path, line_no, desc, snippet in all_violations:
            print(f"  {path}:{line_no}: {desc} — {snippet}")
        return 1
    print("Claims lint: PASS")
    return 0

if __name__ == "__main__":
    exit(main())
