(() => {
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const SYNC_SETTINGS_KEY = "longevityResearchSystem.syncSettings.v0.1";

  function installStyles() {
    if (document.getElementById("measurementMapInnerScrollStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapInnerScrollStyles";
    style.textContent = `
      #measurementMap .map-info-tabs,
      #measurementMap .clean-link-chip-row,
      #measurementMap .device-options-table,
      #measurementMap .device-options-list {
        cursor: grab;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
      }
      #measurementMap .map-info-tabs.inner-dragging,
      #measurementMap .clean-link-chip-row.inner-dragging,
      #measurementMap .device-options-table.inner-dragging,
      #measurementMap .device-options-list.inner-dragging {
        cursor: grabbing;
        user-select: none;
        -webkit-user-select: none;
      }
      #measurementMap .map-info-tabs.inner-dragging *,
      #measurementMap .clean-link-chip-row.inner-dragging *,
      #measurementMap .device-options-table.inner-dragging *,
      #measurementMap .device-options-list.inner-dragging * {
        pointer-events: none;
      }
      #measurementMap .clean-link-chip-row {
        max-height: 280px;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        padding-right: 4px;
      }
      #measurementMap .clean-analysis-chip .chip-text {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      #measurementMap .option-link-actions .google-search-link {
        color: #0f766e !important;
        border-color: #99f6e4 !important;
      }
      #measurementMap .amazon-ie-link {
        color: #b45309 !important;
        border-color: #fcd34d !important;
      }
    `;
    document.head.appendChild(style);
  }

  function installDragScroll(scroller) {
    if (!scroller || scroller.dataset.innerMouseScrollInstalled === "1") return;
    scroller.dataset.innerMouseScrollInstalled = "1";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let dragged = false;
    let suppressClickUntil = 0;

    const canScrollX = () => scroller.scrollWidth > scroller.clientWidth + 2;
    const canScrollY = () => scroller.scrollHeight > scroller.clientHeight + 2;
    const reset = () => {
      pointerId = null;
      dragged = false;
      scroller.classList.remove("inner-dragging");
    };

    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      if (event.button !== undefined && event.button !== 0) return;
      if (!canScrollX() && !canScrollY()) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = scroller.scrollLeft;
      startScrollTop = scroller.scrollTop;
      dragged = false;
      scroller.setPointerCapture?.(pointerId);
    }, true);

    scroller.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragged && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      dragged = true;
      scroller.classList.add("inner-dragging");
      if (canScrollX()) scroller.scrollLeft = startScrollLeft - dx;
      if (canScrollY()) scroller.scrollTop = startScrollTop - dy;
      event.preventDefault();
    }, true);

    scroller.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) return;
      if (dragged) suppressClickUntil = Date.now() + 260;
      scroller.releasePointerCapture?.(pointerId);
      reset();
    }, true);

    scroller.addEventListener("pointercancel", reset, true);
    scroller.addEventListener("lostpointercapture", reset, true);

    scroller.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    scroller.addEventListener("wheel", (event) => {
      if (!canScrollX() && !canScrollY()) return;
      const beforeLeft = scroller.scrollLeft;
      const beforeTop = scroller.scrollTop;
      if (canScrollX() && Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        scroller.scrollLeft += event.deltaX;
      } else if (canScrollY()) {
        scroller.scrollTop += event.deltaY;
      } else if (canScrollX()) {
        scroller.scrollLeft += event.deltaY;
      }
      if (scroller.scrollLeft !== beforeLeft || scroller.scrollTop !== beforeTop) event.preventDefault();
    }, { passive: false });
  }

  function setMapStatus(message, error = false) {
    const el = document.getElementById("measurementMapStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b91c1c" : "#647084";
  }

  function readSettings() {
    try { return JSON.parse(localStorage.getItem(SYNC_SETTINGS_KEY) || "{}"); }
    catch { return {}; }
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
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Cache-Control": "no-cache"
    };
  }

  function encodeBase64Unicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function fetchMapMetadata(settings) {
    const url = `${githubFileUrl(settings)}?ref=${encodeURIComponent(settings.branch || "main")}&_=${Date.now()}`;
    const response = await fetch(url, { headers: authHeaders(settings), cache: "no-store" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub metadata fetch failed: ${response.status} ${await response.text()}`);
    const json = await response.json();
    return json?.sha ? json : null;
  }

  function readMapPayload() {
    let map = { items: [] };
    try { map = JSON.parse(localStorage.getItem(MAP_KEY) || "{\"items\":[]}"); }
    catch { map = { items: [] }; }
    return {
      schemaVersion: "measurement-map.v0.1",
      updatedAt: new Date().toISOString(),
      items: Array.isArray(map.items) ? map.items : []
    };
  }

  async function putMap(settings, payload, metadata) {
    const body = {
      message: `Sync measurement map ${payload.updatedAt}`,
      content: encodeBase64Unicode(JSON.stringify(payload, null, 2)),
      branch: settings.branch || "main"
    };
    if (metadata?.sha) body.sha = metadata.sha;

    return fetch(githubFileUrl(settings), {
      method: "PUT",
      headers: { ...authHeaders(settings), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  async function robustPushMap() {
    const settings = readSettings();
    if (!settings.token || !settings.owner || !settings.repo) {
      setMapStatus("Missing GitHub sync settings in Data & Sync.", true);
      return;
    }

    try {
      const path = mapSyncPath(settings);
      setMapStatus(`Pushing measurement map to GitHub (${path})...`);
      const payload = readMapPayload();
      let metadata = await fetchMapMetadata(settings);
      let response = await putMap(settings, payload, metadata);

      if (!response.ok) {
        const firstText = await response.text();
        const needsShaRetry = response.status === 409 || response.status === 422 || /sha/i.test(firstText);
        if (needsShaRetry) {
          setMapStatus("GitHub requested latest file SHA. Refetching and retrying push...");
          metadata = await fetchMapMetadata(settings);
          if (!metadata?.sha) throw new Error(`GitHub push failed: ${response.status} ${firstText}`);
          response = await putMap(settings, payload, metadata);
        } else {
          throw new Error(`GitHub push failed: ${response.status} ${firstText}`);
        }
      }

      if (!response.ok) throw new Error(`GitHub push failed: ${response.status} ${await response.text()}`);
      setMapStatus(`Pushed measurement map to ${path}.`);
    } catch (error) {
      console.error(error);
      setMapStatus(error.message, true);
    }
  }

  function installRobustPushMapOverride() {
    if (window.__measurementMapRobustPushInstalled) return;
    window.__measurementMapRobustPushInstalled = true;
    document.addEventListener("click", (event) => {
      if (event.target?.id !== "pushMapBtn") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      robustPushMap();
    }, true);
  }

  function run() {
    installStyles();
    installRobustPushMapOverride();
    document
      .querySelectorAll("#measurementMap .map-info-tabs, #measurementMap .clean-link-chip-row, #measurementMap .device-options-table, #measurementMap .device-options-list")
      .forEach(installDragScroll);
  }

  function init() {
    run();
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapInnerScrollTimer);
      window.__measurementMapInnerScrollTimer = setTimeout(run, 100);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    [250, 800, 1800, 3500].forEach((delay) => setTimeout(run, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  init();
})();
