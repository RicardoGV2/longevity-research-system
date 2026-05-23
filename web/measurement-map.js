(() => {
  const STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const SYNC_SETTINGS_KEY = "longevityResearchSystem.syncSettings.v0.1";

  const DEFAULT_ITEMS = [
    { id: "scale", category: "Home device", name: "Scale", type: "Device", priority: "High", status: "Need / pending", measures: "Body weight and weekly trend.", use: "Measure under consistent conditions: morning, after bathroom, before food. Use weekly average.", comparison: "Basic digital scale is enough. Smart-scale body-fat is trend-only.", frequency: "Daily or 3–4x/week during baseline.", notes: "Core baseline device.", photo: "", photoUrl: "" },
    { id: "tape-measure", category: "Home device", name: "Tape measure", type: "Device", priority: "High", status: "Need / pending", measures: "Waist, hip, neck and other circumferences.", use: "Measure same point, same posture, same time. Take 2–3 readings and average.", comparison: "Flexible tape is enough. Locking body tape reduces variation.", frequency: "Weekly or monthly.", notes: "Important for metabolic risk and body composition trend.", photo: "", photoUrl: "" },
    { id: "bp-monitor", category: "Home device", name: "Blood pressure monitor", type: "Device", priority: "High", status: "Need / pending", measures: "Systolic pressure, diastolic pressure and pulse.", use: "Sit quietly 5 minutes, feet on floor, cuff at heart level. Take 2 readings.", comparison: "Upper-arm validated monitors are preferred over wrist monitors.", frequency: "7-day baseline, then periodic checks.", notes: "High-value home measurement.", photo: "", photoUrl: "" },
    { id: "pulse-oximeter", category: "Home device", name: "Pulse oximeter", type: "Device", priority: "Medium", status: "Need / pending", measures: "Peripheral SpO₂ and pulse.", use: "Use on warm finger, still hand. Wait until reading stabilizes.", comparison: "Useful for spot checks; does not measure oxygen delivery in tissues.", frequency: "Spot checks if useful.", notes: "Interpret carefully.", photo: "", photoUrl: "" },
    { id: "wearable", category: "Wearable", name: "Smartwatch / ring wearable", type: "Device", priority: "High", status: "Need / pending", measures: "Steps, HR, resting HR, HRV, sleep and sometimes SpO₂.", use: "Wear consistently. Focus on trends, not single-day values.", comparison: "Watches are useful for activity/HR; rings can be strong for sleep comfort.", frequency: "Continuous daily tracking.", notes: "Core for longitudinal tracking.", photo: "", photoUrl: "" },
    { id: "chest-strap", category: "Exercise device", name: "Chest heart-rate strap", type: "Device", priority: "Medium", status: "Need / pending", measures: "More accurate exercise heart rate.", use: "Use for zone 2, intervals and recovery tests.", comparison: "Usually more accurate than wrist optical HR during intense movement.", frequency: "During structured cardio/tests.", notes: "Useful for zone 2 and HR recovery.", photo: "", photoUrl: "" },
    { id: "glucometer", category: "Metabolic device", name: "Glucometer", type: "Device", priority: "Medium", status: "Need / pending", measures: "Capillary blood glucose at specific moments.", use: "Use fasting, pre-meal, 1h/2h post-meal for targeted experiments.", comparison: "Cheaper than CGM, but only point-in-time readings.", frequency: "Targeted experiments.", notes: "Useful for food-response research.", photo: "", photoUrl: "" },
    { id: "cgm", category: "Metabolic device", name: "Continuous glucose monitor", type: "Device / Sensor", priority: "Advanced", status: "Research later", measures: "Interstitial glucose trends over days.", use: "Use for short experiment blocks around meals, sleep, stress and exercise.", comparison: "More informative than glucometer for patterns, but expensive and easy to over-interpret.", frequency: "10–14 day blocks if justified.", notes: "Useful after baseline food logging.", photo: "", photoUrl: "" },
    { id: "ecg", category: "Clinical study", name: "12-lead ECG", type: "Study", priority: "Medium", status: "Research later", measures: "Electrical rhythm and conduction at rest.", use: "Done in clinic; useful before intense exercise if symptoms or risk exist.", comparison: "More complete than smartwatch single-lead ECG.", frequency: "If clinically indicated.", notes: "Clinical interpretation required.", photo: "", photoUrl: "" },
    { id: "stress-test", category: "Clinical / functional test", name: "Exercise stress test", type: "Study / Test", priority: "Advanced", status: "Research later", measures: "Cardiac response to exercise and functional tolerance.", use: "Done supervised when safety or exertional symptoms need evaluation.", comparison: "Less complete than CPET but more available.", frequency: "As clinically indicated.", notes: "Not a casual home test.", photo: "", photoUrl: "" },
    { id: "cpet", category: "Clinical / functional test", name: "CPET / VO₂ max", type: "Study / Test", priority: "Advanced", status: "Research later", measures: "VO₂ max, ventilatory thresholds and cardiorespiratory limitation.", use: "Specialized test with mask and exercise protocol.", comparison: "Gold-standard style test for aerobic capacity.", frequency: "Baseline and after training block if justified.", notes: "High information, higher logistics/cost.", photo: "", photoUrl: "" },
    { id: "dexa", category: "Clinical study", name: "DEXA / DXA", type: "Study", priority: "Advanced", status: "Research later", measures: "Bone density, lean mass and fat distribution.", use: "Use as baseline for muscle, fat and bone health when available.", comparison: "More reliable than smart-scale BIA.", frequency: "Every 6–24 months depending on question.", notes: "Useful for longevity mechanics.", photo: "", photoUrl: "" },
    { id: "sleep-study", category: "Clinical study", name: "Sleep study / home sleep apnea test", type: "Study", priority: "Conditional", status: "Research later", measures: "Breathing interruptions, oxygen drops and sleep apnea risk.", use: "Consider with snoring, apneas, daytime sleepiness or resistant hypertension.", comparison: "Home test is simpler; polysomnography is more complete.", frequency: "As indicated.", notes: "High value if apnea is suspected.", photo: "", photoUrl: "" },
    { id: "blood-panel", category: "Lab test", name: "Longevity blood panel", type: "Lab panel", priority: "High", status: "Need / pending", measures: "CBC, metabolic panel, glucose, insulin, HbA1c, lipids, ApoB, Lp(a), hs-CRP, iron/ferritin, vitamin D, B12, folate, thyroid, liver and kidney markers.", use: "Identify internal risk, deficiencies and baseline before supplements/interventions.", comparison: "Useful only when each marker has a decision rule.", frequency: "Baseline, then 3–12 months depending on findings.", notes: "Needs clinical context.", photo: "", photoUrl: "" },
    { id: "air-monitor", category: "Environment device", name: "CO₂ / air quality monitor", type: "Device", priority: "Medium", status: "Research later", measures: "CO₂, PM2.5, VOCs, humidity and temperature depending on model.", use: "Measure bedroom/workspace ventilation and indoor environment.", comparison: "CO₂ is useful for ventilation; PM/VOC sensor quality varies.", frequency: "Spot checks and seasonal monitoring.", notes: "Useful for sleep and indoor environment.", photo: "", photoUrl: "" }
  ];

  let installed = false;
  let hasRenderedOnce = false;
  let mapState = null;
  let filters = { search: "", category: "all", priority: "all", status: "all" };

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadMap() {
    if (mapState) return mapState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) mapState = { items: DEFAULT_ITEMS, updatedAt: new Date().toISOString() };
      else {
        const parsed = JSON.parse(raw);
        mapState = { items: mergeDefaults(Array.isArray(parsed.items) ? parsed.items : []), updatedAt: parsed.updatedAt || new Date().toISOString() };
      }
    } catch {
      mapState = { items: DEFAULT_ITEMS, updatedAt: new Date().toISOString() };
    }
    return mapState;
  }

  function mergeDefaults(items) {
    const byId = new Map(items.map((item) => [item.id, item]));
    const merged = DEFAULT_ITEMS.map((seed) => ({ ...seed, ...(byId.get(seed.id) || {}) }));
    items.forEach((item) => {
      if (!DEFAULT_ITEMS.some((seed) => seed.id === item.id)) merged.push(item);
    });
    return merged;
  }

  function saveMap({ render = true } = {}) {
    const state = loadMap();
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      setStatus("Could not save Measurement Map locally. Photos may be too large for this browser storage.", true);
      console.error(error);
    }
    if (render && isMapActive()) renderMap();
  }

  function isMapActive() {
    return document.getElementById("measurementMap")?.classList.contains("active");
  }

  function ensurePage() {
    let tab = document.querySelector(".tab[data-tab='measurementMap']");
    if (!tab) {
      const tabs = document.querySelector(".tabs");
      const ref = document.querySelector(".tab[data-tab='measurements']");
      tab = document.createElement("button");
      tab.className = "tab";
      tab.dataset.tab = "measurementMap";
      tab.textContent = "Measurement Map";
      tabs?.insertBefore(tab, ref || null);
    }

    if (!tab.dataset.mapListener) {
      tab.dataset.mapListener = "1";
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("measurementMap")?.classList.add("active");
        renderMap();
      });
    }

    if (!document.getElementById("measurementMap")) {
      const section = document.createElement("section");
      section.id = "measurementMap";
      section.className = "panel";
      section.innerHTML = `
        <div class="section-head">
          <div>
            <h2>Ideal map of measurements, tests, devices and studies</h2>
            <p>A working catalog for devices, clinical studies, lab tests and functional measurements. Photos load only when this tab is opened.</p>
          </div>
          <div class="inline-actions">
            <button id="addMapItemBtn" type="button">+ Add item</button>
            <button id="pullMapBtn" class="secondary-dark" type="button">Pull map</button>
            <button id="pushMapBtn" type="button">Push map</button>
          </div>
        </div>
        <div class="map-tools">
          <label><span>Search</span><input id="mapSearch" type="search" placeholder="Search device, test, instruction..." /></label>
          <label><span>Category</span><select id="mapCategory"><option value="all">All</option></select></label>
          <label><span>Priority</span><select id="mapPriority"><option value="all">All</option></select></label>
          <label><span>Status</span><select id="mapStatus"><option value="all">All</option></select></label>
        </div>
        <p id="measurementMapStatus" class="sync-status">Stored locally. Push/Pull uses the same GitHub settings, saved as <code>measurement-map.json</code>.</p>
        <div id="measurementMapGrid" class="measurement-map-grid"><div class="map-empty">Open this tab to load the measurement catalog.</div></div>
      `;
      const measurements = document.getElementById("measurements");
      measurements?.parentElement?.insertBefore(section, measurements);
    }
  }

  function ensureStyles() {
    if (document.getElementById("measurementMapStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapStyles";
    style.textContent = `
      .map-tools { display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: 12px; margin: 16px 0; }
      .map-tools label { display: grid; gap: 6px; color: var(--muted); font-weight: 650; font-size: 0.85rem; }
      .map-tools input, .map-tools select { border: 1px solid var(--line); border-radius: 12px; padding: 9px 11px; font: inherit; background: white; color: var(--ink); min-width: 0; }
      .measurement-map-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .map-card { border: 1px solid var(--line); border-radius: 18px; background: #fbfcff; overflow: hidden; display: grid; grid-template-columns: 170px minmax(0, 1fr); min-width: 0; }
      .map-photo { background: #eef2ff; min-height: 180px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-weight: 750; text-align: center; padding: 12px; }
      .map-photo img { width: 100%; height: 100%; min-height: 180px; object-fit: cover; display: block; }
      .map-body { padding: 14px; min-width: 0; display: grid; gap: 10px; }
      .map-title { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .map-title h3 { margin: 0; font-size: 1.05rem; }
      .map-chip { display: inline-flex; border-radius: 999px; background: #eef1f7; color: #4a5572; padding: 3px 8px; font-size: 0.72rem; font-weight: 750; }
      .map-field { display: grid; gap: 4px; }
      .map-field span { color: var(--muted); font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
      .map-field p { margin: 0; font-size: 0.9rem; overflow-wrap: anywhere; }
      .map-edit { display: grid; gap: 8px; border-top: 1px dashed var(--line); padding-top: 10px; }
      .map-edit input, .map-edit select, .map-edit textarea { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font: inherit; background: white; color: var(--ink); }
      .map-edit textarea { min-height: 70px; resize: vertical; }
      .map-edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .map-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .map-empty { border: 1px dashed var(--line); border-radius: 18px; padding: 24px; text-align: center; color: var(--muted); grid-column: 1 / -1; }
      @media (max-width: 900px) { .measurement-map-grid { grid-template-columns: 1fr; } .map-tools { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .map-card { grid-template-columns: 1fr; } .map-tools, .map-edit-grid { grid-template-columns: 1fr; } .map-photo, .map-photo img { min-height: 210px; } }
    `;
    document.head.appendChild(style);
  }

  function uniqueValues(field) {
    return [...new Set(loadMap().items.map((i) => i[field] || "Unspecified"))].sort();
  }

  function populateFilters() {
    const cat = document.getElementById("mapCategory");
    const pri = document.getElementById("mapPriority");
    const stat = document.getElementById("mapStatus");
    if (cat) cat.innerHTML = `<option value="all">All</option>${uniqueValues("category").map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}`;
    if (pri) pri.innerHTML = `<option value="all">All</option>${uniqueValues("priority").map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}`;
    if (stat) stat.innerHTML = `<option value="all">All</option>${uniqueValues("status").map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}`;
    if (cat) cat.value = filters.category;
    if (pri) pri.value = filters.priority;
    if (stat) stat.value = filters.status;
  }

  function filteredItems() {
    const q = filters.search.toLowerCase();
    return loadMap().items.filter((item) => {
      if (filters.category !== "all" && item.category !== filters.category) return false;
      if (filters.priority !== "all" && item.priority !== filters.priority) return false;
      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (q) {
        const hay = `${item.name} ${item.category} ${item.type} ${item.priority} ${item.status} ${item.measures} ${item.use} ${item.comparison} ${item.frequency} ${item.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderMap() {
    ensurePage();
    ensureStyles();
    populateFilters();
    hasRenderedOnce = true;
    const grid = document.getElementById("measurementMapGrid");
    if (!grid) return;
    const items = filteredItems();
    grid.innerHTML = items.length ? items.map(renderCard).join("") : `<div class="map-empty">No matching devices, tests or studies.</div>`;
  }

  function renderCard(item) {
    const photo = item.photo || item.photoUrl;
    return `
      <article class="map-card" data-map-id="${escapeHtml(item.id)}">
        <div class="map-photo">${photo ? `<img loading="lazy" src="${escapeHtml(photo)}" alt="${escapeHtml(item.name)}">` : `<div>No photo yet<br><small>Add image below</small></div>`}</div>
        <div class="map-body">
          <div class="map-title"><h3>${escapeHtml(item.name)}</h3><span class="map-chip">${escapeHtml(item.category)}</span><span class="map-chip">${escapeHtml(item.priority)}</span></div>
          <div class="map-field"><span>Measures</span><p>${escapeHtml(item.measures)}</p></div>
          <div class="map-field"><span>How to use</span><p>${escapeHtml(item.use)}</p></div>
          <div class="map-field"><span>Comparison / notes</span><p>${escapeHtml(item.comparison)}</p></div>
          <details class="map-edit">
            <summary>Edit item / photo</summary>
            <div class="map-edit-grid">
              <input data-field="name" value="${escapeHtml(item.name)}" placeholder="Name">
              <input data-field="category" value="${escapeHtml(item.category)}" placeholder="Category">
              <input data-field="type" value="${escapeHtml(item.type)}" placeholder="Type">
              <input data-field="priority" value="${escapeHtml(item.priority)}" placeholder="Priority">
              <input data-field="status" value="${escapeHtml(item.status)}" placeholder="Status">
              <input data-field="frequency" value="${escapeHtml(item.frequency)}" placeholder="Frequency">
            </div>
            <textarea data-field="measures" placeholder="What it measures">${escapeHtml(item.measures)}</textarea>
            <textarea data-field="use" placeholder="How to use it">${escapeHtml(item.use)}</textarea>
            <textarea data-field="comparison" placeholder="Comparisons / limitations">${escapeHtml(item.comparison)}</textarea>
            <textarea data-field="notes" placeholder="Notes">${escapeHtml(item.notes)}</textarea>
            <input data-field="photoUrl" value="${escapeHtml(item.photoUrl || "")}" placeholder="Photo URL (optional)">
            <input type="file" accept="image/*" data-action="photo">
            <div class="map-actions"><button type="button" class="secondary-dark" data-action="clear-photo">Clear photo</button><button type="button" class="danger" data-action="delete">Delete</button></div>
          </details>
        </div>
      </article>`;
  }

  function itemFromCard(card) {
    const id = card?.dataset?.mapId;
    return loadMap().items.find((item) => item.id === id);
  }

  async function handlePhotoInput(input, item) {
    const file = input.files?.[0];
    if (!file || !item || !file.type.startsWith("image/")) return;
    const dataUrl = await resizeImage(file, 700, 0.72);
    item.photo = dataUrl;
    item.photoUrl = "";
    saveMap();
  }

  function resizeImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function addItem() {
    loadMap().items.unshift({ id: uid(), category: "Custom", name: "New measurement / device", type: "Device / Study", priority: "Unspecified", status: "Research later", measures: "", use: "", comparison: "", frequency: "", notes: "", photo: "", photoUrl: "" });
    saveMap();
  }

  function setStatus(message, error = false) {
    const el = document.getElementById("measurementMapStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b91c1c" : "#647084";
  }

  function syncSettings() {
    try { return JSON.parse(localStorage.getItem(SYNC_SETTINGS_KEY) || "{}"); } catch { return {}; }
  }
  function mapSyncPath(settings) {
    const base = settings.path || "sync/personal-sync.json";
    return base.includes("/") ? base.replace(/[^/]+$/, "measurement-map.json") : "measurement-map.json";
  }
  function githubFileUrl(settings) {
    const path = mapSyncPath(settings).split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${path}`;
  }
  function authHeaders(settings) {
    return { Accept: "application/vnd.github+json", Authorization: `Bearer ${settings.token}`, "X-GitHub-Api-Version": "2022-11-28" };
  }
  function encodeBase64Unicode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function decodeBase64Unicode(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, "")))); }
  async function getGitHubFile(settings) {
    const response = await fetch(`${githubFileUrl(settings)}?ref=${encodeURIComponent(settings.branch || "main")}`, { headers: authHeaders(settings) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub fetch failed: ${response.status}`);
    return response.json();
  }
  async function pullMap() {
    const settings = syncSettings();
    if (!settings.token || !settings.owner || !settings.repo) return setStatus("Missing GitHub sync settings in Data & Sync.", true);
    try {
      setStatus("Pulling measurement map from GitHub...");
      const metadata = await getGitHubFile(settings);
      if (!metadata) return setStatus(`No measurement map file found yet at ${mapSyncPath(settings)}. Push once first.`, true);
      const payload = JSON.parse(decodeBase64Unicode(metadata.content));
      mapState = { items: mergeDefaults(payload.items || []), updatedAt: payload.updatedAt || new Date().toISOString() };
      saveMap();
      setStatus(`Pulled measurement map. Remote update: ${payload.updatedAt || "unknown"}`);
    } catch (error) { console.error(error); setStatus(error.message, true); }
  }
  async function pushMap() {
    const settings = syncSettings();
    if (!settings.token || !settings.owner || !settings.repo) return setStatus("Missing GitHub sync settings in Data & Sync.", true);
    try {
      setStatus("Pushing measurement map to GitHub...");
      const metadata = await getGitHubFile(settings);
      const payload = { schemaVersion: "measurement-map.v0.1", updatedAt: new Date().toISOString(), items: loadMap().items };
      const body = { message: `Sync measurement map ${payload.updatedAt}`, content: encodeBase64Unicode(JSON.stringify(payload, null, 2)), branch: settings.branch || "main" };
      if (metadata?.sha) body.sha = metadata.sha;
      const response = await fetch(githubFileUrl(settings), { method: "PUT", headers: { ...authHeaders(settings), "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`GitHub push failed: ${response.status} ${await response.text()}`);
      setStatus(`Pushed measurement map to ${mapSyncPath(settings)}.`);
    } catch (error) { console.error(error); setStatus(error.message, true); }
  }

  function setupEvents() {
    if (installed) return;
    installed = true;
    document.addEventListener("input", (event) => {
      const target = event.target;
      if (target?.id === "mapSearch") { filters.search = target.value || ""; renderMap(); return; }
      const card = target?.closest?.(".map-card");
      const item = itemFromCard(card);
      if (!item || !target.dataset.field) return;
      item[target.dataset.field] = target.value;
      if (target.dataset.field === "photoUrl" && target.value.trim()) item.photo = "";
      clearTimeout(target._mapTimer);
      target._mapTimer = setTimeout(() => saveMap({ render: isMapActive() }), 300);
    });
    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target?.id === "mapCategory") { filters.category = target.value; renderMap(); return; }
      if (target?.id === "mapPriority") { filters.priority = target.value; renderMap(); return; }
      if (target?.id === "mapStatus") { filters.status = target.value; renderMap(); return; }
      if (target?.dataset?.action === "photo") handlePhotoInput(target, itemFromCard(target.closest(".map-card")));
    });
    document.addEventListener("click", (event) => {
      if (event.target?.id === "addMapItemBtn") addItem();
      if (event.target?.id === "pullMapBtn") pullMap();
      if (event.target?.id === "pushMapBtn") pushMap();
      const action = event.target?.dataset?.action;
      if (!action) return;
      const item = itemFromCard(event.target.closest(".map-card"));
      if (!item) return;
      if (action === "clear-photo") { item.photo = ""; item.photoUrl = ""; saveMap(); }
      if (action === "delete") { if (!confirm(`Delete ${item.name}?`)) return; mapState.items = loadMap().items.filter((x) => x.id !== item.id); saveMap(); }
    });
  }

  function install() {
    ensurePage();
    ensureStyles();
    setupEvents();
    if (isMapActive()) renderMap();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 900));
})();
