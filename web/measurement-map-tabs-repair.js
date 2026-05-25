(() => {
  const TAB_DEFS = [
    { key: "measures", label: "Measures", heading: "What it measures" },
    { key: "use", label: "How to use", heading: "How to use it" },
    { key: "limits", label: "Limits", heading: "Comparison / limitations" },
    { key: "frequency", label: "Frequency", heading: "How often" },
    { key: "analyses", label: "Links", heading: "Linked analyses", html: true },
    { key: "deviceComparison", label: "Research", heading: "Device comparison research", html: true },
    { key: "notes", label: "Notes", heading: "Notes" }
  ];

  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const RESEARCH_NOTES = {
    "scale": "Compare basic digital scale vs smart scale. Rank price, repeatability, app export, multi-user support, privacy and whether body-fat estimates are useful for trends.",
    "tape-measure": "Compare normal flexible tape vs locking body tape. Rank repeatable placement, one-person use, markings, price and durability.",
    "bp-monitor": "Compare validated upper-arm monitors first. Rank cuff size, validation status, memory/export, multi-user support, ease of use and price.",
    "abpm": "Compare 24-hour ambulatory blood pressure services by price, availability, report quality, comfort and whether home readings justify it.",
    "pulse-oximeter": "Compare fingertip oximeters by reading stability, display clarity, perfusion indicator, pulse waveform, price and actual need.",
    "wearable": "Compare smartwatch vs ring by sleep comfort, battery, HR/HRV quality, export options, subscription cost, privacy and adherence.",
    "chest-strap": "Compare chest strap vs optical armband by exercise HR accuracy, comfort, Bluetooth/ANT+ compatibility, battery, replacement strap cost and price.",
    "glucometer": "Compare meter plus strip cost. Rank strip availability in Ireland, sample size, app/export support, lancet comfort and cost per test.",
    "cgm": "Compare CGM options by sensor life, total cost, app/export access, accuracy, alarms, comfort and whether a short experiment is justified.",
    "ecg": "Compare clinic 12-lead ECG vs single-lead/wearable ECG by completeness, availability, cost and need for professional interpretation.",
    "stress-test": "Compare exercise stress test providers by protocol, report detail, cardiology review, price, waiting time and safety value.",
    "cpet": "Compare CPET labs by VO₂ max accuracy, ventilatory thresholds, report quality, coaching interpretation, price and repeat-test value.",
    "dexa": "Compare DXA providers by body composition vs bone density detail, machine type, consistency, radiation exposure, price and repeat interval.",
    "sleep-study": "Compare home sleep apnea test vs full polysomnography by comfort, sensors included, oxygen metrics, clinician interpretation, price and indication threshold.",
    "blood-panel": "Compare lab panels by marker coverage, fasting rules, price, turnaround time, clinician review, repeatability and whether each marker has a decision rule.",
    "air-monitor": "Compare CO₂-only vs multi-sensor monitors by sensor accuracy, calibration, PM2.5/VOC quality, data export, battery/plug-in use and price."
  };

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

  function mapItem(id) {
    const state = readMapState();
    return Array.isArray(state.items) ? state.items.find((item) => item.id === id) : null;
  }

  function hiddenField(card, field) {
    return card.querySelector(`[data-field='${field}']`)?.value?.trim() || "";
  }

  function fieldText(card, label) {
    const field = [...card.querySelectorAll(".map-field")].find((node) => node.querySelector("span")?.textContent?.trim().toLowerCase() === label.toLowerCase());
    return field?.querySelector("p")?.textContent?.trim() || "";
  }

  function linkedAnalysesHtml(card) {
    const box = card.querySelector(".map-analysis-links");
    const chips = box ? [...box.querySelectorAll(".map-analysis-chip")].map((chip) => chip.outerHTML).join("") : "";
    if (!chips) return `<p class="link-empty">No linked analysis yet. The link appears automatically when an analysis name/description matches this device or study.</p>`;
    const count = box.querySelector(".link-box-head small")?.textContent?.trim() || "Linked analyses";
    return `<div class="link-box-head in-panel"><span>Used by analyses</span><small>${escapeHtml(count)}</small></div><div class="link-chip-row">${chips}</div>`;
  }

  function researchHtml(card) {
    const id = card.dataset.mapId || "";
    const item = mapItem(id);
    const note = item?.deviceComparison || item?.researchNotes || RESEARCH_NOTES[id] || "Compare price, quality, reliability, ease of use, data export, privacy, availability and whether this device is worth adding to the protocol.";
    return `<p>${escapeHtml(note)}</p><div class="device-options-editor" data-device-options-for="${escapeHtml(id)}"><div class="device-options-loading">Loading comparison options...</div></div>`;
  }

  function valueFor(card, key) {
    const values = {
      measures: fieldText(card, "Measures"),
      use: fieldText(card, "How to use"),
      limits: fieldText(card, "Comparison / notes"),
      frequency: hiddenField(card, "frequency"),
      analyses: linkedAnalysesHtml(card),
      deviceComparison: researchHtml(card),
      notes: hiddenField(card, "notes")
    };
    return values[key] || "Pending / not defined yet.";
  }

  function activeKey(card) {
    const current = card.dataset.activeMapInfoTab || "measures";
    return TAB_DEFS.some((tab) => tab.key === current) ? current : "measures";
  }

  function setActive(card, key) {
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

  function ensureTabs(card) {
    if (!card?.classList?.contains("map-card-ui-v2")) return;
    const title = card.querySelector(".map-title");
    if (!title) return;

    const existingKeys = [...card.querySelectorAll(".map-info-tab")].map((button) => button.dataset.mapInfoTab).join("|");
    const desiredKeys = TAB_DEFS.map((tab) => tab.key).join("|");
    if (existingKeys === desiredKeys && card.querySelector(".device-options-editor")) return;

    const current = activeKey(card);
    card.querySelectorAll(".map-info-tabs, .map-info-panels").forEach((node) => node.remove());

    const tabs = document.createElement("div");
    tabs.className = "map-info-tabs map-info-tabs-full";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = TAB_DEFS.map((tab) => `<button type="button" class="map-info-tab" role="tab" data-map-info-tab="${tab.key}">${escapeHtml(tab.label)}</button>`).join("");

    const panels = document.createElement("div");
    panels.className = "map-info-panels";
    panels.innerHTML = TAB_DEFS.map((tab) => {
      const raw = valueFor(card, tab.key);
      const body = tab.html ? raw : `<p>${escapeHtml(raw)}</p>`;
      return `<section class="map-info-panel" data-map-info-panel="${tab.key}" hidden><span>${escapeHtml(tab.heading)}</span>${body}</section>`;
    }).join("");

    title.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", panels);
    setActive(card, current);
    window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
  }

  function ensureAll() {
    document.querySelectorAll("#measurementMap .map-card").forEach(ensureTabs);
  }

  function installStyles() {
    if (document.getElementById("measurementMapTabsRepairStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapTabsRepairStyles";
    style.textContent = `
      #measurementMap .map-body > .map-analysis-links,
      #measurementMap .map-info-panels + .map-analysis-links {
        display: none !important;
      }
      #measurementMap .map-info-tabs.map-info-tabs-full {
        flex-wrap: wrap !important;
        overflow: visible !important;
        row-gap: 7px !important;
      }
      #measurementMap .map-info-tabs.map-info-tabs-full .map-info-tab {
        flex: 0 0 auto;
        padding-left: 10px;
        padding-right: 10px;
      }
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head.in-panel {
        margin-bottom: 9px;
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

  function installEvents() {
    if (window.__measurementMapTabsRepairEventsInstalled) return;
    window.__measurementMapTabsRepairEventsInstalled = true;
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.("#measurementMap .map-info-tab");
      if (!button) return;
      const card = button.closest(".map-card");
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      setActive(card, button.dataset.mapInfoTab || "measures");
    }, true);
  }

  function observe() {
    if (window.__measurementMapTabsRepairObserverInstalled) return;
    window.__measurementMapTabsRepairObserverInstalled = true;
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapTabsRepairTimer);
      window.__measurementMapTabsRepairTimer = setTimeout(ensureAll, 90);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    installEvents();
    observe();
    [0, 250, 700, 1400, 2500].forEach((delay) => setTimeout(ensureAll, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapSeedUpdated", () => setTimeout(ensureAll, 120));
  init();
})();
