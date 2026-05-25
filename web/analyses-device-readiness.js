(() => {
  const APP_STORAGE_KEY = "longevityResearchSystem.v0.1";
  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const DEVICE_RULES = {
    "scale": {
      title: "Scale",
      keywords: ["weight", "body weight", "actual weight", "daily weight", "weekly weight", "peso"]
    },
    "tape-measure": {
      title: "Tape measure",
      keywords: ["waist", "hip", "neck", "circumference", "body measurement", "photos", "cintura", "cadera", "cuello"]
    },
    "bp-monitor": {
      title: "Blood pressure monitor",
      keywords: ["blood pressure", "home blood pressure", "systolic", "diastolic", "mmhg", "hypertension", "presion arterial", "presión arterial"]
    },
    "abpm": {
      title: "24h ABPM",
      keywords: ["ambulatory blood pressure", "abpm", "24-hour blood pressure", "24 hour blood pressure", "nocturnal pressure", "masked hypertension", "white-coat"]
    },
    "pulse-oximeter": {
      title: "Pulse oximeter",
      keywords: ["spo2", "spO₂", "oxygen", "oximeter", "nocturnal oximetry", "oxigeno", "oxímetro", "oximetro"]
    },
    "wearable": {
      title: "Smartwatch / ring",
      keywords: ["wearable", "smartwatch", "ring", "steps", "sleep", "hrv", "resting heart rate", "nighttime heart rate", "nighttime hrv", "sleep latency", "night awakenings", "estimated vo2", "daily walks"]
    },
    "chest-strap": {
      title: "Chest HR strap",
      keywords: ["heart-rate strap", "heart rate strap", "chest", "zone 2", "post-effort heart rate recovery", "heart rate recovery", "exercise heart rate", "cardio"]
    },
    "glucometer": {
      title: "Glucometer",
      keywords: ["glucometer", "capillary glucose", "fasting glucose", "post-meal glucose", "meal glucose", "glucómetro", "glucometro"]
    },
    "cgm": {
      title: "CGM",
      keywords: ["cgm", "continuous glucose", "glucose trend", "glucose response", "glycemic response", "respuesta glucemica", "respuesta glucémica"]
    },
    "ecg": {
      title: "12-lead ECG",
      keywords: ["ecg", "electrocardiogram", "electrocardiograma", "rhythm", "conduction"]
    },
    "stress-test": {
      title: "Exercise stress test",
      keywords: ["stress test", "exercise stress", "cardiac response", "functional tolerance", "prueba de esfuerzo"]
    },
    "cpet": {
      title: "CPET / VO₂ max",
      keywords: ["cpet", "vo2", "vo₂", "vo₂ max", "vo2 max", "aerobic capacity", "cardiorespiratory", "ventilatory"]
    },
    "dexa": {
      title: "DEXA / DXA",
      keywords: ["dexa", "dxa", "bone density", "body composition", "muscle mass", "lean mass", "visceral fat", "grasa visceral", "densidad osea", "densidad ósea"]
    },
    "sleep-study": {
      title: "Sleep study",
      keywords: ["sleep study", "sleep apnea", "apnea", "polysomnography", "home sleep", "snoring", "roncar", "watchpat"]
    },
    "blood-panel": {
      title: "Blood panel",
      keywords: ["blood panel", "blood test", "lab", "cbc", "complete blood count", "hemograma", "metabolic panel", "hba1c", "insulin", "lipid", "apob", "lp(a)", "hs-crp", "ferritin", "iron", "vitamin d", "b12", "folate", "tsh", "thyroid", "liver", "kidney", "testosterone", "magnesium", "omega-3"]
    },
    "air-monitor": {
      title: "Air quality monitor",
      keywords: ["co2", "co₂", "air quality", "pm2.5", "pm10", "voc", "humidity", "mold", "ventilation", "bedroom temperature"]
    },
    "kitchen-scale": {
      title: "Kitchen scale",
      keywords: ["estimated daily calories", "protein g/day", "carbs g/day", "fats g/day", "fiber g/day", "sodium", "potassium", "magnesium intake", "calcium intake", "recipe", "food weight"]
    },
    "grip-dynamometer": {
      title: "Grip dynamometer",
      keywords: ["grip strength", "dynamometer"]
    },
    "lux-meter": {
      title: "Lux meter",
      keywords: ["light exposure", "natural light", "artificial light", "lux", "screen exposure"]
    },
    "spirometer": {
      title: "Spirometry / peak flow",
      keywords: ["spirometry", "peak flow", "lung function", "breathlessness", "respiratory"]
    },
    "rmr-test": {
      title: "RMR test",
      keywords: ["resting metabolic rate", "rmr", "resting energy expenditure", "indirect calorimetry"]
    },
    "lactate-meter": {
      title: "Lactate meter",
      keywords: ["lactate", "threshold"]
    }
  };

  const DEVICE_DEPENDENT_KINDS = new Set([
    "body_measurement",
    "lab_test",
    "clinical_study",
    "functional_test",
    "wearable_metric",
    "equipment"
  ]);

  function escapeHtml(value) {
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
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function readMap() {
    try { return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeMap(map) {
    map.updatedAt = new Date().toISOString();
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOwnershipChanged"));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
  }

  function readAppState() {
    if (window.state?.analyses?.items) return window.state;
    try { return JSON.parse(localStorage.getItem(APP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function mapItems() {
    const map = readMap();
    return Array.isArray(map.items) ? map.items : [];
  }

  function mapItem(deviceId) {
    return mapItems().find((item) => item.id === deviceId);
  }

  function deviceStatus(deviceId) {
    return norm(mapItem(deviceId)?.status || "");
  }

  function isDeviceOwned(deviceId) {
    const item = mapItem(deviceId);
    if (!item) return false;
    if (item.owned === true || item.haveDevice === true) return true;
    const status = norm(item.status || "");
    return /(^|\b)(have|owned|available|access|done|ready|got)(\b|\/)/.test(status) || status.includes("have / available") || status.includes("available");
  }

  function itemText(item) {
    const app = readAppState();
    const cat = app?.analyses?.categories?.find?.((category) => category.id === item.categoryId);
    return norm(`${item.name || ""} ${item.kind || ""} ${item.description || ""} ${item.notes || ""} ${cat?.name || ""} ${cat?.description || ""}`);
  }

  function candidateDevicesForItem(item) {
    if (!item) return [];
    const kind = item.kind || "questionnaire";
    if (!DEVICE_DEPENDENT_KINDS.has(kind)) return [];
    const text = itemText(item);
    const matches = Object.entries(DEVICE_RULES)
      .filter(([, rule]) => rule.keywords.some((keyword) => text.includes(norm(keyword))))
      .map(([deviceId]) => deviceId);

    // Avoid making generic lab markers require every possible home glucose device.
    if (kind === "lab_test") {
      const labSpecific = matches.filter((id) => id === "blood-panel");
      if (labSpecific.length) return labSpecific;
    }

    // If a clinical study is explicitly DEXA/CPET/sleep/etc., prefer that study over generic devices.
    const highSpecific = matches.filter((id) => ["dexa", "cpet", "sleep-study", "stress-test", "ecg", "abpm", "rmr-test"].includes(id));
    if (["clinical_study", "functional_test"].includes(kind) && highSpecific.length) return [...new Set(highSpecific)];

    return [...new Set(matches)];
  }

  function readinessForItem(item) {
    const required = candidateDevicesForItem(item);
    if (!required.length) {
      return { mode: "no_device", required, owned: [], missing: [], unlocked: true, label: "No device needed" };
    }
    const owned = required.filter(isDeviceOwned);
    const missing = required.filter((id) => !isDeviceOwned(id));
    const unlocked = owned.length > 0;
    return {
      mode: unlocked ? "unlocked" : "locked",
      required,
      owned,
      missing,
      unlocked,
      label: unlocked ? "Unlocked" : "Locked"
    };
  }

  function categoryReadiness(categoryId) {
    const app = readAppState();
    const items = app?.analyses?.items?.filter?.((item) => item.categoryId === categoryId) || [];
    let unlocked = 0;
    let locked = 0;
    let noDevice = 0;
    const missingDevices = new Set();
    for (const item of items) {
      const r = readinessForItem(item);
      if (r.mode === "locked") locked++;
      if (r.mode === "no_device") noDevice++;
      if (r.unlocked) unlocked++;
      r.missing.forEach((id) => missingDevices.add(id));
    }
    return { total: items.length, unlocked, locked, noDevice, missingDevices: [...missingDevices] };
  }

  function globalReadiness() {
    const app = readAppState();
    const items = app?.analyses?.items || [];
    let unlocked = 0;
    let locked = 0;
    let noDevice = 0;
    const missingDevices = new Set();
    for (const item of items) {
      const r = readinessForItem(item);
      if (r.mode === "locked") locked++;
      if (r.mode === "no_device") noDevice++;
      if (r.unlocked) unlocked++;
      r.missing.forEach((id) => missingDevices.add(id));
    }
    return { total: items.length, unlocked, locked, noDevice, missingDevices: [...missingDevices] };
  }

  function ensureDeviceFilter() {
    const filters = document.querySelector(".analyses-filters");
    if (!filters) return;
    if (document.getElementById("filterDeviceAccess")) return;
    const label = document.createElement("label");
    label.id = "analysisDeviceAccessFilterLabel";
    label.innerHTML = `
      <span>Device access</span>
      <select id="filterDeviceAccess">
        <option value="all">All</option>
        <option value="unlocked">Unlocked</option>
        <option value="locked">Locked</option>
        <option value="no_device">No device needed</option>
      </select>
    `;
    filters.appendChild(label);
    label.querySelector("select").addEventListener("change", () => applyAnalysesReadinessDecorations());
  }

  function activeDeviceFilter() {
    return document.getElementById("filterDeviceAccess")?.value || "all";
  }

  function ensureSummaryTiles() {
    const summary = document.getElementById("analysesSummary");
    if (!summary) return;
    if (!document.getElementById("sumLockedByDevices")) {
      const tile = document.createElement("article");
      tile.className = "summary-tile locked-by-device";
      tile.innerHTML = `<span>Locked</span><strong id="sumLockedByDevices">0</strong>`;
      summary.appendChild(tile);
    }
    if (!document.getElementById("analysesDeviceSummary")) {
      const box = document.createElement("div");
      box.id = "analysesDeviceSummary";
      box.className = "device-readiness-summary";
      const progress = document.querySelector(".progress-row");
      progress?.insertAdjacentElement("afterend", box);
    }
  }

  function renderSummary() {
    ensureSummaryTiles();
    const stats = globalReadiness();
    const lockedTile = document.getElementById("sumLockedByDevices");
    if (lockedTile) lockedTile.textContent = String(stats.locked);
    const box = document.getElementById("analysesDeviceSummary");
    if (box) {
      const needed = stats.missingDevices.map((id) => DEVICE_RULES[id]?.title || id).slice(0, 5);
      box.innerHTML = `
        <span class="ready"><strong>🔓 ${stats.unlocked}/${stats.total}</strong> analyses unlocked</span>
        <span class="locked"><strong>🔒 ${stats.locked}</strong> locked by missing devices/tests</span>
        <span class="needed"><strong>🛒 ${stats.missingDevices.length}</strong> needed ${needed.length ? `· ${escapeHtml(needed.join(", "))}${stats.missingDevices.length > needed.length ? "…" : ""}` : ""}</span>
      `;
    }
  }

  function itemById(id) {
    const app = readAppState();
    return app?.analyses?.items?.find?.((item) => item.id === id);
  }

  function deviceChip(deviceId, owned) {
    const title = DEVICE_RULES[deviceId]?.title || deviceId;
    return `<button type="button" class="readiness-device-chip ${owned ? "owned" : "missing"}" data-device-id="${escapeHtml(deviceId)}" title="Open device in Measurement Map">${owned ? "✓" : "!"} ${escapeHtml(title)}</button>`;
  }

  function decorateItem(row) {
    const item = itemById(row.dataset.itemId);
    if (!item) return;
    const ready = readinessForItem(item);
    row.dataset.deviceReadiness = ready.mode;
    row.classList.toggle("analysis-locked-by-device", ready.mode === "locked");
    row.classList.toggle("analysis-unlocked-by-device", ready.mode === "unlocked");
    row.classList.toggle("analysis-no-device-needed", ready.mode === "no_device");

    let chip = row.querySelector(".device-readiness-chip");
    if (!chip) {
      chip = document.createElement("span");
      chip.className = "device-readiness-chip";
      const icon = row.querySelector(".icon-btn");
      const itemRow = row.querySelector(".item-row");
      itemRow?.insertBefore(chip, icon || null);
    }

    const label = ready.mode === "locked" ? "Locked" : ready.mode === "unlocked" ? "Unlocked" : "No device";
    const iconText = ready.mode === "locked" ? "🔒" : ready.mode === "unlocked" ? "🔓" : "○";
    chip.className = `device-readiness-chip ${ready.mode}`;
    chip.textContent = `${iconText} ${label}`;
    chip.title = ready.required.length
      ? `Needs: ${ready.required.map((id) => DEVICE_RULES[id]?.title || id).join(", ")}`
      : "Can be logged without a device";

    let detail = row.querySelector(".device-readiness-details");
    const details = row.querySelector(".item-details");
    if (details && !detail) {
      detail = document.createElement("div");
      detail.className = "device-readiness-details";
      details.insertAdjacentElement("afterbegin", detail);
    }
    if (detail) {
      if (ready.required.length) {
        detail.innerHTML = `
          <strong>${ready.mode === "locked" ? "Locked because you still need:" : "Unlocked by:"}</strong>
          <div>${ready.required.map((id) => deviceChip(id, isDeviceOwned(id))).join("")}</div>
        `;
      } else {
        detail.innerHTML = `<strong>No device required:</strong> this can be answered or logged manually.`;
      }
    }
  }

  function applyDeviceFilterToRows() {
    const filter = activeDeviceFilter();
    document.querySelectorAll("#analysesCategories .analysis-item[data-item-id]").forEach((row) => {
      const mode = row.dataset.deviceReadiness || "no_device";
      const visible = filter === "all" || filter === mode;
      row.classList.toggle("device-filter-hidden", !visible);
    });

    document.querySelectorAll("#analysesCategories .category-card").forEach((card) => {
      const rows = [...card.querySelectorAll(".analysis-item[data-item-id]")];
      const visibleCount = rows.filter((row) => !row.classList.contains("device-filter-hidden")).length;
      let empty = card.querySelector(".device-filter-empty");
      const list = card.querySelector(".analysis-list");
      if (filter !== "all" && rows.length && visibleCount === 0) {
        if (!empty) {
          empty = document.createElement("p");
          empty.className = "muted small-pad device-filter-empty";
          empty.textContent = "No analyses visible with the current device filter.";
          list?.appendChild(empty);
        }
      } else {
        empty?.remove();
      }
      card.classList.toggle("category-filter-hidden", filter !== "all" && rows.length && visibleCount === 0);
    });
  }

  function decorateCategory(card) {
    const categoryId = card.dataset.catId;
    const stats = categoryReadiness(categoryId);
    const right = card.querySelector(".category-head-right");
    if (!right) return;
    let badge = card.querySelector(".category-unlock-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "category-unlock-badge";
      const counter = right.querySelector(".category-counter");
      if (counter) counter.insertAdjacentElement("afterend", badge);
      else right.insertAdjacentElement("afterbegin", badge);
    }
    badge.className = `category-unlock-badge ${stats.locked ? "has-locked" : "all-unlocked"}`;
    badge.textContent = `${stats.locked ? "🔒" : "🔓"} ${stats.unlocked}/${stats.total} unlocked`;
    badge.title = stats.locked
      ? `Missing: ${stats.missingDevices.map((id) => DEVICE_RULES[id]?.title || id).join(", ")}`
      : "All analyses in this section are device-ready or do not need a device.";
  }

  function applyAnalysesReadinessDecorations() {
    ensureDeviceFilter();
    renderSummary();
    document.querySelectorAll("#analysesCategories .analysis-item[data-item-id]").forEach(decorateItem);
    document.querySelectorAll("#analysesCategories .category-card[data-cat-id]").forEach(decorateCategory);
    applyDeviceFilterToRows();
  }

  function installRenderHook() {
    if (typeof renderAnalyses !== "function" || renderAnalyses.__deviceReadinessWrapped) return;
    const original = renderAnalyses;
    renderAnalyses = function renderAnalysesWithDeviceReadiness(...args) {
      const result = original.apply(this, args);
      setTimeout(applyAnalysesReadinessDecorations, 20);
      return result;
    };
    renderAnalyses.__deviceReadinessWrapped = true;
  }

  function updateMapItemStatus(deviceId, owned) {
    const map = readMap();
    const items = Array.isArray(map.items) ? map.items : [];
    const item = items.find((entry) => entry.id === deviceId);
    if (item) {
      item.owned = owned;
      item.haveDevice = owned;
      item.status = owned ? "Have / available" : "Need / pending";
      item.updatedAt = new Date().toISOString();
      map.items = items;
      writeMap(map);
    }

    const card = document.querySelector(`#measurementMap .map-card[data-map-id='${cssEscape(deviceId)}']`);
    const statusInput = card?.querySelector("[data-field='status']");
    if (statusInput) {
      statusInput.value = owned ? "Have / available" : "Need / pending";
      statusInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    setTimeout(() => {
      enhanceDeviceCards();
      applyAnalysesReadinessDecorations();
    }, 80);
  }

  function enhanceDeviceCard(card) {
    const deviceId = card?.dataset?.mapId;
    if (!deviceId) return;
    const title = card.querySelector(".map-title");
    if (!title) return;
    let button = card.querySelector(".device-owned-toggle");
    const owned = isDeviceOwned(deviceId);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "device-owned-toggle";
      title.appendChild(button);
    }
    button.dataset.deviceId = deviceId;
    button.classList.toggle("owned", owned);
    button.classList.toggle("needed", !owned);
    button.textContent = owned ? "✓ Have / access" : "Mark as have";
    button.title = owned ? "Click to mark this device/test as not available" : "Click when you already have this device or access to this test";
  }

  function enhanceDeviceCards() {
    document.querySelectorAll("#measurementMap .map-card[data-map-id]").forEach(enhanceDeviceCard);
  }

  function installEvents() {
    if (window.__analysesDeviceReadinessEventsInstalled) return;
    window.__analysesDeviceReadinessEventsInstalled = true;

    document.addEventListener("click", (event) => {
      const ownedBtn = event.target.closest?.("#measurementMap .device-owned-toggle");
      if (ownedBtn) {
        event.preventDefault();
        event.stopPropagation();
        const id = ownedBtn.dataset.deviceId;
        updateMapItemStatus(id, !isDeviceOwned(id));
        return;
      }

      const chip = event.target.closest?.(".readiness-device-chip");
      if (chip?.dataset?.deviceId) {
        const mapChip = document.querySelector(`#measurementMap .map-card[data-map-id='${cssEscape(chip.dataset.deviceId)}'] .device-owned-toggle`);
        if (mapChip) {
          event.preventDefault();
          mapChip.click();
        }
      }
    }, true);

    document.addEventListener("change", (event) => {
      if (event.target?.id === "filterDeviceAccess") applyAnalysesReadinessDecorations();
    }, true);
  }

  function installStyles() {
    if (document.getElementById("analysesDeviceReadinessStyles")) return;
    const style = document.createElement("style");
    style.id = "analysesDeviceReadinessStyles";
    style.textContent = `
      .summary-tile.locked-by-device {
        background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
        border-color: #fed7aa;
      }
      .summary-tile.locked-by-device span { color: #c2410c; }
      .summary-tile.locked-by-device strong { color: #9a3412; }

      .device-readiness-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 10px 0 12px;
      }
      .device-readiness-summary span {
        border: 1px solid #dbe5f3;
        background: #ffffff;
        border-radius: 999px;
        padding: 7px 10px;
        color: #64748b;
        font-size: 0.84rem;
        font-weight: 800;
      }
      .device-readiness-summary .ready { border-color: #bbf7d0; background: #f0fdf4; color: #047857; }
      .device-readiness-summary .locked { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
      .device-readiness-summary .needed { border-color: #ddd6fe; background: #faf5ff; color: #6d28d9; }

      .category-unlock-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 5px 8px;
        font-size: 0.76rem;
        font-weight: 900;
        white-space: nowrap;
        border: 1px solid #dbe5f3;
      }
      .category-unlock-badge.has-locked {
        background: #fff7ed;
        color: #c2410c;
        border-color: #fed7aa;
      }
      .category-unlock-badge.all-unlocked {
        background: #ecfdf5;
        color: #047857;
        border-color: #bbf7d0;
      }

      .device-readiness-chip {
        order: 6;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 5px 8px;
        font-size: 0.75rem;
        font-weight: 900;
        white-space: nowrap;
        border: 1px solid #dbe5f3;
      }
      .device-readiness-chip.locked { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
      .device-readiness-chip.unlocked { background: #ecfdf5; color: #047857; border-color: #bbf7d0; }
      .device-readiness-chip.no_device { background: #f8fafc; color: #475569; border-color: #cbd5e1; }

      .analysis-item.analysis-locked-by-device > .item-row {
        background: linear-gradient(90deg, #fff7ed 0%, #ffffff 62%) !important;
      }
      .analysis-item.analysis-unlocked-by-device > .item-row {
        background: linear-gradient(90deg, #f0fdf4 0%, #ffffff 62%) !important;
      }
      .device-filter-hidden { display: none !important; }

      .device-readiness-details {
        display: grid;
        gap: 7px;
        border: 1px solid #dbe5f3;
        border-radius: 14px;
        background: #fbfcff;
        padding: 9px 10px;
        margin-bottom: 10px;
        color: #334155;
        font-size: 0.88rem;
      }
      .device-readiness-details strong { color: #111827; }
      .device-readiness-details > div { display: flex; gap: 7px; flex-wrap: wrap; }
      .readiness-device-chip {
        border: 1px solid #dbe5f3;
        border-radius: 999px;
        background: #ffffff;
        padding: 6px 9px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 850;
        cursor: pointer;
      }
      .readiness-device-chip.owned { color: #047857; border-color: #bbf7d0; background: #ecfdf5; }
      .readiness-device-chip.missing { color: #c2410c; border-color: #fed7aa; background: #fff7ed; }

      #measurementMap .device-owned-toggle {
        border: 1px solid #dbe5f3;
        border-radius: 999px;
        padding: 6px 10px;
        background: #ffffff;
        color: #475569;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 900;
        cursor: pointer;
      }
      #measurementMap .device-owned-toggle.owned {
        background: #ecfdf5;
        color: #047857;
        border-color: #bbf7d0;
      }
      #measurementMap .device-owned-toggle.needed {
        background: #fff7ed;
        color: #c2410c;
        border-color: #fed7aa;
      }

      @media (max-width: 640px) {
        .device-readiness-summary span { width: 100%; border-radius: 14px; }
        .category-head-right { flex-wrap: wrap; justify-content: flex-end; }
        .device-readiness-chip { order: 7; }
      }
    `;
    document.head.appendChild(style);
  }

  function observe() {
    if (window.__analysesDeviceReadinessObserverInstalled) return;
    window.__analysesDeviceReadinessObserverInstalled = true;
    const observer = new MutationObserver(() => {
      clearTimeout(window.__analysesDeviceReadinessTimer);
      window.__analysesDeviceReadinessTimer = setTimeout(() => {
        applyAnalysesReadinessDecorations();
        enhanceDeviceCards();
      }, 80);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    installEvents();
    installRenderHook();
    observe();
    [0, 200, 700, 1500, 3000].forEach((delay) => setTimeout(() => {
      installRenderHook();
      applyAnalysesReadinessDecorations();
      enhanceDeviceCards();
    }, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(enhanceDeviceCards, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(() => { enhanceDeviceCards(); applyAnalysesReadinessDecorations(); }, 80));
  window.addEventListener("measurementMapSeedUpdated", () => setTimeout(() => { enhanceDeviceCards(); applyAnalysesReadinessDecorations(); }, 80));
  window.addEventListener("measurementMapDeviceOwnershipChanged", () => setTimeout(() => { enhanceDeviceCards(); applyAnalysesReadinessDecorations(); }, 80));
  init();
})();
