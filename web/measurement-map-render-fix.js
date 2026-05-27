(() => {
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readMap() {
    try { return JSON.parse(localStorage.getItem(MAP_KEY) || "{}"); }
    catch { return {}; }
  }

  function mapIsActive() {
    return document.getElementById("measurementMap")?.classList.contains("active");
  }

  function itemPhoto(item) {
    const src = item.photo || item.photoUrl || "";
    return src ? `<img loading="lazy" src="${esc(src)}" alt="${esc(item.name)}">` : `<div>No photo yet<br><small>Add image below</small></div>`;
  }

  function card(item) {
    return `<article class="map-card" data-map-id="${esc(item.id)}">
      <div class="map-photo">${itemPhoto(item)}</div>
      <div class="map-body">
        <div class="map-title"><h3>${esc(item.name)}</h3><span class="map-chip">${esc(item.category)}</span><span class="map-chip">${esc(item.priority)}</span></div>
        <div class="map-field"><span>Measures</span><p>${esc(item.measures)}</p></div>
        <div class="map-field"><span>How to use</span><p>${esc(item.use)}</p></div>
        <div class="map-field"><span>Comparison / notes</span><p>${esc(item.comparison)}</p></div>
        <input type="hidden" data-field="frequency" value="${esc(item.frequency || "")}">
        <input type="hidden" data-field="notes" value="${esc(item.notes || "")}">
        <input type="hidden" data-field="photoUrl" value="${esc(item.photoUrl || "")}">
      </div>
    </article>`;
  }

  function populateFilter(id, values, selected) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = selected || select.value || "all";
    select.innerHTML = `<option value="all">All</option>${values.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("")}`;
    select.value = values.includes(current) ? current : "all";
  }

  function renderFromStorage(force = false) {
    const grid = document.getElementById("measurementMapGrid");
    if (!grid) return false;
    const state = readMap();
    const items = Array.isArray(state.items) ? state.items : [];

    if (!items.length) {
      if (force || grid.querySelector(".map-empty")) {
        grid.innerHTML = `<div class="map-empty">No local Measurement Map data yet. Use Data & Sync, or click Pull map if available.</div>`;
      }
      return false;
    }

    const categoryValues = [...new Set(items.map((item) => item.category || "Unspecified"))].sort();
    const priorityValues = [...new Set(items.map((item) => item.priority || "Unspecified"))].sort();
    const statusValues = [...new Set(items.map((item) => item.status || "Unspecified"))].sort();
    populateFilter("mapCategory", categoryValues);
    populateFilter("mapPriority", priorityValues);
    populateFilter("mapStatus", statusValues);

    const search = (document.getElementById("mapSearch")?.value || "").trim().toLowerCase();
    const category = document.getElementById("mapCategory")?.value || "all";
    const priority = document.getElementById("mapPriority")?.value || "all";
    const status = document.getElementById("mapStatus")?.value || "all";

    const filtered = items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (priority !== "all" && item.priority !== priority) return false;
      if (status !== "all" && item.status !== status) return false;
      if (search) {
        const text = `${item.name || ""} ${item.category || ""} ${item.type || ""} ${item.priority || ""} ${item.status || ""} ${item.measures || ""} ${item.use || ""} ${item.comparison || ""} ${item.frequency || ""} ${item.notes || ""}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    grid.innerHTML = filtered.length ? filtered.map(card).join("") : `<div class="map-empty">No matching devices, tests or studies.</div>`;
    const statusEl = document.getElementById("measurementMapStatus");
    if (statusEl && /Open this tab|No local Measurement Map|No Measurement Map devices/i.test(statusEl.textContent || "")) {
      statusEl.textContent = "Measurement Map loaded from local data. GitHub data restores automatically when sync settings are available.";
      statusEl.style.color = "#647084";
    }
    window.dispatchEvent(new CustomEvent("measurementMapBasicRendered"));
    return true;
  }

  function scheduleRender() {
    requestAnimationFrame(() => renderFromStorage(false));
    [80, 250, 700, 1400, 2800].forEach((delay) => setTimeout(() => renderFromStorage(false), delay));
  }

  function addTemporaryPullButton() {
    const actions = document.querySelector("#measurementMap .section-head .inline-actions");
    if (!actions || document.getElementById("quickPullMapBtn")) return;
    const button = document.createElement("button");
    button.id = "quickPullMapBtn";
    button.type = "button";
    button.className = "secondary-dark";
    button.textContent = "Pull map";
    actions.appendChild(button);
  }

  function setStatus(text, error = false) {
    const status = document.getElementById("measurementMapStatus");
    if (!status) return;
    status.textContent = text;
    status.style.color = error ? "#b91c1c" : "#647084";
  }

  function pullMapNow() {
    const sync = window.LRS_MEASUREMENT_MAP_AUTO_SYNC;
    if (!sync?.pull) {
      setStatus("Measurement Map sync is still loading. Try again in a moment.", true);
      return;
    }
    setStatus("Pulling Measurement Map from GitHub...");
    Promise.resolve(sync.pull({ force: true }))
      .then(() => setTimeout(() => renderFromStorage(true), 500))
      .catch((error) => setStatus(error.message || "Could not pull Measurement Map.", true));
  }

  const previousRender = window.renderMeasurementMap;
  window.renderMeasurementMap = function renderMeasurementMapPatched() {
    const rendered = renderFromStorage(true);
    if (!rendered && typeof previousRender === "function") previousRender();
  };

  function init() {
    addTemporaryPullButton();
    if (mapIsActive()) scheduleRender();
    document.addEventListener("click", (event) => {
      if (event.target?.id === "quickPullMapBtn") {
        event.preventDefault();
        pullMapNow();
        return;
      }
      if (event.target.closest?.(".tab[data-tab='measurementMap']")) {
        addTemporaryPullButton();
        scheduleRender();
      }
    }, true);
    document.addEventListener("input", (event) => {
      if (["mapSearch"].includes(event.target?.id)) renderFromStorage(true);
    }, true);
    document.addEventListener("change", (event) => {
      if (["mapCategory", "mapPriority", "mapStatus"].includes(event.target?.id)) renderFromStorage(true);
    }, true);
    window.addEventListener("measurementMapAutoPulled", () => setTimeout(() => renderFromStorage(true), 100));
    window.addEventListener("measurementMapLocalChanged", () => setTimeout(() => renderFromStorage(true), 100));
    window.addEventListener("measurementMapSeedUpdated", () => setTimeout(() => renderFromStorage(true), 100));
    window.addEventListener("measurementMapEnhancementsLoaded", () => setTimeout(addTemporaryPullButton, 100));
    [100, 600, 1600, 3500].forEach((delay) => setTimeout(() => { addTemporaryPullButton(); if (mapIsActive()) renderFromStorage(false); }, delay));
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
  init();
})();
