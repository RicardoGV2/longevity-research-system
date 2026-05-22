const PUBLIC_SYSTEM_REPO = "longevity-research-system";
const PRIVATE_DATA_REPO = "longevity-private-data";
const SYNC_SETTINGS_STORAGE_KEY = "longevityResearchSystem.syncSettings.v0.1";

function readSyncSettingsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_SETTINGS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSyncSettingsToStorage(settings) {
  localStorage.setItem(SYNC_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
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
      path: stored.path || "sync/personal-sync.json"
    };
    writeSyncSettingsToStorage(updated);
    if (form.owner) form.owner.value = updated.owner;
    if (form.repo) form.repo.value = updated.repo;
    if (form.branch) form.branch.value = updated.branch;
    if (form.path) form.path.value = updated.path;
  }
}

function showPublicRepoWarning() {
  const status = document.getElementById("syncStatus");
  if (!status) return;
  status.textContent = "Safety guard active: do not sync personal health data to the public system repo. Use longevity-private-data instead.";
  status.style.color = "#b91c1c";
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
      alert("Blocked: this would push personal sync data into the public website repository. Create/use a private repo named longevity-private-data and sync there instead.");
    }
  }, true);
}

window.addEventListener("DOMContentLoaded", () => {
  applyPrivateDataDefaults();
  installPublicRepoPushGuard();
});
