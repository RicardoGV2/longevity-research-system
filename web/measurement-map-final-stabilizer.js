(() => {
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const TAB_DEFS = [
    ["measures", "Measures", "What it measures"],
    ["use", "How to use", "How to use it"],
    ["limits", "Limits", "Limits / comparison"],
    ["frequency", "Frequency", "How often"],
    ["analyses", "Links", "Analyses using this device", true],
    ["deviceComparison", "Research", "Device comparison research", true],
    ["notes", "Notes", "Notes"]
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
    try { return JSON.parse(localStorage.getItem(MAP_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeMap(data) {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(MAP_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
  }

  function mapItem(id) {
    const data = readMap();
    const item = Array.isArray(data.items) ? data.items.find((entry) => entry.id === id) : null;
    return { data, item };
  }

  function hiddenField(card, name) {
    return card.querySelector(`[data-field='${name}']`)?.value?.trim() || "";
  }

  function fieldText(card, label) {
    const field = [...card.querySelectorAll(".map-field")].find((node) =>
      node.querySelector("span")?.textContent?.trim().toLowerCase() === label.toLowerCase()
    );
    return field?.querySelector("p")?.textContent?.trim() || "";
  }

  function cleanChipHtml(chip) {
    const id = chip.dataset.analysisId || "";
    const code = chip.querySelector("span")?.textContent?.trim() || "•";
    const textNodes = [...chip.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    let name = textNodes.join(" ") || chip.textContent?.replace(code, "").trim() || "Analysis";
    return `<button type="button" class="map-analysis-chip clean-analysis-chip" data-analysis-id="${escapeHtml(id)}" title="${escapeHtml(name)}"><span class="chip-code">${escapeHtml(code)}</span><span class="chip-text">${escapeHtml(name)}</span></button>`;
  }

  function linkedAnalysesHtml(card) {
    const source = card.querySelector(".map-analysis-links");
    const chips = source ? [...source.querySelectorAll(".map-analysis-chip")] : [];
    if (!chips.length) {
      return `<p class="link-empty">No linked analysis yet. Links appear automatically when an analysis matches this device or study.</p>`;
    }
    return `
      <div class="linked-analyses-panel-head">
        <strong>${chips.length} linked</strong>
        <span>Click one to open its analysis card.</span>
      </div>
      <div class="link-chip-row clean-link-chip-row">${chips.map(cleanChipHtml).join("")}</div>
    `;
  }

  function researchHtml(card) {
    const id = card.dataset.mapId || "";
    const { item } = mapItem(id);
    const note = item?.deviceComparison || item?.researchNotes || "Compare options by price, quality, accuracy, ease of use, data export, availability, privacy and whether this device is worth adding to the protocol.";
    return `<p>${escapeHtml(note)}</p><div class="device-options-editor" data-device-options-for="${escapeHtml(id)}"><div class="device-options-loading">Loading comparison options...</div></div>`;
  }

  function panelValue(card, key) {
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
    return TAB_DEFS.some(([key]) => key === current) ? current : "measures";
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

  function expectedKeys() {
    return TAB_DEFS.map(([key]) => key).join("|");
  }

  function currentKeys(card) {
    return [...card.querySelectorAll(":scope .map-info-tab")].map((button) => button.dataset.mapInfoTab).join("|");
  }

  function ensureCardTabs(card, force = false) {
    if (!card?.classList?.contains("map-card-ui-v2")) return false;
    const title = card.querySelector(":scope .map-title");
    if (!title) return false;

    const missingResearch = !card.querySelector(":scope .map-info-tab[data-map-info-tab='deviceComparison']");
    const missingLinks = !card.querySelector(":scope .map-info-tab[data-map-info-tab='analyses']");
    const oldKeys = currentKeys(card) !== expectedKeys();
    const oldChipLayout = !!card.querySelector(":scope .map-info-panel[data-map-info-panel='analyses'] .map-analysis-chip:not(.clean-analysis-chip)");
    const missingEditor = !!card.querySelector(":scope .map-info-panel[data-map-info-panel='deviceComparison']") && !card.querySelector(":scope .device-options-editor");

    if (!force && !missingResearch && !missingLinks && !oldKeys && !oldChipLayout && !missingEditor) return false;

    const current = activeKey(card);
    card.querySelectorAll(":scope .map-info-tabs, :scope .map-info-panels").forEach((node) => node.remove());

    const tabs = document.createElement("div");
    tabs.className = "map-info-tabs map-info-tabs-full final-map-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = TAB_DEFS.map(([key, label]) => `<button type="button" class="map-info-tab" role="tab" data-map-info-tab="${key}">${escapeHtml(label)}</button>`).join("");

    const panels = document.createElement("div");
    panels.className = "map-info-panels final-map-panels";
    panels.innerHTML = TAB_DEFS.map(([key, _label, heading, isHtml]) => {
      const raw = panelValue(card, key);
      const body = isHtml ? raw : `<p>${escapeHtml(raw)}</p>`;
      return `<section class="map-info-panel" data-map-info-panel="${key}" hidden><span>${escapeHtml(heading)}</span>${body}</section>`;
    }).join("");

    title.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", panels);
    setActive(card, current);
    window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
    return true;
  }

  function seedOptionLinks() {
    const data = readMap();
    let changed = false;
    for (const item of data.items || []) {
      for (const option of item.deviceOptions || []) {
        const name = String(option.name || "").trim();
        if (!name) continue;
        if (!option.url) {
          option.url = `https://www.google.com/search?q=${encodeURIComponent(`${name} buy Ireland`)}`;
          changed = true;
        }
        if (!option.imageSearchUrl) {
          option.imageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} product photo`)}`;
          changed = true;
        }
      }
    }
    if (changed) writeMap(data);
  }

  function ensureOptionLinks() {
    seedOptionLinks();
    document.querySelectorAll("#measurementMap .device-option-row[data-device-id][data-option-id]").forEach((row) => {
      if (row.querySelector(".option-quick-links")) return;
      const deviceId = row.dataset.deviceId;
      const optionId = row.dataset.optionId;
      const { option } = (() => {
        const { item } = mapItem(deviceId);
        return { option: item?.deviceOptions?.find?.((entry) => entry.id === optionId) };
      })();
      if (!option) return;
      const url = option.url || `https://www.google.com/search?q=${encodeURIComponent(`${option.name || "device"} buy Ireland`)}`;
      const imageSearch = option.imageSearchUrl || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${option.name || "device"} product photo`)}`;
      const imageUrl = option.imageUrl || "";
      const actions = row.querySelector(".option-actions") || row;
      const links = document.createElement("div");
      links.className = "option-quick-links";
      links.innerHTML = `
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open link</a>
        <a href="${escapeHtml(imageSearch)}" target="_blank" rel="noopener noreferrer">Find photo</a>
        <button type="button" class="quick-photo-url-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(optionId)}">Photo URL</button>
        ${imageUrl ? `<button type="button" class="quick-use-photo-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(optionId)}">Use photo</button>` : ""}
      `;
      actions.insertAdjacentElement("afterend", links);
    });
  }

  function updateOption(deviceId, optionId, field, value) {
    const data = readMap();
    const item = (data.items || []).find((entry) => entry.id === deviceId);
    const option = item?.deviceOptions?.find?.((entry) => entry.id === optionId);
    if (!option) return null;
    option[field] = value;
    writeMap(data);
    return { item, option };
  }

  function installStyles() {
    if (document.getElementById("measurementMapFinalStabilizerStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapFinalStabilizerStyles";
    style.textContent = `
      #measurementMap .map-body > .map-analysis-links,
      #measurementMap .map-info-panels + .map-analysis-links { display: none !important; }

      #measurementMap .final-map-tabs {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        overflow: visible !important;
        row-gap: 8px !important;
      }

      #measurementMap .final-map-tabs .map-info-tab {
        flex: 0 0 auto !important;
        min-width: 0 !important;
        white-space: nowrap !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] {
        overflow: hidden !important;
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%) !important;
        border-color: #dbeafe !important;
      }

      #measurementMap .linked-analyses-panel-head {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 10px !important;
        border: 1px solid #dbeafe !important;
        background: #ffffff !important;
        border-radius: 14px !important;
        padding: 10px 12px !important;
        margin-bottom: 10px !important;
      }

      #measurementMap .linked-analyses-panel-head strong {
        color: #1d4ed8 !important;
        font-size: 0.9rem !important;
        font-weight: 900 !important;
        letter-spacing: normal !important;
        text-transform: none !important;
        white-space: nowrap !important;
      }

      #measurementMap .linked-analyses-panel-head span {
        min-width: 0 !important;
        color: #64748b !important;
        font-size: 0.84rem !important;
        font-weight: 750 !important;
        line-height: 1.25 !important;
        letter-spacing: normal !important;
        text-transform: none !important;
        text-align: right !important;
        white-space: normal !important;
      }

      #measurementMap .clean-link-chip-row {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
        gap: 8px !important;
        width: 100% !important;
        max-height: 250px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 0 3px 3px 0 !important;
      }

      #measurementMap .clean-analysis-chip {
        box-sizing: border-box !important;
        display: grid !important;
        grid-template-columns: 28px minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        min-height: 46px !important;
        padding: 8px 10px !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        text-align: left !important;
        line-height: 1.18 !important;
        background: #fff !important;
        border: 1px solid #bfdbfe !important;
        color: #1d4ed8 !important;
      }

      #measurementMap .clean-analysis-chip .chip-code,
      #measurementMap .clean-analysis-chip .chip-text {
        text-transform: none !important;
        letter-spacing: normal !important;
        text-align: left !important;
      }

      #measurementMap .clean-analysis-chip .chip-code {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        margin: 0 !important;
        border-radius: 999px !important;
        background: #eff6ff !important;
        font-size: 0.74rem !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      #measurementMap .clean-analysis-chip .chip-text {
        display: -webkit-box !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        font-size: 0.85rem !important;
        font-weight: 800 !important;
        color: #1d4ed8 !important;
        line-height: 1.16 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="deviceComparison"] {
        background: linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%) !important;
        border-color: #ddd6fe !important;
      }

      #measurementMap .option-quick-links {
        display: flex !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        align-items: center !important;
      }

      #measurementMap .option-quick-links a,
      #measurementMap .option-quick-links button {
        border: 1px solid #bfdbfe !important;
        border-radius: 999px !important;
        padding: 7px 10px !important;
        background: #fff !important;
        color: #1d4ed8 !important;
        font-size: 0.78rem !important;
        font-weight: 900 !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        cursor: pointer !important;
      }

      #measurementMap .option-quick-links a:nth-child(2) { color: #6d28d9 !important; border-color: #ddd6fe !important; }
      #measurementMap .quick-use-photo-btn { color: #047857 !important; border-color: #bbf7d0 !important; }

      @media (max-width: 560px) {
        #measurementMap .linked-analyses-panel-head { grid-template-columns: 1fr !important; }
        #measurementMap .linked-analyses-panel-head span { text-align: left !important; }
        #measurementMap .clean-link-chip-row { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installEvents() {
    if (window.__measurementMapFinalStabilizerEventsInstalled) return;
    window.__measurementMapFinalStabilizerEventsInstalled = true;

    document.addEventListener("click", (event) => {
      const tab = event.target.closest?.("#measurementMap .map-info-tab");
      if (tab) {
        const card = tab.closest(".map-card");
        if (card) {
          event.preventDefault();
          event.stopPropagation();
          setActive(card, tab.dataset.mapInfoTab || "measures");
          if ((tab.dataset.mapInfoTab || "") === "deviceComparison") setTimeout(ensureOptionLinks, 80);
        }
        return;
      }

      const photoBtn = event.target.closest?.(".quick-photo-url-btn");
      if (photoBtn) {
        const url = prompt("Paste the product photo URL:");
        if (url) {
          updateOption(photoBtn.dataset.deviceId, photoBtn.dataset.optionId, "imageUrl", url.trim());
          setTimeout(ensureOptionLinks, 80);
        }
        return;
      }

      const usePhoto = event.target.closest?.(".quick-use-photo-btn");
      if (usePhoto) {
        const result = updateOption(usePhoto.dataset.deviceId, usePhoto.dataset.optionId, "selectedPhotoAppliedAt", new Date().toISOString());
        const imageUrl = result?.option?.imageUrl;
        if (!result?.item || !imageUrl) return;
        const data = readMap();
        const item = (data.items || []).find((entry) => entry.id === usePhoto.dataset.deviceId);
        if (item) {
          item.photoUrl = imageUrl;
          item.photo = imageUrl;
          writeMap(data);
        }
        const card = document.querySelector(`#measurementMap .map-card[data-map-id='${cssEscape(usePhoto.dataset.deviceId)}']`);
        const photo = card?.querySelector(".map-photo");
        if (photo) photo.innerHTML = `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(result.option.name || result.item.name || "Device photo")}">`;
      }
    }, true);
  }

  function run(force = false) {
    installStyles();
    document.querySelectorAll("#measurementMap .map-card").forEach((card) => ensureCardTabs(card, force));
    ensureOptionLinks();
  }

  function init() {
    installEvents();
    run(true);
    [80, 250, 600, 1200, 2400, 4200, 7000].forEach((delay) => setTimeout(() => run(false), delay));
    if (!window.__measurementMapFinalStabilizerObserverInstalled) {
      window.__measurementMapFinalStabilizerObserverInstalled = true;
      const observer = new MutationObserver(() => {
        clearTimeout(window.__measurementMapFinalStabilizerTimer);
        window.__measurementMapFinalStabilizerTimer = setTimeout(() => run(false), 90);
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(() => run(false), 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(ensureOptionLinks, 80));
  init();
})();
