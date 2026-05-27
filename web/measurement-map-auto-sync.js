(() => {
  const PUBLIC_SYSTEM_REPO = "longevity-research-system";
  const SYNC_SETTINGS_KEY = "longevityResearchSystem.syncSettings.v0.1";
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const MAP_META_KEY = "longevityResearchSystem.measurementMap.syncMeta.v0.1";

  let applyingRemote = false;
  let autoPushTimer = null;
  let pushInFlight = false;
  let pullInFlight = false;
  let lastSeenMapRaw = localStorage.getItem(MAP_KEY) || "";

  function readJson(key, fallback = {}) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function settings() { return readJson(SYNC_SETTINGS_KEY, {}); }
  function meta() {
    return readJson(MAP_META_KEY, {
      hasUnsyncedMapChanges: false,
      localChangedAt: null,
      lastSuccessfulMapPushAt: null,
      lastSuccessfulMapPullAt: null,
      lastMapSyncError: null
    });
  }
  function writeMeta(next) { writeJson(MAP_META_KEY, next); }
  function mapSyncPath(s = settings()) {
    const base = s.path || "sync/personal-sync.json";
    return base.includes("/") ? base.replace(/[^/]+$/, "measurement-map.json") : "measurement-map.json";
  }
  function validSettings(s = settings()) {
    return Boolean(s.token && s.owner && s.repo && s.branch && s.repo !== PUBLIC_SYSTEM_REPO);
  }
  function githubFileUrl(s = settings()) {
    const path = mapSyncPath(s).split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}/contents/${path}`;
  }
  function authHeaders(s = settings()) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${s.token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }
  function encodeBase64Unicode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function decodeBase64Unicode(str) { return decodeURIComponent(escape(atob(String(str || "").replace(/\n/g, "")))); }
  function mapIsActive() { return document.getElementById("measurementMap")?.classList.contains("active"); }
  function statusEl() { return document.getElementById("measurementMapStatus"); }
  function setMapStatus(message, isError = false) {
    const el = statusEl();
    if (!el || !mapIsActive()) return;
    el.textContent = message;
    el.style.color = isError ? "#b91c1c" : "#647084";
  }
  function quietNoSettingsStatus() {
    const el = statusEl();
    if (!el || !mapIsActive()) return;
    if (/auto-sync|github sync settings|pull map|push map/i.test(el.textContent || "")) {
      el.textContent = "Measurement Map loaded locally. Add Data & Sync settings only if you want private GitHub sync on this device.";
      el.style.color = "#647084";
    }
  }
  function markUnsynced(reason = "Measurement Map change") {
    const current = meta();
    writeMeta({ ...current, hasUnsyncedMapChanges: true, localChangedAt: new Date().toISOString(), lastLocalMapChangeReason: reason, lastMapSyncError: null });
  }
  function markPushed() {
    const current = meta();
    writeMeta({ ...current, hasUnsyncedMapChanges: false, lastSuccessfulMapPushAt: new Date().toISOString(), lastLocalMapChangeReason: null, lastMapSyncError: null });
  }
  function markPulled() {
    const current = meta();
    writeMeta({ ...current, hasUnsyncedMapChanges: false, lastSuccessfulMapPullAt: new Date().toISOString(), lastLocalMapChangeReason: null, lastMapSyncError: null });
  }
  async function fetchRemoteFile(s = settings()) {
    const response = await fetch(`${githubFileUrl(s)}?ref=${encodeURIComponent(s.branch || "main")}`, { headers: authHeaders(s) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Measurement Map sync fetch failed: ${response.status}`);
    return response.json();
  }
  function currentMapPayload() {
    const raw = localStorage.getItem(MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : { items: [], updatedAt: new Date().toISOString() };
    return { schemaVersion: "measurement-map.v0.1", updatedAt: new Date().toISOString(), items: Array.isArray(parsed.items) ? parsed.items : [] };
  }
  async function pushMapAuto({ retry = true } = {}) {
    const s = settings();
    if (!validSettings(s)) { quietNoSettingsStatus(); return; }
    if (pushInFlight) return;
    pushInFlight = true;
    try {
      setMapStatus("Uploading Measurement Map automatically...");
      const remote = await fetchRemoteFile(s);
      const payload = currentMapPayload();
      const body = { message: `Auto-sync measurement map ${payload.updatedAt}`, content: encodeBase64Unicode(JSON.stringify(payload, null, 2)), branch: s.branch || "main" };
      if (remote?.sha) body.sha = remote.sha;
      const response = await fetch(githubFileUrl(s), { method: "PUT", headers: { ...authHeaders(s), "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) {
        const text = await response.text();
        if (response.status === 409 && retry) { pushInFlight = false; return pushMapAuto({ retry: false }); }
        throw new Error(`Measurement Map automatic upload failed: ${response.status} ${text}`);
      }
      markPushed();
      setMapStatus("Measurement Map uploaded automatically.");
    } catch (error) {
      console.error(error);
      const current = meta();
      writeMeta({ ...current, lastMapSyncError: error.message });
      setMapStatus(error.message, true);
    } finally {
      pushInFlight = false;
    }
  }
  function scheduleAutoPush(reason = "Measurement Map change", delayMs = 3500) {
    if (applyingRemote) return;
    markUnsynced(reason);
    const s = settings();
    if (!validSettings(s)) { quietNoSettingsStatus(); return; }
    clearTimeout(autoPushTimer);
    setMapStatus("Measurement Map saved locally. Automatic upload scheduled...");
    autoPushTimer = setTimeout(() => pushMapAuto(), delayMs);
  }
  async function pullMapAuto({ force = false } = {}) {
    const s = settings();
    if (!validSettings(s) || pullInFlight) { quietNoSettingsStatus(); return; }
    const currentMeta = meta();
    if (!force && currentMeta.hasUnsyncedMapChanges) {
      setMapStatus("Measurement Map has local changes waiting to upload.", true);
      return;
    }
    pullInFlight = true;
    try {
      setMapStatus("Checking latest Measurement Map automatically...");
      const remote = await fetchRemoteFile(s);
      if (!remote?.content) { setMapStatus("No remote Measurement Map yet. It will be created on the next upload."); return; }
      const payload = JSON.parse(decodeBase64Unicode(remote.content));
      if (!Array.isArray(payload.items)) throw new Error("Remote Measurement Map file is missing items[].");
      const next = { items: payload.items, updatedAt: payload.updatedAt || new Date().toISOString() };
      const nextRaw = JSON.stringify(next);
      const currentRaw = localStorage.getItem(MAP_KEY) || "";
      if (nextRaw !== currentRaw) {
        applyingRemote = true;
        localStorage.setItem(MAP_KEY, nextRaw);
        lastSeenMapRaw = nextRaw;
        applyingRemote = false;
        markPulled();
        window.dispatchEvent(new CustomEvent("measurementMapAutoPulled"));
        window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
        window.dispatchEvent(new CustomEvent("measurementMapTabsRebuilt"));
        setMapStatus("Measurement Map updated automatically.");
      } else {
        markPulled();
        setMapStatus("Measurement Map already up to date.");
      }
    } catch (error) {
      applyingRemote = false;
      console.error(error);
      const current = meta();
      writeMeta({ ...current, lastMapSyncError: error.message });
      setMapStatus(error.message, true);
    } finally {
      applyingRemote = false;
      pullInFlight = false;
    }
  }
  function patchLocalStorage() {
    if (window.__measurementMapAutoSyncStoragePatched) return;
    window.__measurementMapAutoSyncStoragePatched = true;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedMeasurementMapSetItem(key, value) {
      const before = key === MAP_KEY ? (this.getItem(MAP_KEY) || "") : "";
      const result = originalSetItem.apply(this, arguments);
      if (key === MAP_KEY && !applyingRemote) {
        const after = String(value || "");
        if (after && after !== before && after !== lastSeenMapRaw) {
          lastSeenMapRaw = after;
          window.dispatchEvent(new CustomEvent("measurementMapLocalChanged"));
          scheduleAutoPush("Measurement Map changed", 3500);
        }
      }
      return result;
    };
  }
  function cleanVisibleSyncControls() {
    document.querySelectorAll("#measurementMap .map-auto-sync-note, #measurementMap #pullMapBtn, #measurementMap #pushMapBtn, #measurementMap #quickPullMapBtn").forEach((el) => el.remove());
  }
  function onMeasurementMapOpen() {
    cleanVisibleSyncControls();
    const currentMeta = meta();
    if (currentMeta.hasUnsyncedMapChanges) scheduleAutoPush("pending Measurement Map changes", 1500);
    else pullMapAuto();
  }
  function init() {
    patchLocalStorage();
    cleanVisibleSyncControls();
    document.addEventListener("click", (event) => {
      if (event.target.closest?.(".tab[data-tab='measurementMap']")) setTimeout(onMeasurementMapOpen, 120);
    }, true);
    window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(cleanVisibleSyncControls, 80));
    window.addEventListener("measurementMapEnhancementsLoaded", () => setTimeout(cleanVisibleSyncControls, 80));
    if (mapIsActive()) setTimeout(onMeasurementMapOpen, 350);
  }
  window.LRS_MEASUREMENT_MAP_AUTO_SYNC = { pull: pullMapAuto, push: pushMapAuto, schedule: scheduleAutoPush };
  document.addEventListener("DOMContentLoaded", init, { once: true });
  init();
})();