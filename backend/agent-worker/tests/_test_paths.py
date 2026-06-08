from __future__ import annotations

from pathlib import Path
import sys


WORKER_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = WORKER_ROOT.parents[1]

for path in (WORKER_ROOT / "src", REPO_ROOT / "shared" / "contracts" / "python"):
    path_text = str(path)
    if path_text not in sys.path:
        sys.path.insert(0, path_text)
