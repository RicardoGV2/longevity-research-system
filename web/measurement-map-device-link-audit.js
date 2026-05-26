(() => {
  const APP_KEY = "longevityResearchSystem.v0.1";
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const DEVICE_RULES = {
    "scale": {
      title: "Scale",
      allowedKinds: ["personal_fact", "body_measurement"],
      include: ["^weight$", "actual weight", "body weight", "peso corporal"]
    },
    "tape-measure": {
      title: "Tape measure",
      allowedKinds: ["body_measurement", "personal_fact"],
      include: ["waist circumference", "hip circumference", "neck circumference", "cintura", "cadera", "cuello"]
    },
    "bp-monitor": {
      title: "Home blood pressure monitor",
      allowedKinds: ["body_measurement"],
      include: ["home blood pressure", "blood pressure", "presion arterial", "presión arterial", "systolic", "diastolic", "mmhg"]
    },
    "abpm": {
      title: "24h ABPM",
      allowedKinds: ["body_measurement", "clinical_study"],
      include: ["ambulatory blood pressure", "24-hour blood pressure", "24 hour blood pressure", "24h blood pressure", "nocturnal pressure", "masked hypertension", "white-coat", "blood pressure"]
    },
    "pulse-oximeter": {
      title: "Pulse oximeter",
      allowedKinds: ["body_measurement", "wearable_metric", "clinical_study"],
      include: ["spo2", "sp o2", "oxygen saturation", "oximeter", "oximetry", "oxigeno", "oxígeno", "oximetro", "oxímetro", "peripheral saturation"]
    },
    "wearable": {
      title: "Smartwatch / ring",
      allowedKinds: ["wearable_metric", "body_measurement", "functional_test", "lifestyle_factor"],
      include: ["hours of sleep", "night awakenings", "nighttime heart rate", "nighttime hrv", "sleep latency", "resting heart rate", "estimated vo2 max", "estimated vo₂ max", "daily walks", "walks with natural light", "walks during the workday", "transport and walking minutes", "weekly time in zone 2", "weekly hiit sessions", "running: pace", "cycling: time"]
    },
    "chest-strap": {
      title: "Chest HR strap",
      allowedKinds: ["functional_test", "lifestyle_factor", "body_measurement"],
      include: ["post-effort heart rate recovery", "heart rate recovery", "weekly time in zone 2", "weekly hiit sessions", "running: pace", "cycling: time", "exercise heart rate"]
    },
    "glucometer": {
      title: "Glucometer",
      allowedKinds: ["wearable_metric", "body_measurement", "nutrition_log"],
      include: ["glycemic response", "glucose response", "post-meal glucose", "meal glucose", "capillary glucose", "food response"]
    },
    "cgm": {
      title: "CGM",
      allowedKinds: ["wearable_metric", "body_measurement"],
      include: ["glycemic response", "glucose trend", "glucose response", "continuous glucose", "cgm"]
    },
    "ecg": {
      title: "12-lead ECG",
      allowedKinds: ["clinical_study", "functional_test"],
      include: ["ecg", "electrocardiogram", "electrocardiograma", "rhythm", "conduction"]
    },
    "stress-test": {
      title: "Exercise stress test",
      allowedKinds: ["functional_test", "clinical_study"],
      include: ["stress test", "exercise stress", "prueba de esfuerzo", "cardiac response", "functional tolerance"]
    },
    "cpet": {
      title: "CPET / VO₂ max",
      allowedKinds: ["functional_test", "clinical_study"],
      include: ["cpet", "vo2", "vo₂", "vo2 max", "vo₂ max", "estimated vo2 max", "estimated vo₂ max", "aerobic capacity", "cardiorespiratory", "ventilatory"]
    },
    "dexa": {
      title: "DEXA / DXA",
      allowedKinds: ["clinical_study", "body_measurement"],
      include: ["dexa", "dxa", "body composition", "visceral fat", "muscle mass", "lean mass", "bone density", "grasa visceral", "densidad osea", "densidad ósea"]
    },
    "sleep-study": {
      title: "Sleep study",
      allowedKinds: ["clinical_study", "wearable_metric", "subjective_log"],
      include: ["sleep study", "sleep apnea", "home sleep apnea", "apnea", "polysomnography", "polisomnografia", "polisomnografía", "snoring", "roncar", "watchpat", "nocturnal oximetry"]
    },
    "blood-panel": {
      title: "Blood panel",
      allowedKinds: ["lab_test"],
      include: ["complete blood count", "cbc", "hemogram", "hemograma", "fasting glucose", "hba1c", "insulin", "homa-ir", "lipid", "apob", "lp(a)", "hs-crp", "ferritin", "iron", "vitamin d", "25-oh", "b12", "folate", "tsh", "thyroid", "liver function", "kidney function", "testosterone", "magnesium", "omega-3", "serum"]
    },
    "air-monitor": {
      title: "Air quality monitor",
      allowedKinds: ["lifestyle_factor", "equipment", "questionnaire"],
      include: ["co2", "co₂", "air quality", "pm2.5", "pm10", "voc", "humidity", "mold", "moho", "ventilation", "bedroom temperature"]
    },
    "thermometer": {
      title: "Thermometer",
      allowedKinds: ["body_measurement", "subjective_log"],
      include: ["body temperature", "temperature corporal", "fever", "fiebre"]
    },
    "kitchen-scale": {
      title: "Kitchen food scale",
      allowedKinds: ["nutrition_log", "questionnaire"],
      include: ["estimated daily calories", "protein g/day", "carbs g/day", "fats g/day", "fiber g/day", "sodium", "potassium", "magnesium intake", "calcium intake", "daily added sugar", "free sugars", "weekly white flours", "recipe", "recipes", "food weight", "full recipes tested"]
    },
    "grip-dynamometer": {
      title: "Grip dynamometer",
      allowedKinds: ["functional_test"],
      include: ["grip strength", "dynamometer"]
    },
    "lux-meter": {
      title: "Lux meter",
      allowedKinds: ["lifestyle_factor"],
      include: ["daily natural light exposure", "natural light", "artificial light", "screen exposure", "light exposure", "lux"]
    },
    "spirometer": {
      title: "Spirometry / peak flow",
      allowedKinds: ["functional_test", "clinical_study", "subjective_log"],
      include: ["spirometry", "peak flow", "lung function", "breathlessness", "respiratory", "falta de aire", "disnea"]
    },
    "rmr-test": {
      title: "RMR test",
      allowedKinds: ["clinical_study", "nutrition_log"],
      include: ["resting metabolic rate", "rmr", "resting energy expenditure", "indirect calorimetry", "estimated daily calories"]
    },
    "lactate-meter": {
      title: "Lactate meter",
      allowedKinds: ["functional_test", "lifestyle_factor"],
      include: ["lactate", "threshold", "weekly time in zone 2"]
    }
  };

  const DEVICE_DEPENDENT_KINDS = new Set(["body_measurement", "lab_test", "clinical_study", "functional_test", "wearable_metric", "equipment", "nutrition_log", "lifestyle_factor"]);
  const SPECIFIC_STUDIES = new Set(["dexa", "cpet", "sleep-study", "stress-test", "ecg", "abpm", "rmr-test"]);

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function norm(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/₂/g, "2");
  }

  function appState() {
    if (window.state?.analyses?.items) return window.state;
    try { return JSON.parse(localStorage.getItem(APP_KEY) || "{}"); } catch { return {}; }
  }

  function mapState() {
    try { return JSON.parse(localStorage.getItem(MAP_KEY) || "{}"); } catch { return {}; }
  }

  function analysesItems() {
    const app = appState();
    return Array.isArray(app?.analyses?.items) ? app.analyses.items : [];
  }

  function categoriesById() {
    const app = appState();
    const map = new Map();
    for (const category of app?.analyses?.categories || []) map.set(category.id, category);
    return map;
  }

  function itemText(item) {
    // Important: do not include category name/description or item.kind here.
    // Broad category words like sleep, weight, light, or body_measurement created false links.
    return norm(`${item?.name || ""} ${item?.description || ""} ${item?.notes || ""}`);
  }

  function textMatches(text, pattern) {
    const p = norm(pattern).trim();
    if (!p) return false;
    if (p.startsWith("^") || p.endsWith("$")) return new RegExp(p, "i").test(text);
    return text.includes(p);
  }

  function itemMatchesDevice(item, deviceId) {
    const rule = DEVICE_RULES[deviceId];
    if (!rule || !item) return false;
    const kind = item.kind || "questionnaire";
    if (rule.allowedKinds && !rule.allowedKinds.includes(kind)) return false;
    const text = itemText(item);
    return rule.include.some((pattern) => textMatches(text, pattern));
  }

  function rawDevicesForItem(item) {
    return Object.keys(DEVICE_RULES).filter((deviceId) => itemMatchesDevice(item, deviceId));
  }

  function devicesForItem(item) {
    let matches = rawDevicesForItem(item);
    const kind = item?.kind || "questionnaire";

    // A lab-test analysis should not be locked by home glucose tools when the blood panel covers it.
    if (kind === "lab_test" && matches.includes("blood-panel")) matches = ["blood-panel"];

    // If a clinical/functional item names a specific study, prefer that study over generic trackers.
    const specific = matches.filter((id) => SPECIFIC_STUDIES.has(id));
    if (["clinical_study", "functional_test"].includes(kind) && specific.length) matches = specific;

    return [...new Set(matches)];
  }

  function analysesForDevice(deviceId) {
    const cats = categoriesById();
    return analysesItems()
      .filter((item) => itemMatchesDevice(item, deviceId))
      .sort((a, b) => {
        const ca = cats.get(a.categoryId)?.code || "Z";
        const cb = cats.get(b.categoryId)?.code || "Z";
        return ca.localeCompare(cb) || String(a.name || "").localeCompare(String(b.name || ""));
      });
  }

  function categoryCode(item) {
    return categoriesById().get(item.categoryId)?.code || "A";
  }

  function isDeviceOwned(deviceId) {
    const map = mapState();
    const item = (map.items || []).find((entry) => entry.id === deviceId);
    if (!item) return false;
    if (item.owned === true || item.haveDevice === true) return true;
    const status = norm(item.status || "");
    return /(^|\b)(have|owned|available|access|done|ready|got)(\b|\/)/.test(status) || status.includes("have / available") || status.includes("available");
  }

  function readinessForItem(item) {
    const kind = item?.kind || "questionnaire";
    if (!DEVICE_DEPENDENT_KINDS.has(kind)) return { mode: "no_device", required: [], missing: [], unlocked: true };
    const required = devicesForItem(item);
    if (!required.length) return { mode: "no_device", required: [], missing: [], unlocked: true };
    const missing = required.filter((id) => !isDeviceOwned(id));
    const unlocked = missing.length < required.length;
    return { mode: unlocked ? "unlocked" : "locked", required, missing, unlocked };
  }

  function analysisChip(item) {
    return `<button type="button" class="map-analysis-chip" data-analysis-id="${esc(item.id)}" title="Open ${esc(item.name)}"><span class="chip-code">${esc(categoryCode(item))}</span><span class="chip-text">${esc(item.name)}</span></button>`;
  }

  function rebuildMapLinks() {
    document.querySelectorAll("#measurementMap .map-card[data-map-id]").forEach((card) => {
      const deviceId = card.dataset.mapId;
      if (!DEVICE_RULES[deviceId]) return;
      const panel = card.querySelector(".map-info-panel[data-map-info-panel='analyses']");
      if (!panel) return;
      card.querySelectorAll(".map-analysis-links").forEach((block) => { if (!panel.contains(block)) block.remove(); });
      let box = panel.querySelector(".map-analysis-links.inside-links-panel");
      if (!box) {
        panel.innerHTML = "";
        box = document.createElement("section");
        box.className = "map-analysis-links inside-links-panel";
        panel.appendChild(box);
      }
      const analyses = analysesForDevice(deviceId);
      const key = `audit:${analyses.map((item) => item.id).join("|")}`;
      if (box.dataset.auditKey === key) return;
      box.dataset.auditKey = key;
      box.innerHTML = `
        <div class="link-box-head compact-link-box-head"><span>Analyses using this device</span><small>${analyses.length ? `${analyses.length} linked` : "No linked analysis yet"}</small></div>
        ${analyses.length ? `<p class="link-help">Click one to open its analysis card.</p><div class="link-chip-row compact-link-chip-row">${analyses.map(analysisChip).join("")}</div>` : `<p class="link-empty">No analysis currently needs this device/test.</p>`}
      `;
    });
  }

  function deviceChip(id, className = "analysis-device-chip") {
    return `<button type="button" class="${className}" data-device-id="${esc(id)}">${esc(DEVICE_RULES[id]?.title || id)}</button>`;
  }

  function readinessDeviceChip(id) {
    const owned = isDeviceOwned(id);
    return `<button type="button" class="readiness-device-chip ${owned ? "owned" : "missing"}" data-device-id="${esc(id)}">${owned ? "✓" : "!"} ${esc(DEVICE_RULES[id]?.title || id)}</button>`;
  }

  function correctAnalysisRows() {
    const byId = new Map(analysesItems().map((item) => [item.id, item]));
    document.querySelectorAll("#analysesCategories .analysis-item[data-item-id]").forEach((row) => {
      const item = byId.get(row.dataset.itemId);
      if (!item) return;
      const devices = devicesForItem(item);
      const ready = readinessForItem(item);

      row.dataset.deviceReadiness = ready.mode;
      row.classList.toggle("analysis-locked-by-device", ready.mode === "locked");
      row.classList.toggle("analysis-unlocked-by-device", ready.mode === "unlocked");
      row.classList.toggle("analysis-no-device-needed", ready.mode === "no_device");

      row.querySelectorAll(".analysis-device-links").forEach((node) => node.remove());
      if (devices.length) {
        const holder = document.createElement("span");
        holder.className = "analysis-device-links audited-device-links";
        holder.title = "Devices or studies that can support this analysis";
        holder.innerHTML = devices.slice(0, 5).map((id) => deviceChip(id)).join("");
        const kind = row.querySelector(".kind-chip");
        if (kind) kind.insertAdjacentElement("afterend", holder);
        else row.querySelector(".item-name")?.insertAdjacentElement("afterend", holder);
      }

      const statusChip = row.querySelector(".device-readiness-chip");
      if (statusChip) {
        const label = ready.mode === "locked" ? "Locked" : ready.mode === "unlocked" ? "Unlocked" : "No device";
        const icon = ready.mode === "locked" ? "🔒" : ready.mode === "unlocked" ? "🔓" : "○";
        statusChip.className = `device-readiness-chip ${ready.mode}`;
        statusChip.textContent = `${icon} ${label}`;
        statusChip.title = ready.required.length ? `Needs: ${ready.required.map((id) => DEVICE_RULES[id]?.title || id).join(", ")}` : "Can be logged without a device";
      }

      const detail = row.querySelector(".device-readiness-details");
      if (detail) {
        detail.innerHTML = ready.required.length
          ? `<strong>${ready.mode === "locked" ? "Locked because you still need:" : "Unlocked by:"}</strong><div>${ready.required.map(readinessDeviceChip).join("")}</div>`
          : `<strong>No device required:</strong> this can be answered or logged manually.`;
      }
    });
  }

  function statsForCategory(categoryId) {
    const items = analysesItems().filter((item) => item.categoryId === categoryId);
    let unlocked = 0;
    let locked = 0;
    const missing = new Set();
    for (const item of items) {
      const r = readinessForItem(item);
      if (r.unlocked) unlocked++;
      if (r.mode === "locked") locked++;
      r.missing.forEach((id) => missing.add(id));
    }
    return { total: items.length, unlocked, locked, missing: [...missing] };
  }

  function correctSummary() {
    let total = 0, unlocked = 0, locked = 0;
    const missing = new Set();
    for (const item of analysesItems()) {
      const r = readinessForItem(item);
      total++;
      if (r.unlocked) unlocked++;
      if (r.mode === "locked") locked++;
      r.missing.forEach((id) => missing.add(id));
    }
    const lockedTile = document.getElementById("sumLockedByDevices");
    if (lockedTile) lockedTile.textContent = String(locked);
    const summary = document.getElementById("analysesDeviceSummary");
    if (summary) {
      const needed = [...missing].map((id) => DEVICE_RULES[id]?.title || id).slice(0, 5);
      summary.innerHTML = `<span class="ready"><strong>🔓 ${unlocked}/${total}</strong> analyses unlocked</span><span class="locked"><strong>🔒 ${locked}</strong> locked by missing devices/tests</span><span class="needed"><strong>🛒 ${missing.size}</strong> needed ${needed.length ? `· ${esc(needed.join(", "))}${missing.size > needed.length ? "…" : ""}` : ""}</span>`;
    }

    document.querySelectorAll("#analysesCategories .category-card[data-cat-id]").forEach((card) => {
      const s = statsForCategory(card.dataset.catId);
      const badge = card.querySelector(".category-unlock-badge");
      if (!badge) return;
      badge.className = `category-unlock-badge ${s.locked ? "has-locked" : "all-unlocked"}`;
      badge.textContent = `${s.locked ? "🔒" : "🔓"} ${s.unlocked}/${s.total} unlocked`;
      badge.title = s.locked ? `Missing: ${s.missing.map((id) => DEVICE_RULES[id]?.title || id).join(", ")}` : "All analyses in this section are device-ready or do not need a device.";
    });
  }

  function applyDeviceFilter() {
    const filter = document.getElementById("filterDeviceAccess")?.value || "all";
    document.querySelectorAll("#analysesCategories .analysis-item[data-item-id]").forEach((row) => {
      const mode = row.dataset.deviceReadiness || "no_device";
      row.classList.toggle("device-filter-hidden", filter !== "all" && filter !== mode);
    });
  }

  function installStyles() {
    if (document.getElementById("measurementMapDeviceLinkAuditStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapDeviceLinkAuditStyles";
    style.textContent = `
      .audited-device-links { outline: 0 !important; }
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-empty { color: #64748b; }
    `;
    document.head.appendChild(style);
  }

  function run() {
    installStyles();
    rebuildMapLinks();
    correctAnalysisRows();
    correctSummary();
    applyDeviceFilter();
  }

  function init() {
    run();
    [120, 400, 900, 1800, 3500, 7000].forEach((delay) => setTimeout(run, delay));
    if (!window.__measurementMapDeviceLinkAuditObserverInstalled) {
      window.__measurementMapDeviceLinkAuditObserverInstalled = true;
      new MutationObserver(() => {
        clearTimeout(window.__measurementMapDeviceLinkAuditTimer);
        window.__measurementMapDeviceLinkAuditTimer = setTimeout(run, 110);
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  window.LRS_DEVICE_LINK_AUDIT = { DEVICE_RULES, itemMatchesDevice, devicesForItem, analysesForDevice, readinessForItem, run };
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 120));
  window.addEventListener("measurementMapDeviceOwnershipChanged", () => setTimeout(run, 120));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 120));
  window.addEventListener("measurementMapSeedUpdated", () => setTimeout(run, 120));
  init();
})();
