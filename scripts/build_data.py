#!/usr/bin/env python3
"""Convert the Green Algorithms v3.1 data into a single JS file for the static site.

Reads the data vendored in sources/v3.1/ (from the upstream
Cambridge-Sustainable-Computing-Lab/Green-Algorithms-data repository) and
writes site/data.js, which defines window.GA_DATA. No dependencies beyond
the Python standard library.

Mirrors the upstream v3.1 loading logic (utils/handle_inputs.py +
utils/CI_data_config.yml):
- carbon intensity: Electricity Maps 2024 yearly, life-cycle column;
  zone name == country name is normalised to region "Any"
- CPU power per core = TDP / n_cores; GPU power = whole-card TDP
- memoryPower comes from hardware-impacts.csv

Usage: python3 scripts/build_data.py
"""

import csv
import json
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "sources", "v3.1")
OUT_PATH = os.path.join(REPO_ROOT, "site", "data.js")

DATA_VERSION = "v3.1"

CI_FILE = os.path.join("carbon-intensity", "electricitymap",
                       "CI-electricitymap-yearly_2024-with-continents.csv")
CI_COLUMN = "Carbon intensity gCO₂eq/kWh (Life cycle)"


def read_csv(name, metadata_row=True):
    """Read a CSV, optionally skipping a first metadata row, as list of dicts."""
    with open(os.path.join(DATA_DIR, name), newline="", encoding="utf-8") as f:
        if metadata_row:
            next(f)
        return list(csv.DictReader(f))


def to_float(value):
    value = (value or "").strip()
    return float(value) if value else None


def main():
    data = {"version": DATA_VERSION}

    # CPU: [W per core, die area (cm2) per core, cores per chip]
    # GPU: [W per card, die area (cm2), memory (GB)] -- as in upstream v3.1
    data["cpu"] = {}
    for row in read_csv(os.path.join("chips", "manual", "CPUs-manual.csv")):
        tdp, n_cores = to_float(row["TDP"]), to_float(row["n_cores"])
        die = to_float(row["die_area"]) or 0
        if tdp and n_cores:
            data["cpu"][row["model"]] = [round(tdp / n_cores, 2),
                                         round(die / n_cores, 4), n_cores]
    data["gpu"] = {
        row["model"]: [to_float(row["TDP"]), to_float(row["die_area"]) or 0,
                       to_float(row["memory"]) or 0]
        for row in read_csv(os.path.join("chips", "manual", "GPUs-manual.csv"))
        if to_float(row["TDP"])
    }

    # Carbon intensity by Electricity Maps zone id
    data["ci"] = {}
    for row in read_csv(CI_FILE, metadata_row=False):
        region = row["Zone name"]
        if region == row["Country"]:
            region = "Any"
        data["ci"][row["Zone id"]] = {
            "continent": row["Continent"],
            "country": row["Country"],
            "region": region,
            "ci": round(to_float(row[CI_COLUMN]), 2),
        }

    # Cloud data centres; keep only those whose location has a known CI
    data["datacenters"] = [
        {
            "provider": row["provider"],
            "name": row["Name"],
            "location": row["location"],
            "pue": to_float(row["PUE"]),
        }
        for row in read_csv(os.path.join("data-centres", "DC-cloud_2023.csv"))
        if row["location"].strip() in data["ci"]
    ]

    # Default PUE per provider (incl. "Unknown")
    data["pueDefaults"] = {
        row["provider"]: to_float(row["PUE"])
        for row in read_csv(os.path.join("data-centres", "default-PUE_2024.csv"))
    }

    # Cloud provider display names
    data["providers"] = {
        row["provider"]: row["providerName"]
        for row in read_csv("cloud-providers.csv")
        if row["platformType"] == "cloudComputing"
    }

    # Reference values: context.csv plus memoryPower from hardware-impacts.csv
    data["refValues"] = {
        row["variable"]: to_float(row["value"])
        for row in read_csv("context.csv", metadata_row=False)
    }
    # Hardware manufacturing (embodied carbon) constants, GWP only
    HW_VARS = [
        "cpu_die_impact_gwp", "cpu_base_impact_gwp",
        "gpu_die_impact_gwp", "gpu_base_impact_gwp",
        "ram_die_impact_gwp", "ram_base_impact_gwp",
        "ram_density", "ram_default_strip_size",
        "motherboard_impact_gwp", "assembly_impact_gwp",
        "rack_casing_impact_gwp", "PSU_impact_gwp",
        "laptop_base_impact_gwp", "desktop_computer_base_impact_gwp",
        "active_lifespan_local_server", "active_lifespan_cloud_server",
        "active_lifespan_laptop", "active_lifespan_desktop_computer",
        "nb_CPU_per_server", "nb_GPU_local_per_server", "nb_GPU_cloud_per_server",
    ]
    data["hw"] = {}
    for row in read_csv("hardware-impacts.csv", metadata_row=False):
        if row["variable"] == "memoryPower":
            data["refValues"]["memoryPower"] = to_float(row["value"])
        elif row["variable"] in HW_VARS:
            data["hw"][row["variable"]] = to_float(row["value"])

    assert "memoryPower" in data["refValues"], "memoryPower missing"
    missing_hw = [v for v in HW_VARS if v not in data["hw"]]
    assert not missing_hw, f"hardware impact variables missing: {missing_hw}"
    assert "GLOBAL" in data["ci"], "GLOBAL (world average) row missing"

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/build_data.py -- do not edit by hand.\n")
        f.write("window.GA_DATA = ")
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
        f.write(";\n")

    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"Wrote {OUT_PATH} ({size_kb:.1f} kB): "
          f"{len(data['cpu'])} CPUs, {len(data['gpu'])} GPUs, "
          f"{len(data['ci'])} locations, {len(data['datacenters'])} datacenters")


if __name__ == "__main__":
    main()
