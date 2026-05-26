(() => {
  function pageHtml() {
    return `
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
      <div id="measurementMapGrid" class="measurement-map-grid"><div class="map-empty">Open this tab to load the measurement catalog.</div></div>`;
  }

  function install() {
    const tabs = document.querySelector(".tabs");
    if (!tabs) return;

    let tab = document.querySelector(".tab[data-tab='measurementMap']");
    if (!tab) {
      tab = document.createElement("button");
      tab.className = "tab";
      tab.dataset.tab = "measurementMap";
      tab.type = "button";
      tab.textContent = "Measurement Map";
      const before = document.querySelector(".tab[data-tab='measurements']") || document.querySelector(".tab[data-tab='recipe']");
      tabs.insertBefore(tab, before || null);
    }

    let section = document.getElementById("measurementMap");
    if (!section) {
      section = document.createElement("section");
      section.id = "measurementMap";
      section.className = "panel";
      section.innerHTML = pageHtml();
      const measurements = document.getElementById("measurements");
      measurements?.parentElement?.insertBefore(section, measurements);
    } else if (!document.getElementById("measurementMapGrid")) {
      section.innerHTML = pageHtml();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  install();
})();
