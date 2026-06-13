/* Green Algorithms calculator - fully client-side.
 * Faithful reimplementation of the Dash app's aggregate_input_values()
 * (see app.py); all data comes from data.js (window.GA_DATA).
 */
(function () {
  "use strict";

  var D; // GA_DATA
  var SVG_NS = "http://www.w3.org/2000/svg";

  var PIE_COLORS = { Memory: "#E8A09A", CPU: "#9BBFE0", GPU: "#cfabd3" };
  var MAP_COLORS = ["#78E7A2", "#86D987", "#93CB70", "#9EBC5C", "#A6AD4D",
    "#AB9E43", "#AF8F3E", "#AF803C", "#AC713D", "#A76440", "#9E5943"];

  var REF_LOCATIONS = ["CH", "SE", "FR", "CA", "GB", "US", "CN", "IN", "AU"];

  var REF_CPUS = ["Core i9-13900TE", "Core i7-13700F", "AMD EPYC 7513",
    "Average", "Xeon Silver 4416+", "Ryzen 9 7900", "AMD EPYC 75F3",
    "Xeon w7-2475X", "Xeon Silver 4410T", "Xeon w3-2435", "Xeon Gold 6434H"];
  var REF_GPUS = ["NVIDIA Jetson AGX Xavier 16 GB", "NVIDIA Tesla T4",
    "NVIDIA GeForce GTX 1080", "Average", "NVIDIA Tesla V100 SXM2 16 GB",
    "NVIDIA A100 PCIe 80 GB", "NVIDIA H100 PCIe", "NVIDIA A100 SXM4 80 GB"];

  function $(id) { return document.getElementById(id); }
  function radioValue(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }
  function setRadio(name, value) {
    var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }
  function show(id, visible) { $(id).classList.toggle("hidden", !visible); }

  function setOptions(select, options, desired) {
    // options: array of {value, label}; keeps `desired` if still available
    select.innerHTML = "";
    options.forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      select.appendChild(opt);
    });
    var values = options.map(function (o) { return o.value; });
    if (desired != null && values.indexOf(desired) >= 0) select.value = desired;
    else if (options.length) select.value = options[0].value;
  }

  // ---------- number formatting (mirrors the Python f-strings) ----------
  function fmtFixed(v, dec) {
    return v.toLocaleString("en-US",
      { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmtExp(v, dec) { return v.toExponential(dec); }
  function smartFmt(v, dec, expHigh, expLow) {
    // exponential notation outside [expLow, expHigh), like the original
    if (v !== 0 && (v >= expHigh || v < expLow)) return fmtExp(v, dec);
    return fmtFixed(v, dec);
  }

  function formatCE(g) {
    var v = g, unit = "g";
    if (v >= 1e6) { v /= 1e6; unit = "T"; }
    else if (v >= 1e3) { v /= 1e3; unit = "kg"; }
    else if (v < 1) { v *= 1e3; unit = "mg"; }
    return smartFmt(v, 2, 1e3, 1) + " " + unit + " CO2e";
  }
  function formatEnergy(kWh) {
    var v = kWh, unit = "kWh";
    if (v >= 1e3) { v /= 1e3; unit = "MWh"; }
    else if (v < 1) { v *= 1e3; unit = "Wh"; }
    return smartFmt(v, 2, 1e3, 1) + " " + unit;
  }
  function formatTrees(treeMonths) {
    var v = treeMonths, unit = "tree-months";
    if (v >= 24) { v /= 12; unit = "tree-years"; }
    return smartFmt(v, 2, 1e3, 0.1) + " " + unit;
  }
  function formatFlights(x) {
    if (x === 0) return "-";
    if (x > 1e6) return fmtExp(x, 0);
    if (x >= 1) return fmtFixed(x, 1);
    if (x >= 0.01) return Math.round(x * 100) + "%";
    if (x >= 1e-4) return fmtFixed(x * 100, 2) + "%";
    return (x * 100).toExponential(0) + " %";
  }

  // ---------- option helpers ----------
  function providersWithDC() {
    var set = {};
    D.datacenters.forEach(function (dc) { set[dc.provider] = true; });
    return set;
  }

  function continentsOfProvider(provider) {
    var seen = {};
    D.datacenters.forEach(function (dc) {
      if (dc.provider === provider && D.ci[dc.location]) {
        seen[D.ci[dc.location].continent] = true;
      }
    });
    return Object.keys(seen).sort();
  }

  function serversIn(provider, continent) {
    return D.datacenters.filter(function (dc) {
      return dc.provider === provider && D.ci[dc.location] &&
        D.ci[dc.location].continent === continent;
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  }

  function allContinents() {
    var seen = {};
    Object.keys(D.ci).forEach(function (loc) { seen[D.ci[loc].continent] = true; });
    return Object.keys(seen).sort();
  }
  function countriesIn(continent) {
    var seen = {};
    Object.keys(D.ci).forEach(function (loc) {
      if (D.ci[loc].continent === continent) seen[D.ci[loc].country] = true;
    });
    return Object.keys(seen).sort();
  }
  function regionsIn(continent, country) {
    // returns [{value: locationCode, label: regionName}], "Any" first
    var rows = [];
    Object.keys(D.ci).forEach(function (loc) {
      var c = D.ci[loc];
      if (c.continent === continent && c.country === country) {
        rows.push({ value: loc, label: c.region });
      }
    });
    rows.sort(function (a, b) {
      if (a.label === "Any") return -1;
      if (b.label === "Any") return 1;
      return a.label < b.label ? -1 : 1;
    });
    return rows;
  }

  function findDatacenter(nameUnique) {
    for (var i = 0; i < D.datacenters.length; i++) {
      var dc = D.datacenters[i];
      if (dc.provider + " / " + dc.name === nameUnique) return dc;
    }
    return null;
  }

  // ---------- UI cascades ----------
  function refreshProviderOptions(desired) {
    var opts = Object.keys(D.providers).map(function (p) {
      return { value: p, label: D.providers[p] };
    });
    opts.push({ value: "other", label: "Other" });
    setOptions($("provider"), opts, desired);
  }

  function refreshServerOptions(desiredContinent, desiredServer) {
    var provider = $("provider").value;
    var contOpts = continentsOfProvider(provider).map(function (c) {
      return { value: c, label: c };
    });
    contOpts.push({ value: "other", label: "Other" });
    var wantCont = desiredContinent ||
      (contOpts.some(function (o) { return o.value === "Europe"; }) ? "Europe" : null);
    setOptions($("serverContinent"), contOpts, wantCont);

    var continent = $("serverContinent").value;
    var srvOpts = serversIn(provider, continent).map(function (dc) {
      return { value: dc.provider + " / " + dc.name, label: dc.name };
    });
    srvOpts.push({ value: "other", label: "My data centre is not listed" });
    setOptions($("server"), srvOpts, desiredServer);
    show("server", continent !== "other");
  }

  function refreshLocationOptions(desiredCont, desiredCountry, desiredRegion) {
    var contOpts = allContinents().map(function (c) { return { value: c, label: c }; });
    setOptions($("locationContinent"), contOpts, desiredCont || "World");

    var continent = $("locationContinent").value;
    var countryOpts = countriesIn(continent).map(function (c) { return { value: c, label: c }; });
    setOptions($("locationCountry"), countryOpts, desiredCountry);

    var country = $("locationCountry").value;
    setOptions($("locationRegion"), regionsIn(continent, country), desiredRegion);
  }

  function serverShown() {
    var platform = $("platformType").value;
    if (platform !== "cloudComputing") return false;
    var provider = $("provider").value;
    return provider !== "other" && providersWithDC()[provider];
  }
  function locationShown() {
    var platform = $("platformType").value;
    if (platform !== "cloudComputing") return true;
    var provider = $("provider").value;
    if (provider === "other" || !providersWithDC()[provider]) return true;
    return $("serverContinent").value === "other" || $("server").value === "other";
  }
  function pueShown() {
    var platform = $("platformType").value;
    if (platform === "localServer") return true;
    if (platform !== "cloudComputing") return false;
    var provider = $("provider").value;
    var server = $("serverContinent").value === "other" ? "other" : $("server").value;
    return provider === "other" || server === "other";
  }

  function updateVisibility() {
    var coreType = $("coreType").value;
    show("CPUdiv", coreType !== "GPU");
    show("GPUdiv", coreType !== "CPU");
    show("usageCPUdiv", coreType !== "GPU");
    show("usageGPUdiv", coreType !== "CPU");
    show("tdpCPUdiv", $("CPUmodel").value === "other");
    show("tdpGPUdiv", $("GPUmodel").value === "other");

    var platform = $("platformType").value;
    show("providerDiv", platform === "cloudComputing");
    show("serverDiv", serverShown());
    show("locationDiv", locationShown());
    show("PUEdiv", pueShown());

    show("usageCPU", radioValue("usageCPUradio") === "Yes");
    show("usageGPU", radioValue("usageGPUradio") === "Yes");
    show("PUE", radioValue("PUEradio") === "Yes");
    show("PSF", radioValue("PSFradio") === "Yes");
  }

  // ---------- core computation (mirrors aggregate_input_values) ----------
  function num(id) {
    var v = parseFloat($(id).value);
    return isNaN(v) ? null : v;
  }

  function compute() {
    var coreType = $("coreType").value;
    var runTime = (num("runTime_hour") || 0) + (num("runTime_min") || 0) / 60;
    var platform = $("platformType").value;
    var provider = $("provider").value;
    var memory = num("memory");

    // location & carbon intensity
    var location = null;
    if (locationShown()) {
      location = $("locationRegion").value || null;
    } else {
      var dc = findDatacenter($("server").value);
      if (dc) location = dc.location;
    }
    if (!location || !D.ci[location] || memory == null) return null;
    var carbonIntensity = D.ci[location].ci;

    // PUE
    var pueUsed;
    if (pueShown() && radioValue("PUEradio") === "Yes") {
      pueUsed = num("PUE");
    } else if (platform === "personal_laptop" || platform === "desktop_computer") {
      pueUsed = 1;
    } else if (platform === "localServer") {
      pueUsed = D.pueDefaults.Unknown;
    } else { // cloud
      if (provider === "other") {
        pueUsed = D.pueDefaults.Unknown;
      } else {
        var dc2 = serverShown() ? findDatacenter($("server").value) : null;
        pueUsed = (dc2 && dc2.pue != null) ? dc2.pue
          : (D.pueDefaults[provider] || D.pueDefaults.Unknown);
      }
    }
    if (pueUsed == null) return null;

    // cores
    var powerCPU = 0, powerGPU = 0, cpuPower = 0, gpuPower = 0;
    var nCPU = num("numberCPUs"), nGPU = num("numberGPUs");
    if (coreType === "CPU" || coreType === "Both") {
      var cpuModel = $("CPUmodel").value;
      cpuPower = cpuModel === "other" ? num("tdpCPU") : D.cpu[cpuModel][0];
      if (nCPU == null || cpuPower == null) return null;
      var usageCPU = radioValue("usageCPUradio") === "Yes" ? num("usageCPU") : 1;
      if (usageCPU == null) return null;
      powerCPU = pueUsed * nCPU * cpuPower * usageCPU;
    }
    if (coreType === "GPU" || coreType === "Both") {
      var gpuModel = $("GPUmodel").value;
      gpuPower = gpuModel === "other" ? num("tdpGPU") : D.gpu[gpuModel][0];
      if (nGPU == null || gpuPower == null) return null;
      var usageGPU = radioValue("usageGPUradio") === "Yes" ? num("usageGPU") : 1;
      if (usageGPU == null) return null;
      powerGPU = pueUsed * nGPU * gpuPower * usageGPU;
    }

    var psf = radioValue("PSFradio") === "Yes" ? (num("PSF") || 1) : 1;

    // Embodied (manufacturing) carbon, amortised over the hardware's active
    // lifetime, as in upstream v3.1. "Other" chip models fall back to the
    // Average chip's die area and core count.
    var H = D.hw;
    var lifespan =
      platform === "personal_laptop" ? H.active_lifespan_laptop :
      platform === "desktop_computer" ? H.active_lifespan_desktop_computer :
      platform === "cloudComputing" ? H.active_lifespan_cloud_server :
      H.active_lifespan_local_server; // hours
    var mfgPerHour = 0;
    var cpuSpec = null, gpuSpec = null;
    if (coreType !== "GPU") {
      cpuSpec = $("CPUmodel").value === "other" ? D.cpu.Average : D.cpu[$("CPUmodel").value];
      mfgPerHour += nCPU * (cpuSpec[1] * H.cpu_die_impact_gwp +
        H.cpu_base_impact_gwp / cpuSpec[2]) / lifespan;
    }
    if (coreType !== "CPU") {
      gpuSpec = $("GPUmodel").value === "other" ? D.gpu.Average : D.gpu[$("GPUmodel").value];
      mfgPerHour += nGPU * (gpuSpec[1] * H.gpu_die_impact_gwp + H.gpu_base_impact_gwp +
        H.ram_die_impact_gwp * gpuSpec[2] / H.ram_density) / lifespan;
    }
    var stripArea = H.ram_default_strip_size / H.ram_density;
    mfgPerHour += (stripArea * H.ram_die_impact_gwp + H.ram_base_impact_gwp) *
      memory / H.ram_default_strip_size / lifespan;
    if (platform === "personal_laptop") {
      mfgPerHour += H.laptop_base_impact_gwp / lifespan;
    } else if (platform === "desktop_computer") {
      mfgPerHour += H.desktop_computer_base_impact_gwp / lifespan;
    } else {
      var nServers = coreType === "GPU"
        ? nGPU / (platform === "cloudComputing" ? H.nb_GPU_cloud_per_server : H.nb_GPU_local_per_server)
        : nCPU / (cpuSpec[2] * H.nb_CPU_per_server);
      mfgPerHour += (H.motherboard_impact_gwp + H.assembly_impact_gwp +
        H.rack_casing_impact_gwp + H.PSU_impact_gwp) * nServers / lifespan;
    }
    var embodied = runTime * mfgPerHour * psf; // gCO2e

    var powerMemory = pueUsed * memory * D.refValues.memoryPower;
    var powerTotal = powerCPU + powerGPU + powerMemory;

    var toEnergy = function (w) { return runTime * w * psf / 1000; }; // kWh
    var energy = toEnergy(powerTotal);
    var CE = energy * carbonIntensity; // gCO2e

    return {
      coreType: coreType, location: location, carbonIntensity: carbonIntensity,
      runTime: runTime, runTimeH: num("runTime_hour") || 0, runTimeM: num("runTime_min") || 0,
      nCPU: nCPU, cpuModel: $("CPUmodel").value, cpuPower: cpuPower,
      nGPU: nGPU, gpuModel: $("GPUmodel").value, gpuPower: gpuPower,
      memory: memory, pue: pueUsed, psf: psf, platform: platform,
      energy: energy, power: powerTotal,
      CE: CE,
      CE_CPU: toEnergy(powerCPU) * carbonIntensity,
      CE_GPU: toEnergy(powerGPU) * carbonIntensity,
      CE_memory: toEnergy(powerMemory) * carbonIntensity,
      embodied: embodied,
      treeMonths: CE / D.refValues.treeYear * 12,
      kmCarEU: CE / D.refValues.passengerCar_EU_perkm
    };
  }

  // ---------- SVG helpers ----------
  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  }
  function withTitle(el, text) {
    el.appendChild(svgEl("title", {}, text));
    return el;
  }
  function colorRamp(t) { // 0..1 -> map colour scale
    var n = MAP_COLORS.length - 1;
    var i = Math.min(Math.floor(t * n), n - 1);
    var f = t * n - i;
    var hex = function (c) {
      return [1, 3, 5].map(function (j) { return parseInt(c.substr(j, 2), 16); });
    };
    var a = hex(MAP_COLORS[i]), b = hex(MAP_COLORS[i + 1]);
    var mix = a.map(function (v, j) { return Math.round(v + (b[j] - v) * f); });
    return "rgb(" + mix.join(",") + ")";
  }

  function renderDonut(container, slices) {
    // slices: [{label, value}]
    container.innerHTML = "";
    var total = slices.reduce(function (s, x) { return s + x.value; }, 0);
    if (!total) {
      container.textContent = "Fill in the form to see the breakdown.";
      return;
    }
    var svg = svgEl("svg", { viewBox: "0 0 340 200", role: "img",
      "aria-label": "Breakdown of emissions by component" });
    var cx = 100, cy = 100, r1 = 78, r0 = 40;
    var angle = -Math.PI / 2;
    slices.forEach(function (s) {
      if (s.value <= 0) return;
      var frac = s.value / total;
      var a0 = angle, a1 = angle + Math.min(frac * 2 * Math.PI, 2 * Math.PI - 1e-4);
      angle = a0 + frac * 2 * Math.PI;
      var p = function (r, a) { return (cx + r * Math.cos(a)) + " " + (cy + r * Math.sin(a)); };
      var large = (a1 - a0) > Math.PI ? 1 : 0;
      var d = "M " + p(r1, a0) + " A " + r1 + " " + r1 + " 0 " + large + " 1 " + p(r1, a1) +
        " L " + p(r0, a1) + " A " + r0 + " " + r0 + " 0 " + large + " 0 " + p(r0, a0) + " Z";
      svg.appendChild(withTitle(
        svgEl("path", { d: d, fill: PIE_COLORS[s.label], stroke: "#f9f9f9", "stroke-width": 2 }),
        s.label + ": " + Math.round(s.value) + " gCO2e (" + fmtFixed(frac * 100, 1) + "%)"));
      if (frac >= 0.04) {
        var mid = (a0 + a1) / 2, rl = (r0 + r1) / 2;
        svg.appendChild(svgEl("text", {
          x: cx + rl * Math.cos(mid), y: cy + rl * Math.sin(mid),
          "text-anchor": "middle", "dominant-baseline": "middle",
          "font-size": 11, fill: "#3c3c3c"
        }, fmtFixed(frac * 100, 0) + "%"));
      }
    });
    // legend
    slices.forEach(function (s, i) {
      var y = 70 + i * 24;
      svg.appendChild(svgEl("rect", { x: 200, y: y - 10, width: 12, height: 12,
        fill: PIE_COLORS[s.label] }));
      svg.appendChild(svgEl("text", { x: 218, y: y, "font-size": 12, fill: "#3c3c3c" },
        s.label + " (" + fmtFixed(s.value / total * 100, 1) + "%)"));
    });
    container.appendChild(svg);
  }

  function renderBars(container, items, opts) {
    // items: [{label, value, highlight}]; opts: {yLabel, unit, colorByValue, color}
    container.innerHTML = "";
    if (!items.length) return;
    var W = 600, H = 320, mL = 64, mB = 110, mT = 12, mR = 8;
    var plotW = W - mL - mR, plotH = H - mT - mB;
    var maxV = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": opts.yLabel });

    // gridlines + y axis labels
    for (var g = 0; g <= 4; g++) {
      var val = maxV * g / 4;
      var y = mT + plotH - plotH * g / 4;
      svg.appendChild(svgEl("line", { x1: mL, x2: W - mR, y1: y, y2: y,
        stroke: "#e6e6e6", "stroke-width": 1 }));
      svg.appendChild(svgEl("text", { x: mL - 6, y: y + 4, "text-anchor": "end",
        "font-size": 10, fill: "#3c3c3c" },
        val >= 1000 ? val.toExponential(1) : fmtFixed(val, val < 10 ? 1 : 0)));
    }
    svg.appendChild(svgEl("text", {
      x: 14, y: mT + plotH / 2, "font-size": 11, fill: "#3c3c3c",
      transform: "rotate(-90 14 " + (mT + plotH / 2) + ")", "text-anchor": "middle"
    }, opts.yLabel));

    var bw = plotW / items.length;
    items.forEach(function (it, i) {
      var h = maxV ? it.value / maxV * plotH : 0;
      var x = mL + i * bw + bw * 0.12, y = mT + plotH - h;
      var fill = opts.colorByValue ? colorRamp(maxV ? it.value / maxV : 0) : opts.color;
      var bar = svgEl("rect", { x: x, y: y, width: bw * 0.76, height: Math.max(h, 0.5),
        fill: fill });
      if (it.highlight) {
        bar.setAttribute("stroke", "#3c3c3c");
        bar.setAttribute("stroke-width", 2.5);
      }
      svg.appendChild(withTitle(bar,
        it.label + ": " + fmtFixed(it.value, 1) + " " + opts.unit));
      var tx = mL + i * bw + bw / 2, ty = mT + plotH + 10;
      svg.appendChild(svgEl("text", {
        x: tx, y: ty, "font-size": 10, fill: "#3c3c3c", "text-anchor": "end",
        "font-weight": it.highlight ? "700" : "400",
        transform: "rotate(-40 " + tx + " " + ty + ")"
      }, it.label));
    });
    container.appendChild(svg);
  }

  // ---------- rendering ----------
  function renderResults(r) {
    if (!r) {
      $("carbonEmissions_text").textContent = "... g CO2e";
      $("energy_text").textContent = "...";
      $("treeTime_text").textContent = "...";
      $("driving_text").textContent = "...";
      $("flying_text").textContent = "-";
      $("manufacturing_text").textContent = "...";
      $("report_text").textContent =
        "Fill in the form to generate a ready-to-use sentence for your paper or report.";
      renderDonut($("pieChart"), []);
      $("barChart").innerHTML = "";
      $("coresChart").innerHTML = "";
      return;
    }

    $("carbonEmissions_text").textContent = formatCE(r.CE);
    $("energy_text").textContent = formatEnergy(r.energy);
    $("manufacturing_text").textContent = formatCE(r.embodied);
    $("treeTime_text").textContent = formatTrees(r.treeMonths);
    $("driving_text").textContent = smartFmt(r.kmCarEU, 2, 1e3, 0.1) + " km";

    var flyContext, flyText;
    if (r.CE < 0.5 * D.refValues["flight_NY-SF"]) {
      flyContext = r.CE / D.refValues["flight_PAR-LON"]; flyText = "Paris-London";
    } else if (r.CE < 0.5 * D.refValues["flight_NYC-MEL"]) {
      flyContext = r.CE / D.refValues["flight_NY-SF"]; flyText = "NYC-San Francisco";
    } else {
      flyContext = r.CE / D.refValues["flight_NYC-MEL"]; flyText = "NYC-Melbourne";
    }
    $("flying_text").textContent = formatFlights(flyContext);
    $("flying_label").textContent =
      (flyContext >= 1 || flyContext === 0 ? "flights " : "of a flight ") + flyText;

    // donut
    var slices = [{ label: "Memory", value: r.CE_memory }];
    if (r.coreType !== "GPU") slices.push({ label: "CPU", value: r.CE_CPU });
    if (r.coreType !== "CPU") slices.push({ label: "GPU", value: r.CE_GPU });
    renderDonut($("pieChart"), slices);

    // location comparison
    var locItems = REF_LOCATIONS.filter(function (code) { return D.ci[code]; })
      .map(function (code) {
        return { label: D.ci[code].country, value: r.energy * D.ci[code].ci };
      });
    locItems.push({ label: "Your algorithm", value: r.CE, highlight: true });
    locItems.sort(function (a, b) { return a.value - b.value; });
    renderBars($("barChart"), locItems,
      { yLabel: "Emissions (gCO2e)", unit: "gCO2e", colorByValue: true });

    // core power comparison
    var isGPU = r.coreType !== "CPU";
    var refList = (isGPU ? REF_GPUS : REF_CPUS).filter(function (m) {
      return (isGPU ? D.gpu : D.cpu)[m] !== undefined;
    });
    var model = isGPU ? r.gpuModel : r.cpuModel;
    if (refList.indexOf(model) < 0) refList.push(model);
    var coreItems = refList.map(function (m) {
      var p = m === "other" ? (isGPU ? r.gpuPower : r.cpuPower) : (isGPU ? D.gpu : D.cpu)[m][0];
      return { label: m === "other" ? "Yours (other)" : m, value: p, highlight: m === model };
    });
    coreItems.sort(function (a, b) { return a.value - b.value; });
    renderBars($("coresChart"), coreItems, {
      yLabel: isGPU ? "Power draw (W)" : "Power draw per core (W)",
      unit: "W", color: "#E58F65", colorByValue: true
    });

    // report sentence
    var runtimeTxt;
    if (r.runTimeM > 0 && r.runTimeH > 0) runtimeTxt = r.runTimeH + "h and " + r.runTimeM + "min";
    else if (r.runTimeH > 0) runtimeTxt = r.runTimeH + "h";
    else runtimeTxt = r.runTimeM + "min";

    var cores = "";
    if (r.coreType !== "CPU") cores += r.nGPU + " GPU" + (r.nGPU > 1 ? "s" : "") + " " + r.gpuModel;
    if (r.coreType === "Both") cores += " and ";
    if (r.coreType !== "GPU") cores += r.nCPU + " CPU" + (r.nCPU > 1 ? "s" : "") + " " + r.cpuModel;

    var ci = D.ci[r.location];
    var regionTxt = ci.region === "Any" ? "" : " (" + ci.region + ")";
    var prefix = (ci.country === "United States of America" || ci.country === "United Kingdom") ? "the " : "";
    var basedTxt = (ci.country === "Any" || ci.country === "Global")
      ? "Based on the world average carbon intensity,"
      : "Based in " + prefix + ci.country + regionTxt + ",";
    var psfTxt = r.psf > 1 ? " and ran " + r.psf + " times in total," : "";

    $("report_text").textContent =
      "This algorithm runs in " + runtimeTxt + " on " + cores +
      ", and draws " + formatEnergy(r.energy) + ". " + basedTxt +
      psfTxt + " this has a carbon footprint of " + formatCE(r.CE) +
      ", which is equivalent to " + formatTrees(r.treeMonths) +
      ". Manufacturing the share of hardware used adds an estimated " +
      formatCE(r.embodied) +
      " of embodied emissions (calculated using green-algorithms.org, " +
      D.version + " data [1]).";
  }

  // ---------- permalink (same parameter names as the Dash app) ----------
  function buildPermalink() {
    var p = new URLSearchParams();
    p.set("runTime_hour", $("runTime_hour").value || 0);
    p.set("runTime_min", $("runTime_min").value || 0);
    p.set("appVersion", D.version);
    if (locationShown()) {
      p.set("locationContinent", $("locationContinent").value);
      p.set("locationCountry", $("locationCountry").value);
      p.set("locationRegion", $("locationRegion").value);
    }
    if (serverShown()) {
      p.set("serverContinent", $("serverContinent").value);
      p.set("server", $("server").value);
    }
    if (pueShown() && radioValue("PUEradio") === "Yes") {
      p.set("PUEradio", "Yes"); p.set("PUE", $("PUE").value);
    }
    var coreType = $("coreType").value;
    p.set("coreType", coreType);
    if (coreType !== "GPU") {
      p.set("numberCPUs", $("numberCPUs").value);
      p.set("CPUmodel", $("CPUmodel").value);
      if ($("CPUmodel").value === "other") p.set("tdpCPU", $("tdpCPU").value);
      if (radioValue("usageCPUradio") === "Yes") {
        p.set("usageCPUradio", "Yes"); p.set("usageCPU", $("usageCPU").value);
      }
    }
    if (coreType !== "CPU") {
      p.set("numberGPUs", $("numberGPUs").value);
      p.set("GPUmodel", $("GPUmodel").value);
      if ($("GPUmodel").value === "other") p.set("tdpGPU", $("tdpGPU").value);
      if (radioValue("usageGPUradio") === "Yes") {
        p.set("usageGPUradio", "Yes"); p.set("usageGPU", $("usageGPU").value);
      }
    }
    p.set("memory", $("memory").value);
    p.set("platformType", $("platformType").value);
    if ($("platformType").value === "cloudComputing") p.set("provider", $("provider").value);
    if (radioValue("PSFradio") === "Yes") {
      p.set("PSFradio", "Yes"); p.set("PSF", $("PSF").value);
    }
    return location.origin + location.pathname + "?" + p.toString();
  }

  function applyURLParams() {
    if (!location.search) {
      refreshProviderOptions();
      refreshServerOptions();
      refreshLocationOptions();
      return;
    }
    var q = new URLSearchParams(location.search);
    var get = function (k) { return q.get(k); };
    var setVal = function (id) { if (q.has(id)) $(id).value = q.get(id); };

    ["runTime_hour", "runTime_min", "memory", "numberCPUs", "numberGPUs",
      "tdpCPU", "tdpGPU", "usageCPU", "usageGPU", "PUE", "PSF"].forEach(setVal);
    if (q.has("coreType")) $("coreType").value = get("coreType");
    if (q.has("platformType")) {
      var pf = get("platformType");
      if (pf === "personalComputer") pf = "personal_laptop"; // pre-split permalinks
      $("platformType").value = pf;
    }

    // Old permalinks use pre-v3.1 continent names
    var continentAlias = { "North America": "Americas", "South America": "Americas" };
    var getContinent = function (k) {
      var v = get(k);
      return continentAlias[v] || v;
    };
    refreshProviderOptions(get("provider"));
    refreshServerOptions(getContinent("serverContinent"), get("server"));
    refreshLocationOptions(getContinent("locationContinent"), get("locationCountry"),
      get("locationRegion"));

    if (q.has("CPUmodel")) $("CPUmodel").value = get("CPUmodel");
    if (q.has("GPUmodel")) $("GPUmodel").value = get("GPUmodel");
    ["usageCPUradio", "usageGPUradio", "PUEradio", "PSFradio"].forEach(function (name) {
      if (q.has(name)) setRadio(name, q.get(name));
    });
  }

  // ---------- wiring ----------
  function recompute() {
    updateVisibility();
    renderResults(compute());
  }

  function init() {
    D = window.GA_DATA;
    $("appVersion").textContent = D.version + " data";

    var modelOpts = function (dict) {
      return Object.keys(dict).map(function (m) { return { value: m, label: m }; })
        .concat([{ value: "other", label: "Other" }]);
    };
    setOptions($("CPUmodel"), modelOpts(D.cpu), "Average");
    setOptions($("GPUmodel"), modelOpts(D.gpu), "Average");

    applyURLParams();

    document.getElementById("inputPanel").addEventListener("change", function (e) {
      var id = e.target.id || e.target.name;
      if (id === "platformType" || id === "provider") {
        refreshServerOptions();
      }
      if (id === "serverContinent") {
        refreshServerOptions($("serverContinent").value);
      }
      if (id === "locationContinent" || id === "locationCountry") {
        refreshLocationOptions($("locationContinent").value,
          id === "locationCountry" ? $("locationCountry").value : null, null);
      }
      recompute();
    });
    document.getElementById("inputPanel").addEventListener("input", function (e) {
      if (e.target.type === "number") recompute();
    });

    $("shareBtn").addEventListener("click", function () {
      var link = buildPermalink();
      var done = function () {
        show("shareConfirm", true);
        setTimeout(function () { show("shareConfirm", false); }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(done, function () {
          window.prompt("Copy this link:", link); done();
        });
      } else {
        window.prompt("Copy this link:", link); done();
      }
    });

    recompute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
