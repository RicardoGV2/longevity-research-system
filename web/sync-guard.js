const PUBLIC_SYSTEM_REPO = "longevity-research-system";
const PRIVATE_DATA_REPO = "longevity-private-data";
const SYNC_SETTINGS_STORAGE_KEY = "longevityResearchSystem.syncSettings.v0.1";
const APP_STATE_STORAGE_KEY = "longevityResearchSystem.v0.1";
const SYNC_META_STORAGE_KEY = "longevityResearchSystem.syncMeta.v0.1";
const PLAN_DRAFT_STORAGE_KEY = "longevityResearchSystem.planDraft.v0.1";

function readJsonFromStorage(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJsonToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readSyncSettingsFromStorage() {
  return readJsonFromStorage(SYNC_SETTINGS_STORAGE_KEY, {});
}

function writeSyncSettingsToStorage(settings) {
  writeJsonToStorage(SYNC_SETTINGS_STORAGE_KEY, settings);
}

function readSyncMeta() {
  return readJsonFromStorage(SYNC_META_STORAGE_KEY, {
    hasUnsyncedLocalChanges: false,
    localChangedAt: null,
    lastSuccessfulPushAt: null,
    lastSuccessfulPullAt: null,
    lastBackupAt: null
  });
}

function writeSyncMeta(meta) {
  writeJsonToStorage(SYNC_META_STORAGE_KEY, meta);
}

function markUnsyncedLocalChange(reason = "local change") {
  const meta = readSyncMeta();
  writeSyncMeta({
    ...meta,
    hasUnsyncedLocalChanges: true,
    localChangedAt: new Date().toISOString(),
    lastLocalChangeReason: reason
  });
}

function markCleanAfterPush() {
  const meta = readSyncMeta();
  writeSyncMeta({
    ...meta,
    hasUnsyncedLocalChanges: false,
    lastSuccessfulPushAt: new Date().toISOString(),
    lastLocalChangeReason: null
  });
}

function markCleanAfterPull() {
  const meta = readSyncMeta();
  writeSyncMeta({
    ...meta,
    hasUnsyncedLocalChanges: false,
    lastSuccessfulPullAt: new Date().toISOString(),
    lastLocalChangeReason: null
  });
}

function setStatus(message, isError = false) {
  const status = document.getElementById("syncStatus");
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#b91c1c" : "#647084";
}

function createLocalBackup(reason = "before pull") {
  const appState = localStorage.getItem(APP_STATE_STORAGE_KEY);
  if (!appState) return;
  const timestamp = new Date().toISOString();
  const backupKey = `longevityResearchSystem.backup.${timestamp}`;
  localStorage.setItem(backupKey, JSON.stringify({
    reason,
    createdAt: timestamp,
    appState: JSON.parse(appState)
  }));
  const meta = readSyncMeta();
  writeSyncMeta({ ...meta, lastBackupAt: timestamp, lastBackupKey: backupKey });
}

function applyPrivateDataDefaults() {
  const form = document.getElementById("syncSettingsForm");
  if (!form) return;

  const stored = readSyncSettingsFromStorage();
  const hasSavedSettings = Boolean(stored.owner || stored.repo || stored.path);

  if (!hasSavedSettings || stored.repo === PUBLIC_SYSTEM_REPO) {
    const updated = {
      token: stored.token || "",
      owner: stored.owner || "RicardoGV2",
      repo: PRIVATE_DATA_REPO,
      branch: stored.branch || "main",
      path: stored.path || "sync/personal-sync.json",
      autoPullOnRefresh: stored.autoPullOnRefresh ?? true
    };
    writeSyncSettingsToStorage(updated);
    if (form.owner) form.owner.value = updated.owner;
    if (form.repo) form.repo.value = updated.repo;
    if (form.branch) form.branch.value = updated.branch;
    if (form.path) form.path.value = updated.path;
  }
}

function installAutoPullCheckbox() {
  const form = document.getElementById("syncSettingsForm");
  if (!form || document.getElementById("autoPullOnRefresh")) return;

  const settings = readSyncSettingsFromStorage();
  const label = document.createElement("label");
  label.className = "full";
  label.innerHTML = `Auto pull on refresh <select name="autoPullOnRefresh" id="autoPullOnRefresh"><option value="yes">Yes, if there are no unsynced local changes</option><option value="no">No, manual pull only</option></select>`;
  const button = form.querySelector("button[type='submit']");
  form.insertBefore(label, button);
  label.querySelector("select").value = settings.autoPullOnRefresh === false ? "no" : "yes";

  form.addEventListener("submit", () => {
    window.setTimeout(() => {
      const updated = readSyncSettingsFromStorage();
      updated.autoPullOnRefresh = label.querySelector("select").value === "yes";
      writeSyncSettingsToStorage(updated);
    }, 0);
  });
}

function showPublicRepoWarning() {
  setStatus("Safety guard active: do not sync personal health data to the public system repo. Use longevity-private-data instead.", true);
}

function installPublicRepoPushGuard() {
  const pushButton = document.getElementById("pushGithubBtn");
  const form = document.getElementById("syncSettingsForm");
  if (!pushButton || !form) return;

  pushButton.addEventListener("click", (event) => {
    const repo = (form.repo?.value || "").trim();
    const path = (form.path?.value || "").trim();
    const unsafePublicSync = repo === PUBLIC_SYSTEM_REPO && path.includes("sync/");

    if (unsafePublicSync) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showPublicRepoWarning();
      alert("Blocked: this would push personal sync data into the public website repository. Use a private repo named longevity-private-data and sync there instead.");
    }
  }, true);
}

function installLocalChangeTracking() {
  const trackedForms = ["dailyForm", "foodForm", "measurementForm", "recipeForm"];
  trackedForms.forEach((id) => {
    document.getElementById(id)?.addEventListener("submit", () => markUnsyncedLocalChange(id), true);
  });

  document.getElementById("savePlanBtn")?.addEventListener("click", () => {
    localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
    markUnsyncedLocalChange("plan saved locally");
  }, true);

  document.getElementById("loadSeedPlanBtn")?.addEventListener("click", () => markUnsyncedLocalChange("seed plan reloaded"), true);
  document.getElementById("clearBtn")?.addEventListener("click", () => markUnsyncedLocalChange("local data cleared"), true);
  document.getElementById("importFile")?.addEventListener("change", () => markUnsyncedLocalChange("json imported"), true);
}

function installPlanDraftProtection() {
  const editor = document.getElementById("planEditor");
  if (!editor) return;

  const draft = readJsonFromStorage(PLAN_DRAFT_STORAGE_KEY, null);
  if (draft?.text && draft.text !== editor.value) {
    const restore = confirm("There is an unsaved plan draft on this device. Restore it?");
    if (restore) {
      editor.value = draft.text;
      editor.dispatchEvent(new Event("input"));
      markUnsyncedLocalChange("unsaved plan draft restored");
    }
  }

  editor.addEventListener("input", () => {
    writeJsonToStorage(PLAN_DRAFT_STORAGE_KEY, {
      text: editor.value,
      updatedAt: new Date().toISOString()
    });
  });

  window.addEventListener("beforeunload", (event) => {
    const draftNow = readJsonFromStorage(PLAN_DRAFT_STORAGE_KEY, null);
    if (draftNow?.text) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

function installSafeManualPullGuard() {
  const pullButton = document.getElementById("pullGithubBtn");
  if (!pullButton) return;

  pullButton.addEventListener("click", (event) => {
    const meta = readSyncMeta();
    if (!meta.hasUnsyncedLocalChanges) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const ok = confirm("This device has local changes that have not been pushed. Pulling will replace local data with the GitHub version. A local backup will be created first. Continue?");
    if (!ok) {
      setStatus("Pull cancelled. Push local changes first if you want to keep them.", true);
      return;
    }

    createLocalBackup("manual pull with unsynced local changes");
    pullFromGitHub().then(() => markCleanAfterPull());
  }, true);
}

function installPushCleanMarker() {
  const pushButton = document.getElementById("pushGithubBtn");
  if (!pushButton) return;

  pushButton.addEventListener("click", () => {
    window.setTimeout(() => {
      const status = document.getElementById("syncStatus")?.textContent || "";
      if (status.startsWith("Pushed to GitHub")) {
        localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
        markCleanAfterPush();
      }
    }, 2500);
  }, false);
}

function canAutoPull(settings) {
  const meta = readSyncMeta();
  return Boolean(
    settings.autoPullOnRefresh !== false &&
    settings.token &&
    settings.owner &&
    settings.repo &&
    settings.branch &&
    settings.path &&
    settings.repo !== PUBLIC_SYSTEM_REPO &&
    !meta.hasUnsyncedLocalChanges
  );
}

function installAutoPullOnRefresh() {
  window.setTimeout(() => {
    const settings = readSyncSettingsFromStorage();
    const meta = readSyncMeta();

    if (settings.autoPullOnRefresh === false) {
      setStatus("Auto pull is off. Use Pull from GitHub when needed.");
      return;
    }

    if (meta.hasUnsyncedLocalChanges) {
      setStatus("Auto pull skipped: this device has unsynced local changes. Push them or manually pull with backup.", true);
      return;
    }

    if (!canAutoPull(settings)) return;

    createLocalBackup("automatic pull on refresh");
    setStatus("Auto pull: checking latest private data from GitHub...");
    pullFromGitHub().then(() => markCleanAfterPull());
  }, 1100);
}

window.addEventListener("DOMContentLoaded", () => {
  applyPrivateDataDefaults();
  installAutoPullCheckbox();
  installPublicRepoPushGuard();
  installLocalChangeTracking();
  installPlanDraftProtection();
  installSafeManualPullGuard();
  installPushCleanMarker();
  installAutoPullOnRefresh();
});
