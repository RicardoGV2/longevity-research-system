(() => {
  const APP_KEY = "longevityResearchSystem.v0.1";
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";
  const PLAN_DRAFT_KEY = "longevityResearchSystem.planDraft.v0.1";
  const SYNC_SETTINGS_KEY = "longevityResearchSystem.syncSettings.v0.1";
  const BACKUP_INDEX_KEY = "longevityResearchSystem.backups.index.v0.1";
  const LAST_AUTO_KEY = "longevityResearchSystem.backups.lastAuto.v0.1";

  const MAX_LOCAL_BACKUPS = 25;
  const AUTO_INTERVAL_MS = 5 * 60 * 1000;
  const AUTO_MIN_GAP_MS = 4 * 60 * 1000;

  let lastSnapshotHash = "";
  let backupTimer = null;

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(raw, fallback = null) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  function readLocalJson(key) {
    return safeJsonParse(localStorage.getItem(key), null);
  }

  function syncSettingsRedacted() {
    const settings = readLocalJson(SYNC_SETTINGS_KEY, {}) || {};
    const { token, ...safe } = settings;
    return {
      ...safe,
      hasTokenLocally: Boolean(token),
      tokenStoredInBackup: false
    };
  }

  function collectRawKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("longevityResearchSystem.")) keys.push(key);
    }
    return keys.sort();
  }

  function createSnapshot(reason = "manual") {
    const appState = readLocalJson(APP_KEY, null);
    const measurementMap = readLocalJson(MAP_KEY, null);
    const planDraft = readLocalJson(PLAN_DRAFT_KEY, null);

    return {
      schemaVersion: "longevity-backup.v0.1",
      createdAt: nowIso(),
      reason,
      app: {
        storageKey: APP_KEY,
        data: appState,
        planMarkdown: appState?.planMarkdown || ""
      },
      planDraft: {
        storageKey: PLAN_DRAFT_KEY,
        data: planDraft
      },
      measurementMap: {
        storageKey: MAP_KEY,
        data: measurementMap
      },
      syncSettings: {
        storageKey: SYNC_SETTINGS_KEY,
        data: syncSettingsRedacted()
      },
      localStorageKeysSeen: collectRawKeys()
    };
  }

  function snapshotHash(snapshot) {
    const clone = JSON.parse(JSON.stringify(snapshot));
    clone.createdAt = "";
    clone.reason = "";
    return JSON.stringify(clone);
  }

  function backupStorageKey(id) {
    return `longevityResearchSystem.backups.item.${id}`;
  }

  function readIndex() {
    return safeJsonParse(localStorage.getItem(BACKUP_INDEX_KEY), []) || [];
  }

  function writeIndex(index) {
    localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(index));
  }

  function pruneBackups(index) {
    const keep = index.slice(0, MAX_LOCAL_BACKUPS);
    const remove = index.slice(MAX_LOCAL_BACKUPS);
    remove.forEach((entry) => localStorage.removeItem(backupStorageKey(entry.id)));
    return keep;
  }

  function saveLocalBackup(reason = "manual", { force = false } = {}) {
    const snapshot = createSnapshot(reason);
    const hash = snapshotHash(snapshot);
    const lastAuto = Number(localStorage.getItem(LAST_AUTO_KEY) || 0);
    const now = Date.now();

    if (!force && hash === lastSnapshotHash) return null;
    if (!force && reason === "auto" && now - lastAuto < AUTO_MIN_GAP_MS) return null;

    const id = snapshot.createdAt.replace(/[:.]/g, "-");
    const entry = {
      id,
      createdAt: snapshot.createdAt,
      reason,
      appUpdatedAt: snapshot.app?.data?.updatedAt || "",
      hasPlan: Boolean(snapshot.app?.planMarkdown),
      hasMeasurementMap: Boolean(snapshot.measurementMap?.data),
      sizeBytes: new Blob([JSON.stringify(snapshot)]).size
    };

    try {
      localStorage.setItem(backupStorageKey(id), JSON.stringify(snapshot));
      const index = pruneBackups([entry, ...readIndex().filter((x) => x.id !== id)]);
      writeIndex(index);
      lastSnapshotHash = hash;
      if (reason === "auto") localStorage.setItem(LAST_AUTO_KEY, String(now));
      renderBackupPanel();
      return entry;
    } catch (error) {
      setBackupStatus("Could not save backup locally. Browser storage may be full, probably because of large photos. Export or push a backup, then reduce stored photos.", true);
      console.error(error);
      return null;
    }
  }

  function latestBackup() {
    const entry = readIndex()[0];
    if (!entry) return null;
    return safeJsonParse(localStorage.getItem(backupStorageKey(entry.id)), null);
  }

  function downloadText(filename, text, mime = "application/json") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadLatestBackup() {
    const backup = latestBackup() || createSnapshot("download-without-saved-backup");
    const stamp = (backup.createdAt || nowIso()).replace(/[:.]/g, "-");
    downloadText(`longevity-backup-${stamp}.json`, JSON.stringify(backup, null, 2));
    setBackupStatus("Downloaded latest backup.");
  }

  function restoreBackupObject(backup) {
    if (!backup || backup.schemaVersion !== "longevity-backup.v0.1") {
      setBackupStatus("Invalid backup file.", true);
      return;
    }

    saveLocalBackup("before-restore", { force: true });

    if (backup.app?.data) localStorage.setItem(APP_KEY, JSON.stringify(backup.app.data));
    if (backup.measurementMap?.data) localStorage.setItem(MAP_KEY, JSON.stringify(backup.measurementMap.data));
    if (backup.planDraft?.data) localStorage.setItem(PLAN_DRAFT_KEY, JSON.stringify(backup.planDraft.data));

    setBackupStatus("Backup restored locally. Reloading...");
    setTimeout(() => window.location.reload(), 500);
  }

  function restoreLatestBackup() {
    const backup = latestBackup();
    if (!backup) return setBackupStatus("No local backups available yet.", true);
    if (!confirm("Restore the latest local backup? A safety backup of the current state will be created first.")) return;
    restoreBackupObject(backup);
  }

  function importBackupFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const backup = safeJsonParse(String(reader.result || ""), null);
      if (!backup) return setBackupStatus("Could not read backup file.", true);
      if (!confirm("Restore this backup file? A safety backup of the current state will be created first.")) return;
      restoreBackupObject(backup);
    };
    reader.onerror = () => setBackupStatus("Could not read backup file.", true);
    reader.readAsText(file);
  }

  function getSyncSettings() {
    return readLocalJson(SYNC_SETTINGS_KEY, {}) || {};
  }

  function backupGitHubPath(settings, backup) {
    const basePath = settings.path || "sync/personal-sync.json";
    const folder = basePath.includes("/") ? basePath.replace(/\/[^/]*$/, "/backups") : "backups";
    const stamp = (backup.createdAt || nowIso()).replace(/[:.]/g, "-");
    return `${folder}/longevity-backup-${stamp}.json`;
  }

  function encodeBase64Unicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function authHeaders(settings) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  async function pushBackupToGitHub(reason = "manual-github-backup") {
    const settings = getSyncSettings();
    if (!settings.token || !settings.owner || !settings.repo) {
      setBackupStatus("Missing GitHub sync settings. Save token, owner and private data repo in Data & Sync first.", true);
      return;
    }

    const entry = saveLocalBackup(reason, { force: true });
    const backup = latestBackup();
    if (!backup) return setBackupStatus("Could not create backup before pushing.", true);

    const path = backupGitHubPath(settings, backup);
    const apiPath = path.split("/").map(encodeURIComponent).join("/");
    const url = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${apiPath}`;

    try {
      setBackupStatus("Pushing timestamped backup to private GitHub repo...");
      const body = {
        message: `Backup longevity data ${backup.createdAt}`,
        content: encodeBase64Unicode(JSON.stringify(backup, null, 2)),
        branch: settings.branch || "main"
      };
      const response = await fetch(url, {
        method: "PUT",
        headers: { ...authHeaders(settings), "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`GitHub backup failed: ${response.status} ${await response.text()}`);
      setBackupStatus(`Backup pushed to ${path}.`);
      return entry;
    } catch (error) {
      console.error(error);
      setBackupStatus(error.message, true);
    }
  }

  function ensureBackupPanel() {
    if (document.getElementById("backupManagerPanel")) return;
    const dataPanel = document.getElementById("data");
    if (!dataPanel) return;

    const panel = document.createElement("section");
    panel.id = "backupManagerPanel";
    panel.className = "sync-box";
    panel.innerHTML = `
      <h3>Automatic backups</h3>
      <p class="muted">Creates rolling local backups of the main JSON, plan Markdown, plan draft and Measurement Map. GitHub backups go to the private data repo and never include your token.</p>
      <div class="inline-actions sync-actions">
        <button id="createBackupBtn" type="button">Create backup now</button>
        <button id="downloadBackupBtn" class="secondary-dark" type="button">Download latest backup</button>
        <button id="pushBackupGithubBtn" type="button">Push backup to GitHub</button>
        <label class="secondary-dark file-label">Restore from file<input id="restoreBackupFile" type="file" accept="application/json" hidden /></label>
        <button id="restoreLatestBackupBtn" class="secondary-dark" type="button">Restore latest local</button>
      </div>
      <p id="backupStatus" class="sync-status">Backups ready.</p>
      <div id="backupList" class="backup-list"></div>
    `;

    const raw = dataPanel.querySelector("#rawData")?.parentElement || dataPanel;
    dataPanel.insertBefore(panel, raw);
  }

  function ensureStyles() {
    if (document.getElementById("backupManagerStyles")) return;
    const style = document.createElement("style");
    style.id = "backupManagerStyles";
    style.textContent = `
      .backup-list { display: grid; gap: 8px; margin-top: 12px; }
      .backup-entry { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fbfcff; }
      .backup-entry strong { display: block; color: var(--ink); }
      .backup-entry span { display: block; color: var(--muted); font-size: 0.82rem; }
      .backup-entry button { padding: 7px 10px; border-radius: 10px; }
      @media (max-width: 560px) { .backup-entry { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function setBackupStatus(message, error = false) {
    const el = document.getElementById("backupStatus");
    if (!el) return;
    el.textContent = message;
    el.style.color = error ? "#b91c1c" : "#647084";
  }

  function renderBackupPanel() {
    ensureBackupPanel();
    ensureStyles();
    const list = document.getElementById("backupList");
    if (!list) return;
    const index = readIndex();
    if (!index.length) {
      list.innerHTML = `<div class="backup-entry"><div><strong>No backups yet</strong><span>A backup will be created automatically after data changes.</span></div></div>`;
      return;
    }
    list.innerHTML = index.slice(0, 5).map((entry) => `
      <div class="backup-entry" data-backup-id="${entry.id}">
        <div><strong>${entry.createdAt}</strong><span>${entry.reason} · ${Math.round((entry.sizeBytes || 0) / 1024)} KB · plan: ${entry.hasPlan ? "yes" : "no"} · map: ${entry.hasMeasurementMap ? "yes" : "no"}</span></div>
        <button type="button" class="secondary-dark" data-backup-download="${entry.id}">Download</button>
      </div>
    `).join("");
  }

  function downloadBackupById(id) {
    const backup = safeJsonParse(localStorage.getItem(backupStorageKey(id)), null);
    if (!backup) return setBackupStatus("Backup not found.", true);
    downloadText(`longevity-backup-${id}.json`, JSON.stringify(backup, null, 2));
  }

  function setupEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (target?.id === "createBackupBtn") {
        const entry = saveLocalBackup("manual", { force: true });
        setBackupStatus(entry ? `Backup created: ${entry.createdAt}` : "No backup created.");
      }
      if (target?.id === "downloadBackupBtn") downloadLatestBackup();
      if (target?.id === "restoreLatestBackupBtn") restoreLatestBackup();
      if (target?.id === "pushBackupGithubBtn") pushBackupToGitHub("manual-github-backup");
      if (target?.dataset?.backupDownload) downloadBackupById(target.dataset.backupDownload);

      if (["savePlanBtn", "pushGithubBtn", "pullGithubBtn", "pushMapBtn", "pullMapBtn", "loadSeedPlanBtn"].includes(target?.id)) {
        saveLocalBackup(`before-${target.id}`, { force: true });
      }
    }, true);

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target?.id === "restoreBackupFile") importBackupFile(target.files?.[0]);
      if (target?.id === "importFile") saveLocalBackup("before-import", { force: true });
    }, true);
  }

  function scheduleAutoBackups() {
    clearInterval(backupTimer);
    backupTimer = setInterval(() => saveLocalBackup("auto"), AUTO_INTERVAL_MS);
    setTimeout(() => saveLocalBackup("startup", { force: false }), 1500);
  }

  function install() {
    ensureBackupPanel();
    ensureStyles();
    renderBackupPanel();
    setupEvents();
    scheduleAutoBackups();
  }

  window.longevityBackups = {
    create: () => saveLocalBackup("console-manual", { force: true }),
    downloadLatest: downloadLatestBackup,
    pushToGitHub: () => pushBackupToGitHub("console-github-backup"),
    list: readIndex
  };

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 1200));
})();
