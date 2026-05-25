(() => {
  const EXTRA_RULES = {
    "abpm": {
      title: "24-hour ambulatory blood pressure monitoring",
      keywords: ["24-hour", "24 hour", "ambulatory", "abpm", "night blood pressure", "nocturnal", "white-coat", "masked hypertension", "dipping", "presion arterial ambulatoria", "presión arterial ambulatoria"]
    },
    "thermometer": {
      title: "Thermometer",
      keywords: ["temperature", "temperatura", "fever", "fiebre", "illness", "recovery", "infection", "infeccion", "infección"]
    },
    "kitchen-scale": {
      title: "Kitchen food scale",
      keywords: ["food weight", "kitchen scale", "food scale", "recipe", "receta", "grams", "gramos", "nutrition tracking", "protein", "fiber", "macros", "cantidad", "ingredients", "ingredientes"]
    },
    "grip-dynamometer": {
      title: "Grip strength dynamometer",
      keywords: ["grip", "agarre", "hand strength", "fuerza de agarre", "strength", "functional capacity", "dynanometer", "dynamometer"]
    },
    "lux-meter": {
      title: "Light / lux meter",
      keywords: ["lux", "light", "luz", "morning light", "circadian", "winter", "ireland", "sunlight", "natural light exposure"]
    },
    "spirometer": {
      title: "Spirometry / peak flow meter",
      keywords: ["spirometry", "spirometer", "spiro", "peak flow", "lung", "lungs", "pulmon", "pulmonar", "respiratory", "breathing", "asthma", "falta de aire", "shortness of breath"]
    },
    "rmr-test": {
      title: "Resting metabolic rate test",
      keywords: ["rmr", "resting metabolic rate", "indirect calorimetry", "calorimetry", "metabolic rate", "calories", "calorias", "calorías", "energy expenditure"]
    },
    "lactate-meter": {
      title: "Lactate meter",
      keywords: ["lactate", "lactato", "threshold", "umbral", "zone 2", "zona 2", "training zones", "exercise physiology"]
    }
  };

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

  function categoriesById() {
    const map = new Map();
    for (const cat of state?.analyses?.categories || []) map.set(cat.id, cat);
    return map;
  }

  function itemText(item) {
    const cat = categoriesById().get(item.categoryId);
    return norm(`${item.name || ""} ${item.kind || ""} ${item.description || ""} ${item.notes || ""} ${cat?.name || ""} ${cat?.description || ""}`);
  }

  function matches(item, deviceId) {
    const rule = EXTRA_RULES[deviceId];
    if (!rule) return false;
    const text = itemText(item);
    return rule.keywords.some((kw) => text.includes(norm(kw)));
  }

  function analysesFor(deviceId) {
    return (state?.analyses?.items || []).filter((item) => matches(item, deviceId));
  }

  function categoryLabel(item) {
    const cat = categoriesById().get(item.categoryId);
    return cat?.code || "Analysis";
  }

  function openAnalysis(itemId) {
    const tab = document.querySelector(".tab[data-tab='analyses']");
    tab?.click();
    const item = (state?.analyses?.items || []).find((entry) => entry.id === itemId);
    if (!item) return;
    if (typeof analysisFilters === "object") {
      analysisFilters.search = "";
      analysisFilters.category = item.categoryId || "all";
      analysisFilters.status = "all";
      analysisFilters.priority = "all";
      if ("kind" in analysisFilters) analysisFilters.kind = "all";
      if ("recurrence" in analysisFilters) analysisFilters.recurrence = "all";
    }
    expandedCategories?.add?.(item.categoryId);
    expandedItems?.add?.(item.id);
    renderAnalyses?.();
    setTimeout(() => {
      const row = document.querySelector(`#analysesCategories .analysis-item[data-item-id='${cssEscape(item.id)}']`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.classList.add("link-flash");
      setTimeout(() => row?.classList.remove("link-flash"), 1400);
    }, 90);
  }

  function openDevice(deviceId) {
    document.querySelector(".tab[data-tab='measurementMap']")?.click();
    setTimeout(() => {
      const card = document.querySelector(`#measurementMap .map-card[data-map-id='${cssEscape(deviceId)}']`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.classList.add("link-flash");
      setTimeout(() => card?.classList.remove("link-flash"), 1400);
    }, 220);
  }

  function addMapLinks() {
    for (const deviceId of Object.keys(EXTRA_RULES)) {
      const card = document.querySelector(`#measurementMap .map-card[data-map-id='${cssEscape(deviceId)}']`);
      if (!card) continue;
      const analyses = analysesFor(deviceId);
      let box = card.querySelector(".map-analysis-links");
      if (!box) {
        box = document.createElement("section");
        box.className = "map-analysis-links";
        card.querySelector(".map-info-panels")?.insertAdjacentElement("afterend", box);
      }
      if (box.dataset.extraDeviceLinks === "1") continue;
      box.dataset.extraDeviceLinks = "1";
      box.innerHTML = `
        <div class="link-box-head"><span>Used by analyses</span><small>${analyses.length ? `${analyses.length} linked` : "No linked analysis yet"}</small></div>
        ${analyses.length ? `<div class="link-chip-row">${analyses.slice(0, 14).map((item) => `<button type="button" class="map-analysis-chip" data-analysis-id="${escapeHtml(item.id)}"><span>${escapeHtml(categoryLabel(item))}</span>${escapeHtml(item.name)}</button>`).join("")}</div>` : `<p class="link-empty">This device is in the catalog, but no analysis currently points to it.</p>`}
      `;
    }
  }

  function addAnalysisChips() {
    document.querySelectorAll("#analysesCategories .analysis-item[data-item-id]").forEach((row) => {
      if (row.dataset.extraDeviceLinks === "1") return;
      const item = (state?.analyses?.items || []).find((entry) => entry.id === row.dataset.itemId);
      if (!item) return;
      const ids = Object.keys(EXTRA_RULES).filter((id) => matches(item, id));
      if (!ids.length) return;
      row.dataset.extraDeviceLinks = "1";
      const target = row.querySelector(".analysis-device-links") || row.querySelector(".kind-chip") || row.querySelector(".item-name");
      const chips = document.createElement("span");
      chips.className = "analysis-device-links extra-analysis-device-links";
      chips.innerHTML = ids.map((id) => `<button type="button" class="analysis-device-chip" data-device-id="${escapeHtml(id)}">${escapeHtml(EXTRA_RULES[id].title)}</button>`).join("");
      target?.insertAdjacentElement("afterend", chips);
    });
  }

  function installEvents() {
    if (window.__measurementMapExtraDeviceLinksEventsInstalled) return;
    window.__measurementMapExtraDeviceLinksEventsInstalled = true;
    document.addEventListener("click", (event) => {
      const analysis = event.target.closest?.("#measurementMap .map-analysis-chip");
      if (analysis) {
        event.preventDefault();
        event.stopPropagation();
        openAnalysis(analysis.dataset.analysisId);
        return;
      }
      const device = event.target.closest?.(".analysis-device-chip");
      if (device) {
        event.preventDefault();
        event.stopPropagation();
        openDevice(device.dataset.deviceId);
      }
    }, true);
  }

  function run() {
    addMapLinks();
    addAnalysisChips();
  }

  document.addEventListener("DOMContentLoaded", () => [300, 900, 1800].forEach((delay) => setTimeout(run, delay)));
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 60));
  installEvents();
  run();
})();
