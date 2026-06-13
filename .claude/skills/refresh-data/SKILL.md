---
name: refresh-data
description: Refresh the static calculator's vendored data (carbon intensities, chips, PUE) from the upstream Green-Algorithms-data repository, rebuild site/data.js, run the test suite, and update any affected numbers on the site.
---

# Refresh the calculator data

The static site in `site/` is built from data vendored in `sources/v3.1/`,
which mirrors the upstream data repository
(https://github.com/Cambridge-Sustainable-Computing-Lab/Green-Algorithms-data).
This skill keeps it up to date.

## Steps

1. **Fetch and rebuild**:

   ```bash
   python3 scripts/refresh_data.py            # clones upstream, copies files, rebuilds site/data.js
   ```

   If upstream added a new data version directory (e.g. `v3.2`), run with
   `--version v3.2`, and update `DATA_VERSION` plus any changed file names in
   `scripts/build_data.py` and the `FILES` list in `scripts/refresh_data.py`.
   Check upstream's `utils/data_sources.yml` and `utils/CI_data_config.yml`
   (in the GreenAlgorithms/green-algorithms-tool repo) for which files and CI
   column the new version uses.

2. **Run the tests** and fix anything that breaks (e.g. a default chip model
   that no longer exists in the data — defaults live in `site/app.js` `init()`,
   reference chart models in `REF_CPUS`/`REF_GPUS`/`REF_LOCATIONS`):

   ```bash
   cd tests && npm install && npm test
   ```

3. **Review the diff** for plausibility: carbon intensities should be in
   gCO2e/kWh (roughly 10-900), PUEs slightly above 1, chip power draws in
   watts. `git diff sources/ site/data.js`.

4. **Re-measure the site size** if data.js changed materially, and update the
   figures on `site/environmental-impact.html` (table sections 1-2, the
   inline widget constants `DASH_KB`/`STATIC_KB`) and the README:

   ```bash
   cd site && for f in index.html style.css app.js data.js favicon.ico images/*.svg; do gzip -9 -c "$f" | wc -c; done | paste -sd+ | bc
   ```

5. **Commit** with a message summarising what data changed (new CI year,
   chip count, PUE defaults). Deployment to GitHub Pages happens
   automatically on push to `main`.
