(() => {
  const DEVICE_RULES = {
    "scale": {
      title: "Scale",
      keywords: ["weight", "peso", "body weight", "actual weight", "daily weight", "weekly weight"]
    },
    "tape-measure": {
      title: "Tape measure",
      keywords: ["waist", "cintura", "hip", "cadera", "neck", "cuello", "circumference", "circunferencia", "measure", "medida corporal", "body measurement", "photos", "fotos"]
    },
    "bp-monitor": {
      title: "Blood pressure monitor",
      keywords: ["blood pressure", "presión arterial", "presion arterial", "hypertension", "hipertensión", "hipertension", "systolic", "diastolic", "mmhg"]
    },
    "pulse-oximeter": {
      title: "Pulse oximeter",
      keywords: ["spo2", "spO₂", "oxygen", "oxígeno", "oxigeno", "oximeter", "oxímetro", "oximetro", "peripheral saturation"]
    },
    "wearable": {
      title: "Smartwatch / ring wearable",
      keywords: ["wearable", "smartwatch", "ring", "steps", "pasos", "sleep", "sueño", "sueno", "hrv", "resting heart rate", "nighttime heart rate", "nighttime hrv", "walks", "natural light exposure"]
    },
    "chest-strap": {
      title: "Chest heart-rate strap",
      keywords: ["chest", "heart-rate strap", "heart rate strap", "zone 2", "zona 2", "post-effort heart rate recovery", "heart rate recovery", "hr recovery", "exercise heart rate", "cardio"]
    },
    "glucometer": {
      title: "Glucometer",
      keywords: ["glucometer", "glucómetro", "glucometro", "capillary glucose", "fasting glucose", "glucose", "glucosa", "post-meal", "meal glucose", "food response"]
    },
    "cgm": {
      title: "Continuous glucose monitor",
      keywords: ["cgm", "continuous glucose", "sensor continuo", "glucose trend", "glucose response", "respuesta glucémica", "respuesta glucemica"]
    },
    "ecg": {
      title: "12-lead ECG",
      keywords: ["ecg", "electrocardiogram", "electrocardiograma", "rhythm", "ritmo", "conduction"]
    },
    "stress-test": {
      title: "Exercise stress test",
      keywords: ["stress test", "prueba de esfuerzo", "exercise stress", "cardiac response", "functional tolerance"]
    },
    "cpet": {
      title: "CPET / VO₂ max",
      keywords: ["cpet", "vo2", "vo₂", "vo₂ max", "vo2 max", "aerobic capacity", "capacidad aeróbica", "cardiorespiratory", "ventilatory"]
    },
    "dexa": {
      title: "DEXA / DXA",
      keywords: ["dexa", "dxa", "bone density", "densidad ósea", "densidad osea", "body composition", "composición corporal", "composicion corporal", "muscle mass", "lean mass", "visceral fat", "grasa visceral", "bone health"]
    },
    "sleep-study": {
      title: "Sleep study / home sleep apnea test",
      keywords: ["sleep study", "sleep apnea", "apnea", "polysomnography", "polisomnografía", "polisomnografia", "home sleep", "snoring", "roncar", "nocturnal oximetry", "oximetría nocturna", "oximetria nocturna"]
    },
    "blood-panel": {
      title: "Longevity blood panel",
      keywords: ["blood panel", "blood test", "lab", "cbc", "complete blood count", "hemograma", "metabolic panel", "fasting glucose", "glucose", "glucosa", "insulin", "insulina", "hba1c", "lipid", "lípidos", "lipidos", "apob", "lp(a)", "hs-crp", "pcr", "ferritin", "ferritina", "iron", "hierro", "vitamin d", "vitamina d", "b12", "folate", "folato", "tsh", "thyroid", "tiroides", "liver", "hígado", "higado", "kidney", "riñón", "rinon", "testosterone", "magnesium", "omega-3"]
    },
    "air-monitor": {
      title: "CO₂ / air quality monitor",
      keywords: ["co2", "co₂", "air quality", "calidad del aire", "pm2.5", "pm10", "voc", "humidity", "humedad", "mold", "moho", "temperature", "temperatura", "ventilation", "ventilación", "ventilacion"]
    }
  };

  let lastNavigationKey = "";
  let lastNavigationAt = 0;

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

  function activeAnalysesItems() {
    const items = state?.analyses?.items;
    return Array.isArray(items) ? items : [];
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

  function itemMatchesDevice(item, deviceId) {
    const rule = DEVICE_RULES[deviceId];
    if (!rule || !item) return false;
    const text = itemText(item);
    return rule.keywords.some((kw) => text.includes(norm(kw)));
  }

  function devicesForItem(item) {
    return Object.keys(DEVICE_RULES).filter((deviceId) => itemMatchesDevice(item, deviceId));
  }

  function analysesForDevice(deviceId) {
    return activeAnalysesItems()
      .filter((item) => itemMatchesDevice(item, deviceId))
      .sort((a, b) => {
        const ca = categoriesById().get(a.categoryId)?.code || "Z";
        const cb = categoriesById().get(b.categoryId)?.code || "Z";
        return ca.localeCompare(cb) || String(a.name || "").localeCompare(String(b.name || ""));
      });
  }

  function categoryLabel(item) {
    const cat = categoriesById().get(item.categoryId);
    return cat?.code ? `${cat.code}` : "Analysis";
  }

  function ensureReadOnlyMeasurementMap() {
    const addBtn = document.getElementById("addMapItemBtn");
    if (addBtn) addBtn.hidden = true;
    document.querySelectorAll("#measurementMap .map-edit").forEach((edit) => { edit.hidden = true; });
  }

  function removeLegacyLinkBlocks(card, panel) {
    card.querySelectorAll(".map-analysis-links").forEach((section) => {
      if (!panel.contains(section)) section.remove();
    });
    card.querySelectorAll(".map-analysis-links-source-only").forEach((section) => section.remove());
  }

  function ensureMapLinks(card) {
    const deviceId = card?.dataset?.mapId;
    if (!deviceId || !DEVICE_RULES[deviceId]) return;
    const panel = card.querySelector(".map-info-panel[data-map-info-panel='analyses']");
    if (!panel) return;

    removeLegacyLinkBlocks(card, panel);

    let box = panel.querySelector(".map-analysis-links.inside-links-panel");
    if (!box) {
      box = document.createElement("section");
      box.className = "map-analysis-links inside-links-panel";
      panel.innerHTML = "";
      panel.appendChild(box);
    }

    const analyses = analysesForDevice(deviceId);
    box.innerHTML = `
      <div class="link-box-head compact-link-box-head">
        <span>Analyses using this device</span>
        <small>${analyses.length ? `${analyses.length} linked` : "No linked analysis yet"}</small>
      </div>
      ${analyses.length ? `
        <p class="link-help">Click one to open its analysis card.</p>
        <div class="link-chip-row compact-link-chip-row">
          ${analyses.map((item) => `
            <button type="button" class="map-analysis-chip" data-analysis-id="${escapeHtml(item.id)}" title="Open ${escapeHtml(item.name)}">
              <span>${escapeHtml(categoryLabel(item))}</span>${escapeHtml(item.name)}
            </button>`).join("")}
        </div>
      ` : `<p class="link-empty">This device is in the catalog, but no analysis currently points to it.</p>`}
    `;
  }

  function enhanceMapCards() {
    ensureReadOnlyMeasurementMap();
    document.querySelectorAll("#measurementMap .map-card").forEach(ensureMapLinks);
  }

  function deviceChipsHtml(item) {
    const ids = devicesForItem(item);
    if (!ids.length) return "";
    return `<span class="analysis-device-links" title="Devices or studies that can support this analysis">${ids.slice(0, 4).map((id) => `
      <button type="button" class="analysis-device-chip" data-device-id="${escapeHtml(id)}">${escapeHtml(DEVICE_RULES[id].title)}</button>
    `).join("")}</span>`;
  }

  function installRenderItemWrapper() {
    if (typeof renderItemRow !== "function" || renderItemRow.__deviceLinksWrapped) return;
    const originalRenderItemRow = renderItemRow;
    renderItemRow = function renderItemRowWithDeviceLinks(item) {
      const html = originalRenderItemRow(item);
      if (!item || html.includes("analysis-device-links")) return html;
      const chips = deviceChipsHtml(item);
      if (!chips) return html;
      const anchor = /(<span class="kind-chip"[\s\S]*?<\/span>)/;
      if (anchor.test(html)) return html.replace(anchor, `$1${chips}`);
      return html.replace(/(<button type="button" class="item-name"[\s\S]*?<\/button>)/, `$1${chips}`);
    };
    renderItemRow.__deviceLinksWrapped = true;
  }

  function installRenderAnalysesWrapper() {
    if (typeof renderAnalyses !== "function" || renderAnalyses.__deviceLinksWrapped) return;
    const originalRenderAnalyses = renderAnalyses;
    renderAnalyses = function renderAnalysesWithDeviceLinks(...args) {
      installRenderItemWrapper();
      const result = originalRenderAnalyses.apply(this, args);
      setTimeout(enhanceMapCards, 20);
      return result;
    };
    renderAnalyses.__deviceLinksWrapped = true;
  }

  function activateTab(tabId) {
    const tab = document.querySelector(`.tab[data-tab='${tabId}']`);
    const panel = document.getElementById(tabId);
    if (!tab || !panel) return false;
    if (typeof tab.click === "function") tab.click();
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === tab));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p === panel));
    return true;
  }

  function openAnalysis(itemId) {
    const item = activeAnalysesItems().find((i) => i.id === itemId);
    if (!item) return;
    activateTab("analyses");
    if (typeof analysisFilters === "object") {
      analysisFilters.search = "";
      analysisFilters.category = item.categoryId || "all";
      analysisFilters.status = "all";
      analysisFilters.priority = "all";
      if ("kind" in analysisFilters) analysisFilters.kind = "all";
      if ("recurrence" in analysisFilters) analysisFilters.recurrence = "all";
    }
    if (typeof expandedCategories?.add === "function") expandedCategories.add(item.categoryId);
    if (typeof expandedItems?.add === "function") expandedItems.add(item.id);
    if (typeof renderAnalyses === "function") renderAnalyses();
    setTimeout(() => {
      const search = document.getElementById("analysisSearch");
      if (search) search.value = "";
      const select = document.getElementById("filterCategory");
      if (select) select.value = item.categoryId || "all";
      const row = document.querySelector(`#analysesCategories .analysis-item[data-item-id='${cssEscape(item.id)}']`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.classList.add("link-flash");
      setTimeout(() => row?.classList.remove("link-flash"), 1600);
    }, 90);
  }

  function openDevice(deviceId) {
    activateTab("measurementMap");
    setTimeout(() => {
      ["mapCategory", "mapPriority", "mapStatus"].forEach((id) => {
        const select = document.getElementById(id);
        if (select && select.value !== "all") {
          select.value = "all";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      const search = document.getElementById("mapSearch");
      if (search && search.value) {
        search.value = "";
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, 40);
    setTimeout(() => {
      enhanceMapCards();
      const card = document.querySelector(`#measurementMap .map-card[data-map-id='${cssEscape(deviceId)}']`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.classList.add("link-flash");
      setTimeout(() => card?.classList.remove("link-flash"), 1600);
    }, 220);
  }

  function navigateFromChip(chip, event) {
    if (!chip) return false;
    const isAnalysis = chip.classList.contains("map-analysis-chip");
    const id = isAnalysis ? chip.dataset.analysisId : chip.dataset.deviceId;
    if (!id) return false;

    const key = `${isAnalysis ? "analysis" : "device"}:${id}`;
    const now = Date.now();
    if (key === lastNavigationKey && now - lastNavigationAt < 380) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return true;
    }
    lastNavigationKey = key;
    lastNavigationAt = now;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.getSelection?.()?.removeAllRanges?.();
    if (isAnalysis) openAnalysis(id);
    else openDevice(id);
    return true;
  }

  function installEvents() {
    if (window.__measurementMapAnalysisLinksEventsInstalled) return;
    window.__measurementMapAnalysisLinksEventsInstalled = true;

    const handleNavigation = (event) => {
      const chip = event.target.closest?.("#measurementMap .map-analysis-chip, .analysis-device-chip");
      if (chip) navigateFromChip(chip, event);
    };

    document.addEventListener("pointerup", handleNavigation, true);
    document.addEventListener("click", handleNavigation, true);
    document.addEventListener("keyup", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const chip = event.target.closest?.("#measurementMap .map-analysis-chip, .analysis-device-chip");
      if (chip) navigateFromChip(chip, event);
    }, true);
  }

  function installStyles() {
    if (document.getElementById("measurementMapAnalysisLinkStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapAnalysisLinkStyles";
    style.textContent = `
      #measurementMap .map-edit,
      #measurementMap #addMapItemBtn {
        display: none !important;
      }

      #measurementMap .map-body > .map-analysis-links,
      #measurementMap .map-analysis-links-source-only {
        display: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] > .map-analysis-links.inside-links-panel {
        border: 1px solid #dbe5f3;
        border-radius: 18px;
        background: #ffffff;
        padding: 12px;
        display: grid;
        gap: 9px;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.015);
      }

      .link-box-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .link-box-head span {
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .link-box-head small {
        color: #334155;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        padding: 4px 8px;
        font-weight: 900;
      }

      .link-help {
        margin: -2px 0 1px;
        color: #64748b;
        font-size: 0.84rem;
        font-weight: 750;
      }

      .link-chip-row,
      .analysis-device-links {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .compact-link-chip-row {
        max-height: 250px;
        overflow: auto;
        padding-right: 3px;
      }

      .map-analysis-chip,
      .analysis-device-chip {
        border: 1px solid #dbe5f3;
        background: #ffffff;
        color: #1d4ed8;
        border-radius: 999px;
        padding: 6px 9px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 850;
        line-height: 1.1;
        cursor: pointer;
      }

      .map-analysis-chip:hover,
      .analysis-device-chip:hover {
        border-color: #93c5fd;
        background: #f8fbff;
      }

      .map-analysis-chip span {
        display: inline-grid;
        place-items: center;
        min-width: 20px;
        height: 20px;
        border-radius: 999px;
        margin-right: 5px;
        background: #f1f5f9;
        color: #2563eb;
        font-size: 0.72rem;
      }

      .analysis-device-links {
        order: 4;
        margin-left: 0;
      }

      .analysis-device-chip {
        background: #f8fbff;
        color: #0f766e;
        border-color: #99f6e4;
      }

      .link-empty {
        margin: 0;
        color: #64748b;
        font-size: 0.9rem;
      }

      .link-flash {
        animation: linkFlash 1.45s ease-out;
      }

      @keyframes linkFlash {
        0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.55); }
        45% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.18); }
        100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
      }

      @media (max-width: 560px) {
        .analysis-device-links {
          width: 100%;
          margin-left: 17px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function observePage() {
    if (window.__measurementMapAnalysisLinksObserverInstalled) return;
    window.__measurementMapAnalysisLinksObserverInstalled = true;
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapAnalysisLinksTimer);
      window.__measurementMapAnalysisLinksTimer = setTimeout(() => {
        installRenderItemWrapper();
        installRenderAnalysesWrapper();
        enhanceMapCards();
      }, 50);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    installEvents();
    installRenderItemWrapper();
    installRenderAnalysesWrapper();
    observePage();
    [0, 120, 600, 1500].forEach((delay) => setTimeout(() => {
      installRenderItemWrapper();
      enhanceMapCards();
      if (typeof renderAnalyses === "function") renderAnalyses();
    }, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();