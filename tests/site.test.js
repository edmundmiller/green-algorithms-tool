/* Tests for the static Green Algorithms calculator.
 *
 * Loads site/index.html + data.js + app.js in jsdom and checks the rendered
 * results against the formula computed directly from the data file.
 *
 * Run:  cd tests && npm install && node site.test.js
 */
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "site");
const html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");

function load(url) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  const { window } = dom;
  window.eval(fs.readFileSync(path.join(SITE, "data.js"), "utf8"));
  window.eval(fs.readFileSync(path.join(SITE, "app.js"), "utf8"));
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  return window;
}

function get(w, id) { return w.document.getElementById(id).textContent; }
function setVal(w, id, v) {
  const el = w.document.getElementById(id);
  el.value = String(v);
  el.dispatchEvent(new w.Event("change", { bubbles: true }));
}

let failures = 0;
function expect(name, actual, want) {
  const ok = actual === want;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: got "${actual}"${ok ? "" : ` want "${want}"`}`);
}
function approx(name, actual, want, tol = 0.01) {
  const ok = Math.abs(actual - want) <= tol * Math.abs(want);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: got ${actual}${ok ? "" : ` want ~${want}`}`);
}

// Usage-emission helper: power (W) for `cores` of `model` + memory, no PUE
function corePower(D, model, cores) { return cores * D.cpu[model][0]; }

// Parse a "X <unit> CO2e" string back to grams
function parseCE(text) {
  const v = parseFloat(text.replace(/,/g, ""));
  if (text.includes(" mg ")) return v / 1e3;
  if (text.includes(" kg ")) return v * 1e3;
  if (text.includes(" T ")) return v * 1e6;
  return v;
}

// Embodied helper mirroring the v3.1 formula (CPU-only jobs on servers)
function embodiedCpuServer(D, { nCPU, model, memory, hours, lifespan, psf = 1 }) {
  const H = D.hw;
  const [, diePerCore, chipCores] = D.cpu[model];
  const cpu = nCPU * (diePerCore * H.cpu_die_impact_gwp + H.cpu_base_impact_gwp / chipCores);
  const stripArea = H.ram_default_strip_size / H.ram_density;
  const mem = (stripArea * H.ram_die_impact_gwp + H.ram_base_impact_gwp) *
    memory / H.ram_default_strip_size;
  const nServers = nCPU / (chipCores * H.nb_CPU_per_server);
  const other = (H.motherboard_impact_gwp + H.assembly_impact_gwp +
    H.rack_casing_impact_gwp + H.PSU_impact_gwp) * nServers;
  return hours * (cpu + mem + other) / lifespan * psf;
}

// --- Case 1: defaults (12h, 12 cores Average CPU, 64GB, localServer, GLOBAL CI)
{
  const w = load("https://example.org/");
  console.log("--- defaults ---");
  const D = w.GA_DATA;
  const power = D.pueDefaults.Unknown * (corePower(D, "Average", 12) + 64 * D.refValues.memoryPower);
  const energy = 12 * power / 1000;
  const ce = energy * D.ci.GLOBAL.ci;
  approx("default CE", parseFloat(get(w, "carbonEmissions_text")), ce / 1000, 0.01);
  approx("default energy", parseFloat(get(w, "energy_text")), energy, 0.01);
  approx("default trees", parseFloat(get(w, "treeTime_text")), ce / D.refValues.treeYear * 12, 0.01);
  approx("default car", parseFloat(get(w, "driving_text")), ce / D.refValues.passengerCar_EU_perkm, 0.01);
  expect("default flights", get(w, "flying_text"), Math.round(ce / D.refValues["flight_PAR-LON"] * 100) + "%");
  const emb = embodiedCpuServer(D, { nCPU: 12, model: "Average", memory: 64,
    hours: 12, lifespan: D.hw.active_lifespan_local_server });
  console.log("expected embodied:", emb, "g; shown:", get(w, "manufacturing_text"));
  approx("default embodied", parseFloat(get(w, "manufacturing_text")), emb, 0.01);
  console.log("report:", get(w, "report_text"));
}

// --- Case 2: GPU cloud GCP europe-west1 (BE), via URL params
{
  console.log("--- url: gpu + gcp datacenter ---");
  const w = load("https://example.org/?runTime_hour=5&runTime_min=0&coreType=GPU&numberGPUs=4&GPUmodel=NVIDIA%20Tesla%20V100%20SXM2%2016%20GB&memory=32&platformType=cloudComputing&provider=gcp&serverContinent=Europe&server=gcp%20%2F%20europe-west1");
  const D = w.GA_DATA, H = D.hw;
  const dc = D.datacenters.find(d => d.provider === "gcp" && d.name === "europe-west1");
  const pue = dc.pue ?? D.pueDefaults.gcp;
  const [gpuW, gpuDie, gpuMem] = D.gpu["NVIDIA Tesla V100 SXM2 16 GB"];
  const power = pue * (4 * gpuW + 32 * D.refValues.memoryPower);
  const ce = 5 * power / 1000 * D.ci[dc.location].ci;
  approx("gpu cloud CE", parseFloat(get(w, "carbonEmissions_text")), ce, 0.01);
  // embodied: GPU + memory + servers (cloud lifespan, 4 GPUs per cloud server)
  const lifespan = H.active_lifespan_cloud_server;
  const gpu = 4 * (gpuDie * H.gpu_die_impact_gwp + H.gpu_base_impact_gwp +
    H.ram_die_impact_gwp * gpuMem / H.ram_density);
  const stripArea = H.ram_default_strip_size / H.ram_density;
  const mem = (stripArea * H.ram_die_impact_gwp + H.ram_base_impact_gwp) * 32 / H.ram_default_strip_size;
  const other = (H.motherboard_impact_gwp + H.assembly_impact_gwp +
    H.rack_casing_impact_gwp + H.PSU_impact_gwp) * (4 / H.nb_GPU_cloud_per_server);
  const emb = 5 * (gpu + mem + other) / lifespan;
  console.log("expected embodied:", emb, "g; shown:", get(w, "manufacturing_text"));
  approx("gpu cloud embodied", parseFloat(get(w, "manufacturing_text")), emb, 0.01);
}

// --- Case 3: interaction: switch to laptop + change location to France
{
  console.log("--- interaction ---");
  const w = load("https://example.org/");
  setVal(w, "platformType", "personal_laptop");
  setVal(w, "locationContinent", "Europe");
  setVal(w, "locationCountry", "France");
  const D = w.GA_DATA, H = D.hw;
  const power = 1 * (corePower(D, "Average", 12) + 64 * D.refValues.memoryPower);
  const ce = 12 * power / 1000 * D.ci.FR.ci;
  approx("france laptop CE", parseFloat(get(w, "carbonEmissions_text")), ce, 0.01);
  expect("PUE hidden", w.document.getElementById("PUEdiv").classList.contains("hidden"), true);
  expect("bar chart has svg", w.document.querySelector("#barChart svg") !== null, true);
  expect("pie chart has svg", w.document.querySelector("#pieChart svg") !== null, true);
  expect("cores chart has svg", w.document.querySelector("#coresChart svg") !== null, true);
  // embodied: laptop base impact instead of server share
  const [, diePerCore, chipCores] = D.cpu["Average"];
  const cpu = 12 * (diePerCore * H.cpu_die_impact_gwp + H.cpu_base_impact_gwp / chipCores);
  const stripArea = H.ram_default_strip_size / H.ram_density;
  const mem = (stripArea * H.ram_die_impact_gwp + H.ram_base_impact_gwp) * 64 / H.ram_default_strip_size;
  const emb = 12 * (cpu + mem + H.laptop_base_impact_gwp) / H.active_lifespan_laptop;
  approx("laptop embodied", parseCE(get(w, "manufacturing_text")), emb, 0.01);
}

// --- Case 4: aws (no datacenters) -> location shown
{
  console.log("--- aws ---");
  const w = load("https://example.org/?platformType=cloudComputing&provider=aws&locationContinent=Americas&locationCountry=USA&locationRegion=US");
  expect("aws location shown", w.document.getElementById("locationDiv").classList.contains("hidden"), false);
  expect("aws server hidden", w.document.getElementById("serverDiv").classList.contains("hidden"), true);
  const D = w.GA_DATA;
  const power = D.pueDefaults.aws * (corePower(D, "Average", 12) + 64 * D.refValues.memoryPower);
  const ce = 12 * power / 1000 * D.ci.US.ci;
  approx("aws CE", parseFloat(get(w, "carbonEmissions_text")), ce, 0.01);
}

// --- Case 4b: old permalinks (continents + personalComputer) still resolve
{
  console.log("--- old permalink aliases ---");
  const w = load("https://example.org/?platformType=personalComputer&locationContinent=North%20America&locationCountry=USA&locationRegion=US");
  expect("alias platform", w.document.getElementById("platformType").value, "personal_laptop");
  expect("alias continent", w.document.getElementById("locationContinent").value, "Americas");
  expect("alias region", w.document.getElementById("locationRegion").value, "US");
}

// --- Case 5: usage factor + PSF + other CPU; GLOBAL world average
{
  console.log("--- usage/psf/other ---");
  const w = load("https://example.org/?coreType=CPU&numberCPUs=8&CPUmodel=other&tdpCPU=10&usageCPUradio=Yes&usageCPU=0.5&PSFradio=Yes&PSF=3&memory=16&platformType=desktop_computer&locationContinent=World&locationCountry=Global&locationRegion=GLOBAL&runTime_hour=1&runTime_min=30");
  const D = w.GA_DATA, H = D.hw;
  expect("tdp input visible", w.document.getElementById("tdpCPUdiv").classList.contains("hidden"), false);
  const power = 1 * (8 * 10 * 0.5 + 16 * D.refValues.memoryPower);
  const ce = 1.5 * power * 3 / 1000 * D.ci.GLOBAL.ci;
  approx("psf CE", parseFloat(get(w, "carbonEmissions_text")), ce, 0.01);
  // embodied: "other" CPU falls back to Average specs; desktop base impact; PSF applies
  const [, diePerCore, chipCores] = D.cpu["Average"];
  const cpu = 8 * (diePerCore * H.cpu_die_impact_gwp + H.cpu_base_impact_gwp / chipCores);
  const stripArea = H.ram_default_strip_size / H.ram_density;
  const mem = (stripArea * H.ram_die_impact_gwp + H.ram_base_impact_gwp) * 16 / H.ram_default_strip_size;
  const emb = 1.5 * (cpu + mem + H.desktop_computer_base_impact_gwp) /
    H.active_lifespan_desktop_computer * 3;
  approx("other-cpu embodied", parseFloat(get(w, "manufacturing_text")), emb, 0.01);
}

// --- Case 6: sub-national zone (Canada / Ontario)
{
  console.log("--- canada ontario ---");
  const w = load("https://example.org/?platformType=personal_laptop&locationContinent=Americas&locationCountry=Canada&locationRegion=CA-ON");
  const D = w.GA_DATA;
  const power = 1 * (corePower(D, "Average", 12) + 64 * D.refValues.memoryPower);
  const ce = 12 * power / 1000 * D.ci["CA-ON"].ci;
  approx("ontario CE", parseFloat(get(w, "carbonEmissions_text")), ce, 0.01);
  console.log("report:", get(w, "report_text"));
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL PASS");
process.exit(failures ? 1 : 0);
