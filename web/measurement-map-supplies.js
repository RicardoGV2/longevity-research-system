(() => {
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const SEEDS = {
    "scale": [
      s("scale-batteries", "Replacement batteries", "Power", "Recommended", "Need / pending", "6–12 months or when low", "€3–€8", "Check the exact battery type in the scale manual before buying.")
    ],
    "tape-measure": [
      s("tape-marker", "Skin-safe marker / reference stickers", "Accuracy aid", "Optional", "Not needed now", "Only if repeatability is poor", "€2–€6", "Helps repeat waist/hip measurements at the same anatomical point.")
    ],
    "bp-monitor": [
      s("bp-batteries", "AA / AAA batteries or power adapter", "Power", "Recommended", "Need / pending", "3–12 months", "€4–€15", "A power adapter is useful if doing repeated home readings."),
      s("bp-cuff", "Correct-size upper-arm cuff", "Compatibility", "Required", "Need / pending", "Replace if damaged", "€15–€35", "Cuff size matters. Wrong cuff size can bias blood-pressure readings."),
      s("bp-log", "BP log sheet / app export", "Data", "Recommended", "Need / pending", "Every measurement cycle", "Free", "Track date, time, posture, caffeine/exercise context, systolic, diastolic and pulse.")
    ],
    "pulse-oximeter": [
      s("ox-batteries", "AAA batteries", "Power", "Recommended", "Need / pending", "As needed", "€3–€8", "Low battery can make readings unreliable or intermittent.")
    ],
    "wearable": [
      s("wearable-charger", "Charging cable / dock", "Power", "Required", "Need / pending", "Daily / as needed", "€10–€35", "Sleep, HRV and activity tracking depend on consistent charging."),
      s("wearable-strap", "Replacement strap", "Maintenance", "Optional", "Not needed now", "When worn out", "€10–€50", "Comfort affects adherence, especially overnight tracking.")
    ],
    "chest-strap": [
      s("strap-battery", "CR2032 battery", "Power", "Required", "Need / pending", "6–12 months", "€2–€6", "Most chest straps use CR2032; confirm the exact model."),
      s("strap-gel", "Electrode gel / contact aid", "Accuracy aid", "Optional", "Not needed now", "As needed", "€5–€12", "Can improve signal quality if readings drop out at the start of exercise.")
    ],
    "glucometer": [
      s("glucose-strips", "Compatible glucose test strips", "Consumable", "Required", "Need / pending", "One strip per reading", "€15–€35 / pack", "Must match the exact glucometer model. Check expiry date and storage instructions."),
      s("glucose-lancets", "Sterile lancets", "Consumable", "Required", "Need / pending", "One lancet per test preferred", "€5–€15 / pack", "Single-use is safest. Reusing lancets increases dullness and contamination risk."),
      s("glucose-lancing-device", "Lancing device", "Accessory", "Required", "Need / pending", "One device", "€5–€20", "Often included with the meter kit, but not always."),
      s("glucose-control", "Control solution", "Quality control", "Recommended", "Need / pending", "New strips / suspicious readings", "€5–€15", "Checks whether meter and strips are reading within expected range."),
      s("glucose-batteries", "Meter batteries", "Power", "Recommended", "Need / pending", "As needed", "€2–€8", "Confirm battery type for the specific meter."),
      s("glucose-sharps", "Sharps container", "Safety", "Recommended", "Need / pending", "Replace when full", "€4–€10", "For safe disposal of used lancets."),
      s("glucose-swabs", "Alcohol swabs / clean-hands setup", "Hygiene", "Recommended", "Need / pending", "Each test if hands cannot be washed", "€3–€8", "Food residue on fingers can strongly distort glucose readings.")
    ],
    "cgm": [
      s("cgm-sensors", "CGM sensors", "Consumable", "Required", "Need / pending", "Usually every 10–14 days", "Varies", "Main recurring cost. Confirm phone compatibility and local availability."),
      s("cgm-overpatch", "Adhesive overpatches", "Adhesive", "Recommended", "Need / pending", "One per sensor if needed", "€5–€15", "Useful for exercise, showers and preventing early sensor loss."),
      s("cgm-skin-prep", "Skin-prep wipes", "Skin prep", "Optional", "Not needed now", "One per sensor if adhesion is poor", "€5–€12", "Can improve adhesion; avoid if skin irritation occurs."),
      s("cgm-reader", "Reader or compatible phone/app", "Compatibility", "Required", "Need / pending", "Once", "Varies", "Check phone model, OS version and whether data export is possible.")
    ],
    "kitchen-scale": [
      s("kitchen-batteries", "Replacement batteries", "Power", "Recommended", "Need / pending", "As needed", "€2–€8", "Keep spare batteries if using food weighing during recipe experiments."),
      s("kitchen-container", "Reusable weighing bowl/container", "Workflow", "Optional", "Not needed now", "Use per recipe", "€2–€10", "Makes tare-based ingredient tracking faster.")
    ],
    "air-monitor": [
      s("air-charger", "USB cable / charger", "Power", "Required", "Need / pending", "Continuous / periodic charging", "€5–€15", "For continuous indoor monitoring, keep it powered if supported."),
      s("air-calibration", "Calibration plan", "Maintenance", "Recommended", "Need / pending", "Per manufacturer instructions", "Free / varies", "CO₂ and air-quality sensors may need calibration or fresh-air baseline exposure.")
    ],
    "spirometer": [
      s("spiro-mouthpieces", "Disposable mouthpieces", "Consumable", "Required", "Need / pending", "One per user/session", "€5–€20", "Important for hygiene and consistent airflow."),
      s("spiro-filters", "Bacterial/viral filters", "Hygiene", "Recommended", "Need / pending", "Per session if supported", "Varies", "Especially important when more than one person uses the device.")
    ],
    "lactate-meter": [
      s("lactate-strips", "Lactate test strips", "Consumable", "Required", "Need / pending", "One strip per reading", "Varies", "Usually the main recurring cost; must match the meter model."),
      s("lactate-lancets", "Sterile lancets", "Consumable", "Required", "Need / pending", "One per reading preferred", "€5–€15", "Use safe single-use lancets and dispose properly."),
      s("lactate-control", "Control solution", "Quality control", "Recommended", "Need / pending", "When readings look inconsistent", "Varies", "Useful because lactate strips are expensive and technique-sensitive.")
    ]
  };

  const DEFAULT = [s("generic-manual", "Manual / setup guide", "Reference", "Recommended", "Need / pending", "Before first use", "Free", "Keep the manual/product page link for setup, limits and troubleshooting.")];

  function s(id, name, type, priority, status, frequency, cost, notes) {
    return { id, name, type, priority, status, frequency, cost, notes, url: "", source: "seed" };
  }

  function esc(v) {
    return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function readMap() {
    try { return JSON.parse(localStorage.getItem(MAP_KEY) || "{}"); } catch { return {}; }
  }
  function writeMap(map) {
    map.updatedAt = new Date().toISOString();
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("measurementMapSuppliesChanged"));
  }
  function currentItem(deviceId) {
    const map = readMap();
    const item = (map.items || []).find((entry) => entry.id === deviceId);
    return { map, item };
  }
  function suppliesFor(deviceId, item) {
    const saved = Array.isArray(item?.supplies) ? item.supplies : [];
    const hidden = new Set(saved.filter((x) => x.hidden).map((x) => x.id));
    const byId = new Map();
    (SEEDS[deviceId] || DEFAULT).forEach((x) => { if (!hidden.has(x.id)) byId.set(x.id, { ...x }); });
    saved.filter((x) => !x.hidden).forEach((x) => byId.set(x.id, { ...x, source: "saved" }));
    return [...byId.values()];
  }
  function statusClass(v) {
    v = String(v || "").toLowerCase();
    if (v.includes("have") || v.includes("ready")) return "have";
    if (v.includes("not needed")) return "optional";
    return "need";
  }
  function priorityClass(v) {
    v = String(v || "").toLowerCase();
    if (v.includes("required")) return "required";
    if (v.includes("recommended")) return "recommended";
    return "optional";
  }
  function searchUrl(name) { return `https://www.google.com/search?q=${encodeURIComponent(`${name} Ireland`)}`; }
  function amazonUrl(name) { return `https://www.amazon.ie/s?k=${encodeURIComponent(name)}`; }
  function summary(supplies) {
    const required = supplies.filter((x) => priorityClass(x.priority) === "required");
    return {
      ready: required.filter((x) => statusClass(x.status) === "have").length,
      required: required.length,
      needed: supplies.filter((x) => statusClass(x.status) === "need").length,
      recurring: supplies.filter((x) => ["Consumable", "Adhesive", "Hygiene", "Power"].includes(x.type)).length
    };
  }
  function cardHtml(x, i) {
    const link = x.url || searchUrl(x.name);
    return `
      <article class="supply-card" data-supply-id="${esc(x.id)}">
        <div class="supply-card-head">
          <div><span class="supply-index">${i + 1}</span><strong>${esc(x.name || "Supply")}</strong></div>
          <div class="supply-chip-row"><span class="supply-chip ${priorityClass(x.priority)}">${esc(x.priority)}</span><span class="supply-chip ${statusClass(x.status)}">${esc(x.status)}</span></div>
        </div>
        <div class="supply-meta-grid">
          ${field("Name", "name", x.name)}${field("Type", "type", x.type)}${select("Priority", "priority", x.priority, ["Required", "Recommended", "Optional"])}${select("Status", "status", x.status, ["Need / pending", "Have / ready", "Not needed now"])}${field("Frequency", "frequency", x.frequency)}${field("Cost", "cost", x.cost)}
        </div>
        <label class="supply-wide">Research notes<textarea data-supply-field="notes" rows="2">${esc(x.notes || "")}</textarea></label>
        <label class="supply-wide">Source / product link<input data-supply-field="url" value="${esc(x.url || "")}" placeholder="https://..."></label>
        <div class="supply-actions">
          <button type="button" class="supply-save-btn">Save</button><button type="button" class="supply-have-btn">Have</button>
          <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open source/search</a><a href="${esc(amazonUrl(x.name))}" target="_blank" rel="noopener noreferrer" class="amazon-supply-link">Amazon.ie</a>
          <button type="button" class="supply-delete-btn">Delete</button>
        </div>
      </article>`;
  }
  function field(label, key, value) { return `<label>${label}<input data-supply-field="${key}" value="${esc(value || "")}"></label>`; }
  function select(label, key, value, options) { return `<label>${label}<select data-supply-field="${key}">${options.map((o) => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`; }

  function ensureTab(card) {
    const tabs = card.querySelector(".map-info-tabs");
    const panels = card.querySelector(".map-info-panels");
    if (!tabs || !panels) return null;
    let btn = tabs.querySelector("[data-map-info-tab='supplies']");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "map-info-tab supplies-tab-btn";
      btn.setAttribute("role", "tab");
      btn.dataset.mapInfoTab = "supplies";
      btn.textContent = "Supplies";
      const notes = tabs.querySelector("[data-map-info-tab='notes']");
      if (notes) tabs.insertBefore(btn, notes); else tabs.appendChild(btn);
    }
    let panel = panels.querySelector("[data-map-info-panel='supplies']");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "map-info-panel supplies-panel";
      panel.dataset.mapInfoPanel = "supplies";
      panel.hidden = card.dataset.activeMapInfoTab !== "supplies";
      const notesPanel = panels.querySelector("[data-map-info-panel='notes']");
      if (notesPanel) panels.insertBefore(panel, notesPanel); else panels.appendChild(panel);
    }
    return panel;
  }

  function renderCard(card) {
    const deviceId = card?.dataset?.mapId;
    if (!deviceId) return;
    const panel = ensureTab(card);
    if (!panel) return;
    const { item } = currentItem(deviceId);
    const supplies = suppliesFor(deviceId, item);
    const key = JSON.stringify(supplies.map((x) => [x.id, x.name, x.type, x.priority, x.status, x.frequency, x.cost, x.url, x.notes]));
    if (panel.dataset.suppliesKey === key) return;
    panel.dataset.suppliesKey = key;
    const sum = summary(supplies);
    panel.innerHTML = `
      <div class="supplies-head"><div><span>Supplies / consumables</span><p>Track the extra items needed to use this device correctly: strips, lancets, batteries, cuffs, adhesives, calibration items and replacement parts.</p></div><button type="button" class="add-supply-btn">+ Add supply</button></div>
      <div class="supplies-summary-row"><span><strong>${sum.ready}/${sum.required}</strong> required ready</span><span><strong>${sum.needed}</strong> still needed</span><span><strong>${sum.recurring}</strong> recurring</span></div>
      <div class="supplies-list">${supplies.map(cardHtml).join("")}</div>`;
  }
  function renderAll() { document.querySelectorAll("#measurementMap .map-card").forEach(renderCard); }

  function saveSupply(card, el) {
    const deviceId = card?.dataset?.mapId;
    if (!deviceId || !el) return;
    const { map, item } = currentItem(deviceId);
    if (!item) return;
    const id = el.dataset.supplyId || `custom-${Date.now()}`;
    const fields = { id, source: "saved", updatedAt: new Date().toISOString() };
    el.querySelectorAll("[data-supply-field]").forEach((input) => fields[input.dataset.supplyField] = input.value.trim());
    item.supplies = [...(item.supplies || []).filter((x) => x.id !== id), fields];
    writeMap(map);
    renderCard(card);
  }
  function addSupply(card) {
    const deviceId = card?.dataset?.mapId;
    const { map, item } = currentItem(deviceId);
    if (!item) return;
    const id = `custom-${Date.now()}`;
    item.supplies = [...(item.supplies || []), s(id, "New supply", "Consumable", "Recommended", "Need / pending", "", "", "")];
    writeMap(map);
    setTimeout(() => { renderCard(card); card.querySelector(`[data-supply-id='${id}'] input[data-supply-field='name']`)?.focus(); }, 40);
  }
  function deleteSupply(card, el) {
    const deviceId = card?.dataset?.mapId;
    const id = el?.dataset?.supplyId;
    const { map, item } = currentItem(deviceId);
    if (!item || !id) return;
    item.supplies = [...(item.supplies || []).filter((x) => x.id !== id), { id, hidden: true, updatedAt: new Date().toISOString() }];
    writeMap(map);
    renderCard(card);
  }

  function installEvents() {
    if (window.__measurementMapSuppliesEventsInstalled) return;
    window.__measurementMapSuppliesEventsInstalled = true;
    document.addEventListener("click", (event) => {
      const card = event.target.closest?.("#measurementMap .map-card");
      if (!card) return;
      const supply = event.target.closest(".supply-card");
      if (event.target.closest(".add-supply-btn")) { event.preventDefault(); addSupply(card); }
      if (event.target.closest(".supply-save-btn")) { event.preventDefault(); saveSupply(card, supply); }
      if (event.target.closest(".supply-have-btn")) { event.preventDefault(); const sel = supply?.querySelector("[data-supply-field='status']"); if (sel) sel.value = "Have / ready"; saveSupply(card, supply); }
      if (event.target.closest(".supply-delete-btn")) { event.preventDefault(); deleteSupply(card, supply); }
    }, true);
    document.addEventListener("change", (event) => {
      const input = event.target.closest?.("#measurementMap .supplies-panel [data-supply-field]");
      if (!input) return;
      saveSupply(input.closest(".map-card"), input.closest(".supply-card"));
    }, true);
  }

  function installStyles() {
    if (document.getElementById("measurementMapSuppliesStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapSuppliesStyles";
    style.textContent = `
      #measurementMap .supplies-panel{background:#fff!important;border-color:#e2e8f0!important;box-shadow:none!important}.supplies-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.supplies-head p{color:#64748b;font-size:.9rem;line-height:1.35;margin:0;max-width:680px}.add-supply-btn{flex:0 0 auto;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#1d4ed8;font:inherit;font-size:.82rem;font-weight:900;padding:8px 11px}.supplies-summary-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.supplies-summary-row span{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;color:#64748b;padding:9px 10px;font-size:.82rem;font-weight:800}.supplies-summary-row strong{color:#111827;font-size:1rem}.supplies-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.supply-card{display:grid;gap:10px;border:1px solid #dbe5f3;border-radius:18px;background:#fff;padding:12px}.supply-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.supply-card-head>div:first-child{display:flex;align-items:center;gap:8px;min-width:0}.supply-card-head strong{min-width:0;color:#111827;font-size:.98rem;line-height:1.2}.supply-index{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:999px;background:#f1f5f9;color:#475569;font-weight:900;font-size:.72rem}.supply-chip-row{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.supply-chip{border-radius:999px;border:1px solid #e2e8f0;padding:4px 7px;font-size:.68rem;font-weight:900;white-space:nowrap}.supply-chip.required{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.supply-chip.recommended{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.supply-chip.optional{background:#f8fafc;color:#64748b;border-color:#e2e8f0}.supply-chip.have{background:#ecfdf5;color:#047857;border-color:#bbf7d0}.supply-chip.need{background:#fff7ed;color:#c2410c;border-color:#fed7aa}.supply-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.supply-card label{display:grid;gap:5px;color:#64748b;font-size:.72rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.supply-card input,.supply-card select,.supply-card textarea{width:100%;border:1px solid #dbe5f3;border-radius:12px;background:#fff;color:#111827;font:inherit;font-size:.86rem;padding:8px 9px;text-transform:none;letter-spacing:normal}.supply-wide{grid-column:1/-1}.supply-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px}.supply-actions button,.supply-actions a{border:1px solid #dbe5f3;border-radius:999px;background:#fff;color:#2563eb;font:inherit;font-size:.78rem;font-weight:850;padding:7px 10px;text-decoration:none}.supply-actions .supply-have-btn{color:#047857;border-color:#bbf7d0;background:#ecfdf5}.supply-actions .amazon-supply-link{color:#b45309;border-color:#fcd34d}.supply-actions .supply-delete-btn{color:#b91c1c;border-color:#fecaca;margin-left:auto}@media(max-width:900px){.supplies-list{grid-template-columns:1fr}}@media(max-width:560px){.supplies-head{flex-direction:column}.supplies-summary-row,.supply-meta-grid{grid-template-columns:1fr}.supply-actions .supply-delete-btn{margin-left:0}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    installStyles(); installEvents(); renderAll();
    [100,400,900,1800,3500].forEach((d) => setTimeout(renderAll, d));
    if (!window.__measurementMapSuppliesObserverInstalled) {
      window.__measurementMapSuppliesObserverInstalled = true;
      new MutationObserver(() => { clearTimeout(window.__measurementMapSuppliesTimer); window.__measurementMapSuppliesTimer = setTimeout(renderAll, 80); }).observe(document.body || document.documentElement, { childList:true, subtree:true });
    }
  }
  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(renderAll, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(renderAll, 80));
  window.addEventListener("measurementMapSuppliesChanged", () => setTimeout(renderAll, 80));
  init();
})();
