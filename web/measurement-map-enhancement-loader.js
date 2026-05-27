(() => {
  const FAST_SCRIPT = "measurement-map-render-fix.js?v=4";
  const SCRIPTS = [
    "measurement-map-device-seed-v2.js?v=5",
    "measurement-map-starter-photos.js?v=7",
    "measurement-map-analysis-links.js?v=6",
    "measurement-map-extra-device-links.js?v=5",
    "measurement-map-card-ui.js?v=7",
    "measurement-map-device-options.js?v=6",
    "measurement-map-device-options-seed.js?v=5",
    "measurement-map-force-tabs.js?v=4",
    "measurement-map-links-panel-fix.js?v=5",
    "measurement-map-supplies.js?v=3",
    "measurement-map-option-images.js?v=4",
    "measurement-map-real-product-media.js?v=4",
    "measurement-map-image-paste.js?v=5",
    "measurement-map-option-photo-paste.js?v=3",
    "measurement-map-inner-scroll.js?v=7",
    "measurement-map-interaction-fixes.js?v=6",
    "measurement-map-device-link-audit.js?v=3"
  ];

  let started = false;
  let loaded = false;
  let fastLoaded = false;
  const loadedScripts = new Set();

  function mapIsActive() {
    return document.getElementById("measurementMap")?.classList.contains("active");
  }

  function setStatus(message) {
    const status = document.getElementById("measurementMapStatus");
    if (status) status.textContent = message;
  }

  function baseName(src) {
    return String(src).split("?")[0];
  }

  function scriptAlreadyPresent(src) {
    const base = baseName(src);
    return Boolean(Array.from(document.scripts || []).find((script) => (script.getAttribute("src") || "").split("?")[0] === base));
  }

  function frame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function loadScript(src) {
    const base = baseName(src);
    if (loadedScripts.has(base) || scriptAlreadyPresent(src)) {
      loadedScripts.add(base);
      return Promise.resolve();
    }
    loadedScripts.add(base);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function notifyEnhancementsReady() {
    window.dispatchEvent(new CustomEvent("measurementMapBasicRendered"));
    window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
    window.dispatchEvent(new CustomEvent("measurementMapSuppliesChanged"));
    window.dispatchEvent(new CustomEvent("measurementMapEnhancementsLoaded"));
  }

  function finalRefresh() {
    window.renderMeasurementMap?.();
    notifyEnhancementsReady();
    [80, 250, 700, 1400].forEach((delay) => setTimeout(notifyEnhancementsReady, delay));
  }

  async function loadFastRenderer() {
    if (fastLoaded) return;
    fastLoaded = true;
    await loadScript(FAST_SCRIPT);
    await frame();
    window.renderMeasurementMap?.();
  }

  async function loadEnhancements() {
    if (started) {
      if (loaded) finalRefresh();
      return;
    }
    started = true;
    document.documentElement.classList.add("measurement-map-enhancing");
    setStatus("Loading complete Measurement Map tools...");

    try {
      await loadFastRenderer();

      // Load all visual/interactive Measurement Map modules immediately. The previous
      // idle-based loader could leave first-open cards with only partial tabs/photos
      // until a second tab switch caused another rebuild.
      for (const src of SCRIPTS) {
        await loadScript(src);
        notifyEnhancementsReady();
      }

      loaded = true;
      document.documentElement.classList.remove("measurement-map-enhancing");
      setStatus("Measurement Map loaded.");
      finalRefresh();
    } catch (error) {
      console.error(error);
      document.documentElement.classList.remove("measurement-map-enhancing");
      setStatus(error.message || "Could not load all Measurement Map tools.");
    }
  }

  function activateMapFast() {
    if (!mapIsActive()) return;
    loadFastRenderer();
    loadEnhancements();
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.(".tab[data-tab='measurementMap']");
    if (!tab) return;
    requestAnimationFrame(activateMapFast);
    setTimeout(activateMapFast, 120);
    setTimeout(activateMapFast, 600);
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    if (mapIsActive()) activateMapFast();
    [250, 900, 1800].forEach((delay) => setTimeout(() => { if (mapIsActive()) activateMapFast(); }, delay));
  });

  window.addEventListener("measurementMapRequested", activateMapFast);
  window.LRS_LOAD_MEASUREMENT_MAP_ENHANCEMENTS = loadEnhancements;
})();