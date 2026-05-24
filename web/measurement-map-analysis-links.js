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

  function ensureMapLinks(card) {
    const deviceId = card?.dataset?.mapId;
    if (!deviceId || !DEVICE_RULES[deviceId]) return;
    const body = card.querySelector(".map-body");
    if (!body) return;
    let box = card.querySelector(".map-analysis-links");
    if (!box) {
      box = document.createElement("section");
      box.className = "map-analysis-links";
      const panels = card.querySelector(".map-info-panels");
      const edit = card.querySelector(".map-edit");
      if (panels) panels.insertAdjacentElement("afterend", box);
      else body.insertBefore(box, edit || null);
    }

    const analyses = analysesForDevice(deviceId);
    box.innerHTML = `
      <div class="link-box-head">
        <span>Used by analyses</span>
        <small>${analyses.length ? `${analyses.length} linked` : "No linked analysis yet"}</small>
      </div>
      ${analyses.length ? `
        <div class="link-chip-row">
          ${analyses.slice(0, 14).map((item) => `
            <button type="button" class="map-analysis-chip" data-analysis-id="${escapeHtml(item.id)}" title="Open this analysis">
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
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    panel.classList.add("active");
    tab.dispatchEvent(new Event("click", { bubbles: true }));
    return true;
  }

  function openAnalysis(itemId) {
    const item = activeAnalysesItems().find((i) => i.id === itemId);
    if (!item) return;
    activateTab("analyses");
    if (typeof analysisFilters === "object") {
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
      const select = document.getElementById("filterCategory");
      if (select) select.value = item.categoryId || "all";
      const row = document.querySelector(`#analysesCategories .analysis-item[data-item-id='${CSS.escape(item.id)}']`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.classList.add("link-flash");
      setTimeout(() => row?.classList.remove("link-flash"), 1600);
    }, 80);
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
      const card = document.querySelector(`#measurementMap .map-card[data-map-id='${CSS.escape(deviceId)}']`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.classList.add("link-flash");
      setTimeout(() => card?.classList.remove("link-flash"), 1600);
    }, 220);
  }

  function installEvents() {
    if (window.__measurementMapAnalysisLinksEventsInstalled) return;
    window.__measurementMapAnalysisLinksEventsInstalled = true;
    document.addEventListener("click", (event) => {
      const analysisChip = event.target.closest?.(".map-analysis-chip");
      if (analysisChip) {
        event.preventDefault();
        event.stopPropagation();
        openAnalysis(analysisChip.dataset.analysisId);
        return;
      }
      const deviceChip = event.target.closest?.(".analysis-device-chip");
      if (deviceChip) {
        event.preventDefault();
        event.stopPropagation();
        openDevice(deviceChip.dataset.deviceId);
      }
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

      #measurementMap .map-analysis-links {
        border: 1px solid #dbeafe;
        border-radius: 18px;
        background: linear-gradient(135deg, #f8fbff 0%, #eff6ff 100%);
        padding: 12px;
        display: grid;
        gap: 9px;
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
        color: #2563eb;
        font-weight: 800;
      }

      .link-chip-row,
      .analysis-device-links {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .map-analysis-chip,
      .analysis-device-chip {
        border: 1px solid #bfdbfe;
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

      .map-analysis-chip span {
        display: inline-grid;
        place-items: center;
        min-width: 20px;
        height: 20px;
        border-radius: 999px;
        margin-right: 5px;
        background: #eff6ff;
        color: #1d4ed8;
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
