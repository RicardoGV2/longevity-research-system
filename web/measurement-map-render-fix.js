(() => {
  if (window.__measurementMapRenderFixInstalled) return;
  window.__measurementMapRenderFixInstalled = true;

  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const timers = new Set();
  let enhancementsLoaded = false;
  let lastBasicRenderSignature = "";

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

  function gridIsEnhanced(grid = document.getElementById("measurementMapGrid")) {
    return Boolean(grid?.querySelector?.(".map-info-tabs, .map-info-panels, .map-info-tab"));
  }

  function shouldSkipBasicRender(force = false) {
    const grid = document.getElementById("measurementMapGrid");
    if (!grid) return true;
    if (!force && (enhancementsLoaded || gridIsEnhanced(grid))) return true;
    return false;
  }

  function itemPhoto(item) {
    const src = item.photo || item.photoUrl || "";
    return src ? `<img loading="lazy" src="${esc(src)}" alt="${esc(item.name)}">` : `<div>No photo yet<br><small>Loading photo tools...</small></div>`;
  }

  function card(item) {
    return `<article class="map-card" data-map-id="${esc(item.id)}">
      <div class="map-photo">${itemPhoto(item)}</div>
      <div class="map-body">
        <div class="map-title"><h3>${esc(item.name)}</h3><span class="map-chip">${esc(item.category)}</span><span class="map-chip">${esc(item.priority)}</span></div>
        <div class="map-field"><span>Measures</span><p>${esc(item.measures)}</p></div>
        <div class="map-field"><span>How to use</span><p>${esc(item.use)}</p></div>
        <div class="map-field"><span>Comparison / notes</span><p>${esc(item.comparison)}</p></div>
        <details class="map-edit" hidden>
          <summary>Edit details / photo</summary>
          <input data-field="name" value="${esc(item.name || "")}">
          <input data-field="category" value="${esc(item.category || "")}">
          <input data-field="type" value="${esc(item.type || "")}">
          <input data-field="priority" value="${esc(item.priority || "")}">
          <input data-field="status" value="${esc(item.status || "")}">
          <input data-field="frequency" value="${esc(item.frequency || "")}">
          <textarea data-field="measures">${esc(item.measures || "")}</textarea>
          <textarea data-field="use">${esc(item.use || "")}</textarea>
          <textarea data-field="comparison">${esc(item.comparison || "")}</textarea>
          <textarea data-field="notes">${esc(item.notes || "")}</textarea>
          <input data-field="photoUrl" value="${esc(item.photoUrl || "")}">
        </details>
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
    if (!grid || shouldSkipBasicRender(force)) return Boolean(grid);

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

    const signature = `${filtered.map((item) => item.id).join("|")}::${search}::${category}::${priority}::${status}::${items.length}`;
    if (!force && signature === lastBasicRenderSignature && grid.querySelector(".map-card")) return true;
    lastBasicRenderSignature = signature;

    grid.innerHTML = filtered.length ? filtered.map(card).join("") : `<div class="map-empty">No matching devices, tests or studies.</div>`;
    const statusEl = document.getElementById("measurementMapStatus");
    if (statusEl && /Open this tab|No local Measurement Map|No Measurement Map devices/i.test(statusEl.textContent || "")) {
      statusEl.textContent = "Measurement Map loaded. Advanced tabs and photos are loading now.";
      statusEl.style.color = "#647084";
    }
    window.dispatchEvent(new CustomEvent("measurementMapBasicRendered"));
    return true;
  }

  function clearScheduledBasicRenders() {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  }

  function scheduleRender() {
    if (enhancementsLoaded || gridIsEnhanced()) return;
    requestAnimationFrame(() => renderFromStorage(false));
    [80, 250, 700, 1400].forEach((delay) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        renderFromStorage(false);
      }, delay);
      timers.add(timer);
    });
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
      .then(() => {
        if (!enhancementsLoaded && !gridIsEnhanced()) setTimeout(() => renderFromStorage(true), 500);
        window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
      })
      .catch((error) => setStatus(error.message || "Could not pull Measurement Map.", true));
  }

  const previousRender = window.renderMeasurementMap;
  window.renderMeasurementMap = function renderMeasurementMapPatched() {
    if (enhancementsLoaded || gridIsEnhanced()) {
      if (typeof previousRender === "function") previousRender();
      return;
    }
    const rendered = renderFromStorage(true);
    if (!rendered && typeof previousRender === "function") previousRender();
  };

  function onEnhanced() {
    enhancementsLoaded = true;
    window.__measurementMapEnhancementsReady = true;
    clearScheduledBasicRenders();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
      window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
    }, 80);
  }

  function init() {
    window.__measurementMapFastRendererReady = true;
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
      if (event.target?.id === "mapSearch" && !gridIsEnhanced()) renderFromStorage(true);
    }, true);
    document.addEventListener("change", (event) => {
      if (["mapCategory", "mapPriority", "mapStatus"].includes(event.target?.id) && !gridIsEnhanced()) renderFromStorage(true);
    }, true);
    window.addEventListener("measurementMapAutoPulled", () => {
      if (!enhancementsLoaded && !gridIsEnhanced()) setTimeout(() => renderFromStorage(true), 100);
    });
    window.addEventListener("measurementMapLocalChanged", () => {
      if (!enhancementsLoaded && !gridIsEnhanced()) setTimeout(() => renderFromStorage(true), 100);
    });
    window.addEventListener("measurementMapSeedUpdated", () => {
      if (!enhancementsLoaded && !gridIsEnhanced()) setTimeout(() => renderFromStorage(true), 100);
    });
    window.addEventListener("measurementMapEnhancementsLoaded", onEnhanced);
    [100, 600, 1600].forEach((delay) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        addTemporaryPullButton();
        if (mapIsActive() && !enhancementsLoaded && !gridIsEnhanced()) renderFromStorage(false);
      }, delay);
      timers.add(timer);
    });
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
  init();
})();
