(() => {
  const FAST_SCRIPT = "measurement-map-render-fix.js?v=1";
  const SCRIPTS = [
    "measurement-map-device-seed-v2.js?v=4",
    "measurement-map-starter-photos.js?v=5",
    "measurement-map-analysis-links.js?v=5",
    "measurement-map-extra-device-links.js?v=4",
    "measurement-map-card-ui.js?v=5",
    "measurement-map-device-options.js?v=5",
    "measurement-map-device-options-seed.js?v=4",
    "measurement-map-force-tabs.js?v=3",
    "measurement-map-links-panel-fix.js?v=4",
    "measurement-map-image-paste.js?v=4",
    "measurement-map-option-images.js?v=3",
    "measurement-map-real-product-media.js?v=3",
    "measurement-map-option-photo-paste.js?v=2",
    "measurement-map-supplies.js?v=2",
    "measurement-map-inner-scroll.js?v=6",
    "measurement-map-interaction-fixes.js?v=5",
    "measurement-map-device-link-audit.js?v=2"
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

  function tick() {
    return new Promise((resolve) => {
      const idle = window.requestIdleCallback;
      if (idle) idle(resolve, { timeout: 220 });
      else setTimeout(resolve, 18);
    });
  }

  function loadScript(src) {
    if (loadedScripts.has(src) || document.querySelector(`script[src='${src}']`)) return Promise.resolve();
    loadedScripts.add(src);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadFastRenderer() {
    if (fastLoaded) return;
    fastLoaded = true;
    await loadScript(FAST_SCRIPT);
    await tick();
    window.renderMeasurementMap?.();
  }

  async function loadEnhancements() {
    if (started) return;
    started = true;
    document.documentElement.classList.add("measurement-map-enhancing");
    setStatus("Loading Measurement Map tools...");

    try {
      await loadFastRenderer();
      for (const src of SCRIPTS) {
        await loadScript(src);
        await tick();
        if (!mapIsActive()) await tick();
      }

      loaded = true;
      document.documentElement.classList.remove("measurement-map-enhancing");
      setStatus("Measurement Map loaded. GitHub data restores automatically when sync settings are available.");
      window.dispatchEvent(new CustomEvent("measurementMapEnhancementsLoaded"));
    } catch (error) {
      console.error(error);
      document.documentElement.classList.remove("measurement-map-enhancing");
      setStatus(error.message || "Could not load all Measurement Map tools.");
    }
  }

  function activateMapFast() {
    if (!mapIsActive()) return;
    loadFastRenderer();
    if (!loaded) loadEnhancements();
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.(".tab[data-tab='measurementMap']");
    if (!tab) return;
    requestAnimationFrame(activateMapFast);
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    if (mapIsActive()) activateMapFast();
  });

  window.addEventListener("measurementMapRequested", activateMapFast);
  window.LRS_LOAD_MEASUREMENT_MAP_ENHANCEMENTS = loadEnhancements;
})();
