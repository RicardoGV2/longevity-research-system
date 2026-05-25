(() => {
  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const TAB_DEFS = [
    ["measures", "Measures", "What it measures", false],
    ["use", "How to use", "How to use it", false],
    ["limits", "Limits", "Limits / comparison", false],
    ["frequency", "Frequency", "How often", false],
    ["analyses", "Links", "Analyses using this device", true],
    ["deviceComparison", "Research", "Device comparison research", true],
    ["notes", "Notes", "Notes", false]
  ];

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

  function readMap() {
    try { return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function itemFor(card) {
    const id = card?.dataset?.mapId || "";
    const data = readMap();
    return Array.isArray(data.items) ? data.items.find((item) => item.id === id) : null;
  }

  function fieldText(card, label) {
    const fields = Array.from(card.querySelectorAll(".map-field"));
    const field = fields.find((node) => node.querySelector("span")?.textContent?.trim().toLowerCase() === label.toLowerCase());
    return field?.querySelector("p")?.textContent?.trim() || "";
  }

  function hiddenValue(card, field, fallback = "") {
    return card.querySelector(`[data-field='${field}']`)?.value?.trim() || fallback || "";
  }

  function cleanAnalysisChip(chip) {
    const id = chip.dataset.analysisId || "";
    const code = chip.querySelector("span")?.textContent?.trim() || "•";
    const textNodes = Array.from(chip.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    const name = textNodes.join(" ") || chip.textContent?.replace(code, "").trim() || "Analysis";
    return `<button type="button" class="map-analysis-chip clean-analysis-chip" data-analysis-id="${escapeHtml(id)}" title="${escapeHtml(name)}"><span class="chip-code">${escapeHtml(code)}</span><span class="chip-text">${escapeHtml(name)}</span></button>`;
  }

  function linksHtml(card) {
    const source = card.querySelector(".map-analysis-links");
    const chips = source ? Array.from(source.querySelectorAll(".map-analysis-chip")) : [];
    if (!chips.length) return `<p class="link-empty">No linked analysis yet.</p>`;
    return `
      <div class="linked-analyses-panel-head">
        <strong>${chips.length} linked</strong>
        <span>Click one to open its analysis card.</span>
      </div>
      <div class="link-chip-row clean-link-chip-row">${chips.map(cleanAnalysisChip).join("")}</div>
    `;
  }

  function researchHtml(card) {
    const id = card.dataset.mapId || "";
    const item = itemFor(card);
    const note = item?.deviceComparison || item?.researchNotes || "Compare options by price, quality, accuracy, ease of use, data export, availability, privacy and whether this device is worth adding to the protocol.";
    return `<p>${escapeHtml(note)}</p><div class="device-options-editor" data-device-options-for="${escapeHtml(id)}"><div class="device-options-loading">Loading comparison options...</div></div>`;
  }

  function values(card) {
    return {
      measures: fieldText(card, "Measures") || hiddenValue(card, "measures"),
      use: fieldText(card, "How to use") || hiddenValue(card, "use"),
      limits: fieldText(card, "Comparison / notes") || hiddenValue(card, "comparison"),
      frequency: hiddenValue(card, "frequency"),
      analyses: linksHtml(card),
      deviceComparison: researchHtml(card),
      notes: hiddenValue(card, "notes")
    };
  }

  function currentKeys(card) {
    return Array.from(card.querySelectorAll(".map-info-tab")).map((button) => button.dataset.mapInfoTab).join("|");
  }

  function desiredKeys() {
    return TAB_DEFS.map(([key]) => key).join("|");
  }

  function setActive(card, key) {
    const safeKey = TAB_DEFS.some(([tabKey]) => tabKey === key) ? key : "measures";
    card.dataset.activeMapInfoTab = safeKey;
    card.querySelectorAll(".map-info-tab").forEach((button) => {
      const active = button.dataset.mapInfoTab === safeKey;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    card.querySelectorAll(".map-info-panel").forEach((panel) => {
      panel.hidden = panel.dataset.mapInfoPanel !== safeKey;
    });
    if (safeKey === "deviceComparison") window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
  }

  function rebuildCard(card, force = false) {
    if (!card?.classList?.contains("map-card")) return;
    const body = card.querySelector(".map-body");
    const title = card.querySelector(".map-title");
    if (!body || !title) return;

    const needsRebuild = force || currentKeys(card) !== desiredKeys() || !card.querySelector(".device-options-editor") || card.querySelector(".map-info-tab[data-map-info-tab='compare']");
    if (!needsRebuild) return;

    const active = card.dataset.activeMapInfoTab || "measures";
    const data = values(card);

    card.querySelectorAll(".map-info-tabs, .map-info-panels").forEach((node) => node.remove());
    card.classList.add("map-card-ui-v2", "force-final-map-card");

    const tabs = document.createElement("div");
    tabs.className = "map-info-tabs map-info-tabs-full final-map-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = TAB_DEFS.map(([key, label]) => `<button type="button" class="map-info-tab" role="tab" data-map-info-tab="${key}">${escapeHtml(label)}</button>`).join("");

    const panels = document.createElement("div");
    panels.className = "map-info-panels final-map-panels";
    panels.innerHTML = TAB_DEFS.map(([key, _label, heading, isHtml]) => {
      const raw = data[key] || "Pending / not defined yet.";
      const html = isHtml ? raw : `<p>${escapeHtml(raw)}</p>`;
      return `<section class="map-info-panel" data-map-info-panel="${key}" hidden><span>${escapeHtml(heading)}</span>${html}</section>`;
    }).join("");

    title.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", panels);
    setActive(card, active);
    window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
  }

  function rebuildAll(force = false) {
    document.querySelectorAll("#measurementMap .map-card").forEach((card) => rebuildCard(card, force));
  }

  function installStyles() {
    if (document.getElementById("measurementMapForceTabsStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapForceTabsStyles";
    style.textContent = `
      #measurementMap .force-final-map-card .map-field { display: none !important; }
      #measurementMap .force-final-map-card .map-edit { display: none !important; }
      #measurementMap .final-map-tabs { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; overflow: visible !important; padding: 2px 0 4px !important; }
      #measurementMap .final-map-tabs .map-info-tab { flex: 0 0 auto !important; border: 1px solid #dbe5f3; background: #fff; color: #536078; border-radius: 999px; padding: 7px 11px; font: inherit; font-size: 0.82rem; font-weight: 800; white-space: nowrap; min-height: 34px; }
      #measurementMap .final-map-tabs .map-info-tab.active { background: #2563eb; border-color: #2563eb; color: #fff; box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22); }
      #measurementMap .final-map-panels { min-width: 0; }
      #measurementMap .map-info-panel { border: 1px solid #dbe5f3; border-radius: 18px; background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); padding: 14px 15px; min-height: 104px; overflow: hidden; }
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] { background: linear-gradient(135deg, #f8fbff 0%, #fff 100%); border-color: #dbeafe; }
      #measurementMap .map-info-panel[data-map-info-panel="deviceComparison"] { background: linear-gradient(135deg, #f5f3ff 0%, #fff 100%); border-color: #ddd6fe; }
      #measurementMap .map-info-panel > span { display: block; color: #64748b; font-size: 0.76rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
      #measurementMap .map-info-panel p { margin: 0; line-height: 1.35; font-size: clamp(0.94rem, 1.8vw, 1.04rem); color: #1f2937; }
      #measurementMap .linked-analyses-panel-head { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 10px; border: 1px solid #dbeafe; background: #fff; border-radius: 14px; padding: 10px 12px; margin-bottom: 10px; }
      #measurementMap .linked-analyses-panel-head strong { color: #1d4ed8; font-size: 0.9rem; font-weight: 900; white-space: nowrap; }
      #measurementMap .linked-analyses-panel-head span { color: #64748b; font-size: 0.84rem; font-weight: 750; line-height: 1.25; text-align: right; text-transform: none; letter-spacing: normal; margin: 0; }
      #measurementMap .clean-link-chip-row { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px !important; max-height: 250px; overflow-y: auto; overflow-x: hidden; }
      #measurementMap .clean-analysis-chip { box-sizing: border-box; display: grid !important; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 8px; width: 100%; min-width: 0; min-height: 46px; padding: 8px 10px; border-radius: 14px; overflow: hidden; text-align: left; background: #fff; border: 1px solid #bfdbfe; color: #1d4ed8; }
      #measurementMap .clean-analysis-chip .chip-code { display: inline-flex !important; align-items: center; justify-content: center; width: 26px; height: 26px; min-width: 26px; border-radius: 999px; background: #eff6ff; font-size: 0.74rem; font-weight: 900; }
      #measurementMap .clean-analysis-chip .chip-text { display: -webkit-box !important; min-width: 0; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; overflow-wrap: anywhere; font-size: 0.85rem; font-weight: 800; color: #1d4ed8; line-height: 1.16; text-transform: none; letter-spacing: normal; }
      @media (max-width: 560px) { #measurementMap .linked-analyses-panel-head { grid-template-columns: 1fr; } #measurementMap .linked-analyses-panel-head span { text-align: left; } #measurementMap .clean-link-chip-row { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function installEvents() {
    if (window.__measurementMapForceTabsEventsInstalled) return;
    window.__measurementMapForceTabsEventsInstalled = true;
    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("#measurementMap .map-info-tab");
      if (!tab) return;
      const card = tab.closest(".map-card");
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      setActive(card, tab.dataset.mapInfoTab || "measures");
    }, true);
  }

  function init() {
    installStyles();
    installEvents();
    [0, 80, 200, 500, 1000, 2000, 3500, 6000].forEach((delay) => setTimeout(() => rebuildAll(false), delay));
    if (!window.__measurementMapForceTabsObserverInstalled) {
      window.__measurementMapForceTabsObserverInstalled = true;
      const observer = new MutationObserver(() => {
        clearTimeout(window.__measurementMapForceTabsTimer);
        window.__measurementMapForceTabsTimer = setTimeout(() => rebuildAll(false), 40);
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(() => rebuildAll(false), 50));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(() => rebuildAll(false), 80));
  init();
})();
