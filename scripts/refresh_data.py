#!/usr/bin/env python3
"""Refresh the vendored calculator data from the upstream data repository.

Fetches https://github.com/Cambridge-Sustainable-Computing-Lab/Green-Algorithms-data
(or reads a local clone via --source), copies the files the static site needs
into sources/<version>/, and regenerates site/data.js.

After running, run the tests (cd tests && npm install && npm test) and review
the git diff before committing. If new data versions appear upstream, pass
--version and update DATA_VERSION in scripts/build_data.py to match.

Usage:
    python3 scripts/refresh_data.py [--version v3.1] [--source /path/to/clone]
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPSTREAM_DATA_REPO = \
    "https://github.com/Cambridge-Sustainable-Computing-Lab/Green-Algorithms-data.git"

# Files the static site build needs, relative to the upstream version directory.
# Keep in sync with scripts/build_data.py.
FILES = [
    "chips/manual/CPUs-manual.csv",
    "chips/manual/GPUs-manual.csv",
    "carbon-intensity/electricitymap/CI-electricitymap-yearly_2024-with-continents.csv",
    "carbon-intensity/electricitymap/LICENSE",
    "data-centres/DC-cloud_2023.csv",
    "data-centres/default-PUE_2024.csv",
    "cloud-providers.csv",
    "context.csv",
    "hardware-impacts.csv",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", default="v3.1",
                        help="upstream data version directory (default: v3.1)")
    parser.add_argument("--source", default=None,
                        help="path to a local clone of Green-Algorithms-data "
                             "(skips the network fetch)")
    args = parser.parse_args()

    tmpdir = None
    if args.source:
        src_root = args.source
    else:
        tmpdir = tempfile.mkdtemp(prefix="ga-data-")
        print(f"Cloning {UPSTREAM_DATA_REPO} ...")
        subprocess.run(["git", "clone", "--depth", "1", UPSTREAM_DATA_REPO, tmpdir],
                       check=True)
        src_root = tmpdir

    try:
        src_version = os.path.join(src_root, args.version)
        if not os.path.isdir(src_version):
            available = sorted(d for d in os.listdir(src_root)
                               if d.startswith("v") and os.path.isdir(os.path.join(src_root, d)))
            sys.exit(f"No '{args.version}' directory upstream. Available: {available}\n"
                     f"If the carbon-intensity/data-centre file names changed for a new "
                     f"version, update FILES here and scripts/build_data.py to match.")

        dest_root = os.path.join(REPO_ROOT, "sources", args.version)
        copied = []
        for rel in FILES:
            src = os.path.join(src_version, rel)
            if not os.path.isfile(src):
                sys.exit(f"Expected file missing upstream: {args.version}/{rel}\n"
                         f"The upstream layout may have changed; update FILES and "
                         f"scripts/build_data.py accordingly.")
            dest = os.path.join(dest_root, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
            copied.append(rel)

        print(f"Copied {len(copied)} files into sources/{args.version}/")
        subprocess.run([sys.executable, os.path.join(REPO_ROOT, "scripts", "build_data.py")],
                       check=True)
        print("\nNext steps:")
        print("  1. cd tests && npm install && npm test")
        print("  2. git diff sources/ site/data.js  (review what changed)")
        print("  3. commit")
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
