(() => {
  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const DEVICE_COMPARISON_NOTES = {
    "scale": "Research: basic digital scale vs smart scale. Compare price, repeatability, app export, multi-user support, privacy, and whether body-fat estimates are useful enough for trends.",
    "tape-measure": "Research: normal flexible tape vs locking body tape. Compare ease of repeatable placement, one-person use, markings, price, and durability.",
    "bp-monitor": "Research: validated upper-arm monitors first. Compare cuff size, validation status, memory/export, multi-user support, ease of use, and price. Wrist monitors should usually be secondary.",
    "abpm": "Research: clinic/pharmacy 24-hour ambulatory blood pressure monitoring. Compare price, availability, report quality, comfort, and whether it is needed after home readings.",
    "pulse-oximeter": "Research: fingertip oximeters. Compare reading stability, display clarity, perfusion indicator, pulse waveform, price, and whether it is needed beyond spot checks.",
    "wearable": "Research: smartwatch vs ring. Compare sleep comfort, battery life, HR/HRV quality, export options, subscription cost, privacy, and how well it supports daily adherence.",
    "chest-strap": "Research: chest strap vs optical armband. Compare exercise HR accuracy, comfort, Bluetooth/ANT+ compatibility, battery, strap replacement, and price.",
    "glucometer": "Research: meter plus strip cost. Compare strip availability in Ireland, sample size, app/export support, lancet comfort, and cost per test.",
    "cgm": "Research: CGM options by duration and total cost. Compare sensor life, app/export access, accuracy, alarms, comfort, and whether a 10–14 day experiment is justified.",
    "ecg": "Research: clinic 12-lead ECG vs wearable/single-lead ECG. Compare clinical completeness, availability, cost, and when professional interpretation is needed.",
    "stress-test": "Research: exercise stress test providers. Compare supervised protocol, report detail, cardiology review, price, waiting time, and suitability before intense training.",
    "cpet": "Research: CPET labs. Compare VO₂ max accuracy, ventilatory thresholds, lactate option, report detail, coaching interpretation, price, and repeat-test value.",
    "dexa": "Research: DXA providers. Compare body composition vs bone density report, machine type, scan consistency, radiation exposure, price, and repeat interval.",
    "sleep-study": "Research: home sleep apnea test vs full polysomnography. Compare comfort, sensors included, oxygen metrics, clinician interpretation, price, and indication threshold.",
    "blood-panel": "Research: lab panels. Compare marker coverage, fasting requirements, price, turnaround time, clinician review, repeatability, and whether each marker has a decision rule.",
    "air-monitor": "Research: CO₂-only vs multi-sensor air monitor. Compare sensor accuracy, calibration, PM2.5/VOC quality, data export, battery/plug-in use, and price.",
    "thermometer": "Research: oral/ear/infrared thermometer. Compare repeatability, ease of use, fever tracking usefulness, and price.",
    "kitchen-scale": "Research: kitchen scale for food experiments. Compare accuracy to 1 g, bowl/tare usability, cleaning, battery, size, and price.",
    "grip-dynamometer": "Research: digital grip dynamometer. Compare repeatability, display memory, handle size, app/export, and price.",
    "lux-meter": "Research: phone app vs dedicated lux meter. Compare repeatability, low-light accuracy, ease of morning light experiments, and price.",
    "spirometer": "Research: home peak flow/spirometer vs clinic spirometry. Compare accuracy, calibration, app export, and whether respiratory symptoms justify it.",
    "rmr-test": "Research: indirect calorimetry/RMR provider. Compare protocol quality, fasting requirements, report detail, price, and whether it will change nutrition decisions.",
    "lactate-meter": "Research: lactate meter. Compare strip cost, sampling ease, accuracy, and whether training zones require this level of detail."
  };

  const TAB_DEFS = [
    { key: "measures", label: "Measures", heading: "What it measures", html: false },
    { key: "use", label: "How to use", heading: "How to use it", html: false },
    { key: "limits", label: "Limits", heading: "Comparison / limitations", html: false },
    { key: "frequency", label: "Frequency", heading: "How often", html: false },
    { key: "analyses", label: "Used by analyses", heading: "Linked analyses", html: true },
    { key: "deviceComparison", label: "Device research", heading: "Device comparison research", html: true },
    { key: "notes", label: "Notes", heading: "Notes", html: false }
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readMapState() {
    try { return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function mapItem(deviceId) {
    const state = readMapState();
    return Array.isArray(state.items) ? state.items.find((item) => item.id === deviceId) : null;
  }

  function fieldFromEdit(card, field) {
    return card.querySelector(`[data-field='${field}']`)?.value?.trim() || "";
  }

  function fieldText(card, label) {
    const fields = [...card.querySelectorAll(".map-field")];
    const field = fields.find((node) => node.querySelector("span")?.textContent?.trim().toLowerCase() === label.toLowerCase());
    return field?.querySelector("p")?.textContent?.trim() || "";
  }

  function usedByHtml(card) {
    const box = card.querySelector(":scope > .map-body > .map-analysis-links, :scope .map-analysis-links");
    if (!box) return `<p class="link-empty">No linked analysis yet.</p>`;
    const chips = [...box.querySelectorAll(".map-analysis-chip")].map((chip) => chip.outerHTML).join("");
    if (!chips) return `<p class="link-empty">No linked analysis yet.</p>`;
    const count = box.querySelector(".link-box-head small")?.textContent?.trim() || "Linked analyses";
    return `<div class="link-box-head in-panel"><span>Used by analyses</span><small>${escapeHtml(count)}</small></div><div class="link-chip-row">${chips}</div>`;
  }

  function deviceComparisonHtml(card) {
    const id = card.dataset.mapId;
    const item = mapItem(id);
    const note = item?.deviceComparison || item?.researchNotes || DEVICE_COMPARISON_NOTES[id] || "Pending research: compare price, quality, reliability, ease of use, data export, privacy, availability, and whether this device is worth adding to the protocol.";
    return `<p>${escapeHtml(note)}</p><div class="device-options-editor" data-device-options-for="${escapeHtml(id)}"><div class="device-options-loading">Loading comparison options...</div></div>`;
  }

  function panelValue(card, key) {
    const values = {
      measures: fieldText(card, "Measures"),
      use: fieldText(card, "How to use"),
      limits: fieldText(card, "Comparison / notes"),
      frequency: fieldFromEdit(card, "frequency"),
      analyses: usedByHtml(card),
      deviceComparison: deviceComparisonHtml(card),
      notes: fieldFromEdit(card, "notes")
    };
    return values[key] || "Pending / not defined yet.";
  }

  function setActiveTab(card, key) {
    card.dataset.activeMapInfoTab = key;
    card.querySelectorAll(".map-info-tab").forEach((button) => {
      const active = button.dataset.mapInfoTab === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    card.querySelectorAll(".map-info-panel").forEach((panel) => {
      panel.hidden = panel.dataset.mapInfoPanel !== key;
    });
  }

  function rebuildTabs(card) {
    if (!card || !card.classList.contains("map-card-ui-v2")) return;
    const title = card.querySelector(".map-title");
    if (!title) return;

    const current = card.dataset.activeMapInfoTab || "measures";
    card.querySelector(".map-info-tabs")?.remove();
    card.querySelector(".map-info-panels")?.remove();

    const tabs = document.createElement("div");
    tabs.className = "map-info-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = TAB_DEFS.map((tab) => `<button type="button" class="map-info-tab" role="tab" data-map-info-tab="${tab.key}">${escapeHtml(tab.label)}</button>`).join("");

    const panels = document.createElement("div");
    panels.className = "map-info-panels";
    panels.innerHTML = TAB_DEFS.map((tab) => {
      const raw = panelValue(card, tab.key);
      const body = tab.html ? raw : `<p>${escapeHtml(raw)}</p>`;
      return `<section class="map-info-panel" data-map-info-panel="${tab.key}" hidden><span>${escapeHtml(tab.heading)}</span>${body}</section>`;
    }).join("");

    title.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", panels);
    setActiveTab(card, TAB_DEFS.some((tab) => tab.key === current) ? current : "measures");
  }

  function rebuildAll() {
    document.querySelectorAll("#measurementMap .map-card").forEach(rebuildTabs);
    window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
  }

  function installStyles() {
    if (document.getElementById("measurementMapTabsPlusStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapTabsPlusStyles";
    style.textContent = `
      #measurementMap .map-body > .map-analysis-links {
        display: none !important;
      }
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head.in-panel {
        margin-bottom: 9px;
      }
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-chip-row {
        margin-top: 0;
      }
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip {
        margin: 0;
      }
      #measurementMap .map-info-panel[data-map-info-panel="deviceComparison"] {
        background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%);
        border-color: #ddd6fe;
      }
      #measurementMap .map-info-panel[data-map-info-panel="deviceComparison"] > p {
        margin-bottom: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function installHooks() {
    if (window.__measurementMapTabsPlusHooksInstalled) return;
    window.__measurementMapTabsPlusHooksInstalled = true;
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.(".map-info-tab");
      if (!button) return;
      const card = button.closest(".map-card");
      if (!card) return;
      setActiveTab(card, button.dataset.mapInfoTab || "measures");
    }, true);

    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapTabsPlusTimer);
      window.__measurementMapTabsPlusTimer = setTimeout(rebuildAll, 120);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    installHooks();
    [0, 250, 900, 1800].forEach((delay) => setTimeout(rebuildAll, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
