(() => {
  const APP_STORAGE_KEY = "longevityResearchSystem.v0.1";
  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const DEVICE_RULES = {
    "scale": { title: "Scale", keywords: ["weight", "body weight", "actual weight", "daily weight", "weekly weight", "peso", "peso corporal"] },
    "tape-measure": { title: "Tape measure", keywords: ["waist", "cintura", "hip", "cadera", "neck", "cuello", "circumference", "circunferencia", "body measurement", "medida corporal", "photos", "fotos"] },
    "bp-monitor": { title: "Blood pressure monitor", keywords: ["blood pressure", "home blood pressure", "presion arterial", "presión arterial", "hypertension", "systolic", "diastolic", "mmhg"] },
    "pulse-oximeter": { title: "Pulse oximeter", keywords: ["spo2", "spO₂", "oxygen saturation", "oximeter", "oxímetro", "oximetro", "peripheral saturation"] },
    "wearable": { title: "Smartwatch / ring", keywords: ["wearable", "smartwatch", "ring", "steps", "pasos", "sleep", "sueño", "sueno", "hrv", "resting heart rate", "nighttime heart rate", "nighttime hrv", "daily walks"] },
    "chest-strap": { title: "Chest HR strap", keywords: ["heart-rate strap", "heart rate strap", "chest strap", "zone 2", "zona 2", "post-effort heart rate recovery", "heart rate recovery", "exercise heart rate"] },
    "glucometer": { title: "Glucometer", keywords: ["glucometer", "glucómetro", "glucometro", "capillary glucose", "fasting glucose", "post-meal glucose", "meal glucose", "food response"] },
    "cgm": { title: "CGM", keywords: ["cgm", "continuous glucose", "sensor continuo", "glucose trend", "glucose response", "glycemic response", "respuesta glucemica", "respuesta glucémica"] },
    "ecg": { title: "12-lead ECG", keywords: ["ecg", "electrocardiogram", "electrocardiograma", "rhythm", "conduction"] },
    "stress-test": { title: "Exercise stress test", keywords: ["stress test", "exercise stress", "prueba de esfuerzo", "cardiac response", "functional tolerance"] },
    "cpet": { title: "CPET / VO₂ max", keywords: ["cpet", "vo2", "vo₂", "vo₂ max", "vo2 max", "aerobic capacity", "cardiorespiratory", "ventilatory"] },
    "dexa": { title: "DEXA / DXA", keywords: ["dexa", "dxa", "bone density", "densidad osea", "densidad ósea", "body composition", "composición corporal", "composicion corporal", "muscle mass", "lean mass", "visceral fat", "grasa visceral"] },
    "sleep-study": { title: "Sleep study", keywords: ["sleep study", "sleep apnea", "apnea", "polysomnography", "home sleep apnea", "snoring", "roncar", "watchpat"] },
    "blood-panel": { title: "Blood panel", keywords: ["blood panel", "blood test", "lab", "cbc", "complete blood count", "hemograma", "metabolic panel", "hba1c", "insulin", "lipid", "apob", "lp(a)", "hs-crp", "ferritin", "iron", "vitamin d", "b12", "folate", "tsh", "thyroid", "liver", "kidney", "testosterone", "magnesium", "omega-3"] },
    "air-monitor": { title: "Air quality monitor", keywords: ["co2", "co₂", "air quality", "pm2.5", "pm10", "voc", "humidity", "mold", "ventilation", "bedroom temperature"] },
    "kitchen-scale": { title: "Kitchen scale", keywords: ["estimated daily calories", "protein g/day", "carbs g/day", "fats g/day", "fiber g/day", "food weight", "recipe"] },
    "grip-dynamometer": { title: "Grip dynamometer", keywords: ["grip strength", "dynamometer"] },
    "lux-meter": { title: "Lux meter", keywords: ["light exposure", "natural light", "artificial light", "lux", "screen exposure"] },
    "spirometer": { title: "Spirometry / peak flow", keywords: ["spirometry", "peak flow", "lung function", "breathlessness", "respiratory"] },
    "rmr-test": { title: "RMR test", keywords: ["resting metabolic rate", "rmr", "resting energy expenditure", "indirect calorimetry"] },
    "lactate-meter": { title: "Lactate meter", keywords: ["lactate", "threshold"] }
  };

  const DEVICE_DEPENDENT_KINDS = new Set(["body_measurement", "lab_test", "clinical_study", "functional_test", "wearable_metric", "equipment"]);

  function installStyles() {
    if (document.getElementById("measurementMapLinksPanelFinalStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapLinksPanelFinalStyles";
    style.textContent = `
      #measurementMap .map-body > .map-analysis-links,
      #measurementMap .map-analysis-links-source-only {
        display: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-links.inside-links-panel {
        width: 100% !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        padding: 14px !important;
        display: grid !important;
        gap: 10px !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head span {
        color: #64748b !important;
        font-size: 0.72rem !important;
        font-weight: 900 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head small {
        color: #334155 !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 999px !important;
        padding: 4px 9px !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-help {
        margin: -2px 0 1px !important;
        color: #64748b !important;
        font-size: 0.86rem !important;
        font-weight: 750 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-chip-row,
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .compact-link-chip-row {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        gap: 8px !important;
        max-height: 250px !important;
        overflow: auto !important;
        padding: 2px 3px 2px 0 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 6px !important;
        width: auto !important;
        max-width: 260px !important;
        min-height: 34px !important;
        border: 1px solid #dbe5f3 !important;
        background: #ffffff !important;
        color: #1d4ed8 !important;
        border-radius: 999px !important;
        padding: 6px 10px !important;
        font: inherit !important;
        font-size: 0.78rem !important;
        font-weight: 850 !important;
        line-height: 1.1 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip span,
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip .chip-code {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        min-width: 20px !important;
        max-width: 20px !important;
        height: 20px !important;
        margin: 0 !important;
        border-radius: 999px !important;
        background: #f1f5f9 !important;
        color: #2563eb !important;
        font-size: 0.72rem !important;
        font-weight: 900 !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip .chip-text {
        display: inline !important;
        min-width: 0 !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip:hover {
        border-color: #93c5fd !important;
        background: #f8fbff !important;
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function readAppState() {
    if (window.state?.analyses?.items) return window.state;
    try { return JSON.parse(localStorage.getItem(APP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function readMap() {
    try { return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function categoriesById() {
    const app = readAppState();
    const map = new Map();
    for (const cat of app?.analyses?.categories || []) map.set(cat.id, cat);
    return map;
  }

  function activeAnalysesItems() {
    const app = readAppState();
    return Array.isArray(app?.analyses?.items) ? app.analyses.items : [];
  }

  function itemText(item) {
    const cat = categoriesById().get(item.categoryId);
    // Deliberately exclude category.description. It contains broad words like weight, waist and hip,
    // which made every item in category A look connected to Scale/Tape measure.
    return norm(`${item.name || ""} ${item.kind || ""} ${item.description || ""} ${item.notes || ""} ${cat?.name || ""}`);
  }

  function exactishMatch(text, keyword) {
    const k = norm(keyword).trim();
    if (!k) return false;
    if (/^[a-z0-9]+$/i.test(k)) return new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`, "i").test(text);
    return text.includes(k);
  }

  function itemMatchesDevice(item, deviceId) {
    const rule = DEVICE_RULES[deviceId];
    if (!rule || !item) return false;
    const text = itemText(item);
    return rule.keywords.some((kw) => exactishMatch(text, kw));
  }

  function devicesForItem(item) {
    return Object.keys(DEVICE_RULES).filter((deviceId) => itemMatchesDevice(item, deviceId));
  }

  function analysesForDevice(deviceId) {
    const catMap = categoriesById();
    return activeAnalysesItems()
      .filter((item) => itemMatchesDevice(item, deviceId))
      .sort((a, b) => {
        const ca = catMap.get(a.categoryId)?.code || "Z";
        const cb = catMap.get(b.categoryId)?.code || "Z";
        return ca.localeCompare(cb) || String(a.name || "").localeCompare(String(b.name || ""));
      });
  }

  function categoryLabel(item) {
    return categoriesById().get(item.categoryId)?.code || "Analysis";
  }

  function analysisChipHtml(item) {
    return `<button type="button" class="map-analysis-chip" data-analysis-id="${escapeHtml(item.id)}" title="Open ${escapeHtml(item.name)}"><span class="chip-code">${escapeHtml(categoryLabel(item))}</span><span class="chip-text">${escapeHtml(item.name)}</span></button>`;
  }

  function removeDuplicateOutsideBlocks() {
    document.querySelectorAll("#measurementMap .map-card").forEach((card) => {
      const panel = card.querySelector(".map-info-panel[data-map-info-panel='analyses']");
      if (!panel) return;
      card.querySelectorAll(".map-analysis-links").forEach((block) => {
        if (!panel.contains(block)) block.remove();
      });
    });
  }

  function rebuildPreciseMapLinks() {
    document.querySelectorAll("#measurementMap .map-card[data-map-id]").forEach((card) => {
      const deviceId = card.dataset.mapId;
      const panel = card.querySelector(".map-info-panel[data-map-info-panel='analyses']");
      if (!panel || !DEVICE_RULES[deviceId]) return;
      let box = panel.querySelector(".map-analysis-links.inside-links-panel");
      if (!box) {
        panel.innerHTML = "";
        box = document.createElement("section");
        box.className = "map-analysis-links inside-links-panel";
        panel.appendChild(box);
      }
      const analyses = analysesForDevice(deviceId);
      const key = analyses.map((item) => item.id).join("|");
      if (box.dataset.preciseKey === key) return;
      box.dataset.preciseKey = key;
      box.innerHTML = `
        <div class="link-box-head compact-link-box-head">
          <span>Analyses using this device</span>
          <small>${analyses.length ? `${analyses.length} linked` : "No linked analysis yet"}</small>
        </div>
        ${analyses.length ? `<p class="link-help">Click one to open its analysis card.</p><div class="link-chip-row compact-link-chip-row">${analyses.map(analysisChipHtml).join("")}</div>` : `<p class="link-empty">This device is in the catalog, but no analysis currently points to it.</p>`}
      `;
    });
  }

  function normalizeChipMarkup() {
    document.querySelectorAll("#measurementMap .map-info-panel[data-map-info-panel='analyses'] .map-analysis-chip").forEach((chip) => {
      if (chip.dataset.styleNormalized === "1") return;
      const codeEl = chip.querySelector("span, .chip-code");
      if (!codeEl) return;
      const codeText = codeEl.textContent.trim();
      const text = Array.from(chip.childNodes)
        .filter((node) => node !== codeEl)
        .map((node) => node.textContent || "")
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");
      if (text && !chip.querySelector(".chip-text")) {
        chip.innerHTML = `<span class="chip-code">${escapeHtml(codeText)}</span><span class="chip-text">${escapeHtml(text)}</span>`;
      }
      chip.dataset.styleNormalized = "1";
    });
  }

  function mapItems() {
    const map = readMap();
    return Array.isArray(map.items) ? map.items : [];
  }

  function isDeviceOwned(deviceId) {
    const item = mapItems().find((entry) => entry.id === deviceId);
    if (!item) return false;
    if (item.owned === true || item.haveDevice === true) return true;
    const status = norm(item.status || "");
    return /(^|\b)(have|owned|available|access|done|ready|got)(\b|\/)/.test(status) || status.includes("have / available") || status.includes("available");
  }

  function readinessForItem(item) {
    const kind = item?.kind || "questionnaire";
    if (!DEVICE_DEPENDENT_KINDS.has(kind)) return { mode: "no_device", required: [], unlocked: true, missing: [] };
    let required = devicesForItem(item);
    if (kind === "lab_test" && required.includes("blood-panel")) required = ["blood-panel"];
    const highSpecific = required.filter((id) => ["dexa", "cpet", "sleep-study", "stress-test", "ecg", "rmr-test"].includes(id));
    if (["clinical_study", "functional_test"].includes(kind) && highSpecific.length) required = [...new Set(highSpecific)];
    required = [...new Set(required)];
    if (!required.length) return { mode: "no_device", required, unlocked: true, missing: [] };
    const missing = required.filter((id) => !isDeviceOwned(id));
    return { mode: missing.length < required.length ? "unlocked" : "locked", required, unlocked: missing.length < required.length, missing };
  }

  function deviceChip(deviceId) {
    const owned = isDeviceOwned(deviceId);
    return `<button type="button" class="readiness-device-chip ${owned ? "owned" : "missing"}" data-device-id="${escapeHtml(deviceId)}">${owned ? "✓" : "!"} ${escapeHtml(DEVICE_RULES[deviceId]?.title || deviceId)}</button>`;
  }

  function correctAnalysisRows() {
    const itemsById = new Map(activeAnalysesItems().map((item) => [item.id, item]));
    document.querySelectorAll("#analysesCategories .analysis-item[data-item-id]").forEach((row) => {
      const item = itemsById.get(row.dataset.itemId);
      if (!item) return;
      const ready = readinessForItem(item);
      row.dataset.deviceReadiness = ready.mode;
      row.classList.toggle("analysis-locked-by-device", ready.mode === "locked");
      row.classList.toggle("analysis-unlocked-by-device", ready.mode === "unlocked");
      row.classList.toggle("analysis-no-device-needed", ready.mode === "no_device");

      row.querySelectorAll(".analysis-device-links").forEach((el) => el.remove());
      const devices = devicesForItem(item);
      if (devices.length) {
        const chips = document.createElement("span");
        chips.className = "analysis-device-links";
        chips.title = "Devices or studies that can support this analysis";
        chips.innerHTML = devices.slice(0, 4).map((id) => `<button type="button" class="analysis-device-chip" data-device-id="${escapeHtml(id)}">${escapeHtml(DEVICE_RULES[id]?.title || id)}</button>`).join("");
        const kind = row.querySelector(".kind-chip");
        kind?.insertAdjacentElement("afterend", chips);
      }

      let chip = row.querySelector(".device-readiness-chip");
      if (chip) {
        const label = ready.mode === "locked" ? "Locked" : ready.mode === "unlocked" ? "Unlocked" : "No device";
        const icon = ready.mode === "locked" ? "🔒" : ready.mode === "unlocked" ? "🔓" : "○";
        chip.className = `device-readiness-chip ${ready.mode}`;
        chip.textContent = `${icon} ${label}`;
        chip.title = ready.required.length ? `Needs: ${ready.required.map((id) => DEVICE_RULES[id]?.title || id).join(", ")}` : "Can be logged without a device";
      }

      const detail = row.querySelector(".device-readiness-details");
      if (detail) {
        detail.innerHTML = ready.required.length
          ? `<strong>${ready.mode === "locked" ? "Locked because you still need:" : "Unlocked by:"}</strong><div>${ready.required.map(deviceChip).join("")}</div>`
          : `<strong>No device required:</strong> this can be answered or logged manually.`;
      }
    });
  }

  function statsForCategory(categoryId) {
    const items = activeAnalysesItems().filter((item) => item.categoryId === categoryId);
    let unlocked = 0;
    let locked = 0;
    const missingDevices = new Set();
    for (const item of items) {
      const r = readinessForItem(item);
      if (r.mode === "locked") locked++;
      if (r.unlocked) unlocked++;
      r.missing.forEach((id) => missingDevices.add(id));
    }
    return { total: items.length, unlocked, locked, missingDevices: [...missingDevices] };
  }

  function correctCategoryBadgesAndSummary() {
    let total = 0;
    let unlocked = 0;
    let locked = 0;
    const missingDevices = new Set();
    for (const item of activeAnalysesItems()) {
      const r = readinessForItem(item);
      total++;
      if (r.unlocked) unlocked++;
      if (r.mode === "locked") locked++;
      r.missing.forEach((id) => missingDevices.add(id));
    }
    const lockedTile = document.getElementById("sumLockedByDevices");
    if (lockedTile) lockedTile.textContent = String(locked);
    const summary = document.getElementById("analysesDeviceSummary");
    if (summary) {
      const needed = [...missingDevices].map((id) => DEVICE_RULES[id]?.title || id).slice(0, 5);
      summary.innerHTML = `<span class="ready"><strong>🔓 ${unlocked}/${total}</strong> analyses unlocked</span><span class="locked"><strong>🔒 ${locked}</strong> locked by missing devices/tests</span><span class="needed"><strong>🛒 ${missingDevices.size}</strong> needed ${needed.length ? `· ${escapeHtml(needed.join(", "))}${missingDevices.size > needed.length ? "…" : ""}` : ""}</span>`;
    }
    document.querySelectorAll("#analysesCategories .category-card[data-cat-id]").forEach((card) => {
      const stats = statsForCategory(card.dataset.catId);
      const badge = card.querySelector(".category-unlock-badge");
      if (!badge) return;
      badge.className = `category-unlock-badge ${stats.locked ? "has-locked" : "all-unlocked"}`;
      badge.textContent = `${stats.locked ? "🔒" : "🔓"} ${stats.unlocked}/${stats.total} unlocked`;
      badge.title = stats.locked ? `Missing: ${stats.missingDevices.map((id) => DEVICE_RULES[id]?.title || id).join(", ")}` : "All analyses in this section are device-ready or do not need a device.";
    });
  }

  function run() {
    installStyles();
    removeDuplicateOutsideBlocks();
    rebuildPreciseMapLinks();
    normalizeChipMarkup();
    correctAnalysisRows();
    correctCategoryBadgesAndSummary();
  }

  function init() {
    run();
    [100, 400, 900, 1800, 3500, 6500].forEach((delay) => setTimeout(run, delay));
    if (!window.__measurementMapLinksPanelFinalObserverInstalled) {
      window.__measurementMapLinksPanelFinalObserverInstalled = true;
      new MutationObserver(() => {
        clearTimeout(window.__measurementMapLinksPanelFinalTimer);
        window.__measurementMapLinksPanelFinalTimer = setTimeout(run, 80);
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOwnershipChanged", () => setTimeout(run, 80));
  init();
})();
