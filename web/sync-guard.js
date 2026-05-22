const PUBLIC_SYSTEM_REPO = "longevity-research-system";
const PRIVATE_DATA_REPO = "longevity-private-data";
const SYNC_SETTINGS_STORAGE_KEY = "longevityResearchSystem.syncSettings.v0.1";
const APP_STATE_STORAGE_KEY = "longevityResearchSystem.v0.1";
const SYNC_META_STORAGE_KEY = "longevityResearchSystem.syncMeta.v0.1";
const PLAN_DRAFT_STORAGE_KEY = "longevityResearchSystem.planDraft.v0.1";

let autoPushTimer = null;
let planAutoSaveTimer = null;
let autoPushInFlight = false;

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
      autoPullOnRefresh: stored.autoPullOnRefresh ?? true,
      autoPushAfterChanges: stored.autoPushAfterChanges ?? true
    };
    writeSyncSettingsToStorage(updated);
    if (form.owner) form.owner.value = updated.owner;
    if (form.repo) form.repo.value = updated.repo;
    if (form.branch) form.branch.value = updated.branch;
    if (form.path) form.path.value = updated.path;
  }
}

function installSyncBehaviorControls() {
  const form = document.getElementById("syncSettingsForm");
  if (!form || document.getElementById("autoPullOnRefresh")) return;

  const settings = readSyncSettingsFromStorage();
  const wrapper = document.createElement("div");
  wrapper.className = "full";
  wrapper.innerHTML = `
    <label>Auto pull on refresh
      <select name="autoPullOnRefresh" id="autoPullOnRefresh">
        <option value="yes">Yes, if there are no unsynced local changes</option>
        <option value="no">No, manual pull only</option>
      </select>
    </label>
    <label>Auto push after saved changes
      <select name="autoPushAfterChanges" id="autoPushAfterChanges">
        <option value="yes">Yes, after a short delay</option>
        <option value="no">No, manual push only</option>
      </select>
    </label>
  `;
  const button = form.querySelector("button[type='submit']");
  form.insertBefore(wrapper, button);
  wrapper.querySelector("#autoPullOnRefresh").value = settings.autoPullOnRefresh === false ? "no" : "yes";
  wrapper.querySelector("#autoPushAfterChanges").value = settings.autoPushAfterChanges === false ? "no" : "yes";

  form.addEventListener("submit", () => {
    window.setTimeout(() => {
      const updated = readSyncSettingsFromStorage();
      updated.autoPullOnRefresh = wrapper.querySelector("#autoPullOnRefresh").value === "yes";
      updated.autoPushAfterChanges = wrapper.querySelector("#autoPushAfterChanges").value === "yes";
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

function canAutoPush(settings) {
  return Boolean(
    settings.autoPushAfterChanges !== false &&
    settings.token &&
    settings.owner &&
    settings.repo &&
    settings.branch &&
    settings.path &&
    settings.repo !== PUBLIC_SYSTEM_REPO &&
    typeof pushToGitHub === "function"
  );
}

function scheduleAutoPush(reason = "local change", delayMs = 3500) {
  const settings = readSyncSettingsFromStorage();
  if (!canAutoPush(settings)) return;

  window.clearTimeout(autoPushTimer);
  setStatus(`Auto push scheduled after: ${reason}`);
  autoPushTimer = window.setTimeout(async () => {
    if (autoPushInFlight) {
      scheduleAutoPush("previous push still running", 2500);
      return;
    }

    autoPushInFlight = true;
    try {
      setStatus("Auto pushing latest changes to private GitHub repo...");
      await pushToGitHub();
      markCleanAfterPush();
      localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
      setStatus("Auto push complete. Other devices can pull or auto-pull on refresh.");
    } catch (error) {
      console.error(error);
      setStatus(`Auto push failed: ${error.message}`, true);
    } finally {
      autoPushInFlight = false;
    }
  }, delayMs);
}

function installLocalChangeTracking() {
  const trackedForms = ["dailyForm", "foodForm", "measurementForm", "recipeForm"];
  trackedForms.forEach((id) => {
    document.getElementById(id)?.addEventListener("submit", () => {
      markUnsyncedLocalChange(id);
      scheduleAutoPush(id, 4000);
      window.setTimeout(renderLogManagers, 80);
    }, true);
  });

  document.getElementById("savePlanBtn")?.addEventListener("click", () => {
    localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
    markUnsyncedLocalChange("plan saved locally");
    scheduleAutoPush("plan saved locally", 4000);
  }, true);

  document.getElementById("loadSeedPlanBtn")?.addEventListener("click", () => {
    markUnsyncedLocalChange("seed plan reloaded");
    scheduleAutoPush("seed plan reloaded", 5000);
  }, true);

  document.getElementById("importFile")?.addEventListener("change", () => {
    markUnsyncedLocalChange("json imported");
    scheduleAutoPush("json imported", 5000);
    window.setTimeout(renderLogManagers, 120);
  }, true);
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
      scheduleAutoPush("restored plan draft", 6000);
    }
  }

  editor.addEventListener("input", () => {
    writeJsonToStorage(PLAN_DRAFT_STORAGE_KEY, {
      text: editor.value,
      updatedAt: new Date().toISOString()
    });

    window.clearTimeout(planAutoSaveTimer);
    planAutoSaveTimer = window.setTimeout(() => {
      if (typeof state === "object" && state) {
        state.planMarkdown = editor.value;
      }
      if (typeof saveState === "function") saveState();
      localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
      markUnsyncedLocalChange("plan auto-saved after editing");
      scheduleAutoPush("plan auto-saved after editing", 4500);
    }, 3500);
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
    pullFromGitHub().then(() => {
      markCleanAfterPull();
      window.setTimeout(renderLogManagers, 80);
    });
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
    pullFromGitHub().then(() => {
      markCleanAfterPull();
      window.setTimeout(renderLogManagers, 80);
    });
  }, 1100);
}

function hideGlobalClearButton() {
  const clearButton = document.getElementById("clearBtn");
  if (clearButton) clearButton.style.display = "none";
}

function localParseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function localFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

const LOG_CONFIGS = [
  {
    arrayName: "dailyLogs",
    formId: "dailyForm",
    title: "Saved daily logs",
    buttonText: "Update daily log",
    originalText: "Save daily log",
    buildRecord(data, existing) {
      return {
        ...existing,
        date: data.date,
        weight: localParseNumber(data.weight),
        sleepHours: localParseNumber(data.sleepHours),
        sleepQuality: localParseNumber(data.sleepQuality),
        energy: localParseNumber(data.energy),
        stress: localParseNumber(data.stress),
        steps: localParseNumber(data.steps),
        pain: localParseNumber(data.pain),
        physicalLoad: data.physicalLoad,
        notes: data.notes || "",
        updatedAt: new Date().toISOString()
      };
    },
    summary(item) {
      return `${item.date || "No date"} · sleep ${item.sleepHours ?? "—"}h · weight ${item.weight ?? "—"}kg · energy ${item.energy ?? "—"}`;
    }
  },
  {
    arrayName: "foodLogs",
    formId: "foodForm",
    title: "Saved food entries",
    buttonText: "Update food entry",
    originalText: "Save food entry",
    buildRecord(data, existing) {
      return {
        ...existing,
        day: data.day,
        time: data.time,
        place: data.place,
        description: data.description,
        quantity: data.quantity,
        hungerBefore: localParseNumber(data.hungerBefore),
        energyAfter: localParseNumber(data.energyAfter),
        hungerLater: localParseNumber(data.hungerLater),
        context: data.context || "",
        updatedAt: new Date().toISOString()
      };
    },
    summary(item) {
      return `${item.day || "No day"} ${item.time || ""} · ${item.description || "No description"}`;
    }
  },
  {
    arrayName: "measurements",
    formId: "measurementForm",
    title: "Saved measurements",
    buttonText: "Update measurement",
    originalText: "Save measurement",
    buildRecord(data, existing) {
      return {
        ...existing,
        date: data.date,
        type: data.type,
        value: localParseNumber(data.value),
        unit: data.unit,
        notes: data.notes || "",
        updatedAt: new Date().toISOString()
      };
    },
    summary(item) {
      return `${item.date || "No date"} · ${item.type || "measurement"}: ${item.value ?? "—"} ${item.unit || ""}`;
    }
  },
  {
    arrayName: "recipeExperiments",
    formId: "recipeForm",
    title: "Saved recipe experiments",
    buttonText: "Update recipe experiment",
    originalText: "Save recipe experiment",
    buildRecord(data, existing) {
      return {
        ...existing,
        name: data.name,
        expectedFunction: data.function,
        ingredients: data.ingredients || "",
        protein: localParseNumber(data.protein),
        carbs: localParseNumber(data.carbs),
        fiber: localParseNumber(data.fiber),
        sugar: localParseNumber(data.sugar),
        fat: localParseNumber(data.fat),
        result: data.result || "",
        updatedAt: new Date().toISOString()
      };
    },
    summary(item) {
      return `${item.name || "Unnamed recipe"} · ${item.expectedFunction || "function not set"}`;
    }
  }
];

function ensureLogManagerStyles() {
  if (document.getElementById("logManagerStyles")) return;
  const style = document.createElement("style");
  style.id = "logManagerStyles";
  style.textContent = `
    .log-manager { margin-top: 24px; border-top: 1px solid var(--line); padding-top: 18px; }
    .log-manager-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 12px; }
    .log-manager-head h3 { margin: 0; }
    .log-list { display: grid; gap: 10px; }
    .log-row { border: 1px solid var(--line); border-radius: 16px; padding: 12px; background: #fbfcff; display: grid; gap: 10px; }
    .log-row-main { color: var(--ink); font-weight: 650; overflow-wrap: anywhere; }
    .log-row-meta { color: var(--muted); font-size: 0.86rem; }
    .log-row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .log-row-actions button { padding: 8px 11px; border-radius: 12px; }
    .log-row-actions .delete-log { background: var(--danger-weak); color: var(--danger); }
    .editing-banner { margin: 12px 0; padding: 10px 12px; border-radius: 14px; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; font-weight: 650; }
  `;
  document.head.appendChild(style);
}

function ensureLogManagers() {
  ensureLogManagerStyles();
  LOG_CONFIGS.forEach((config) => {
    const form = document.getElementById(config.formId);
    if (!form || document.getElementById(`${config.formId}Manager`)) return;

    const manager = document.createElement("section");
    manager.id = `${config.formId}Manager`;
    manager.className = "log-manager";
    manager.innerHTML = `
      <div class="log-manager-head">
        <h3>${config.title}</h3>
        <span class="muted" id="${config.formId}CountLabel"></span>
      </div>
      <div class="editing-banner" id="${config.formId}EditingBanner" style="display:none;"></div>
      <div class="log-list" id="${config.formId}List"></div>
    `;
    form.insertAdjacentElement("afterend", manager);
  });
}

function setFormValues(form, item) {
  Object.entries(item).forEach(([key, value]) => {
    const input = form.elements[key];
    if (!input) return;
    input.value = value ?? "";
  });
}

function resetEditingMode(config) {
  const form = document.getElementById(config.formId);
  if (!form) return;
  delete form.dataset.editingId;
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.textContent = config.originalText;
  const banner = document.getElementById(`${config.formId}EditingBanner`);
  if (banner) banner.style.display = "none";
}

function startEditLog(config, itemId) {
  const form = document.getElementById(config.formId);
  const item = (state?.[config.arrayName] || []).find((entry) => entry.id === itemId);
  if (!form || !item) return;
  form.dataset.editingId = itemId;
  setFormValues(form, item);
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.textContent = config.buttonText;
  const banner = document.getElementById(`${config.formId}EditingBanner`);
  if (banner) {
    banner.textContent = "Editing an existing entry. Press update to save changes.";
    banner.style.display = "block";
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteLog(config, itemId) {
  const item = (state?.[config.arrayName] || []).find((entry) => entry.id === itemId);
  if (!item) return;
  const ok = confirm("Delete this single log entry? This will not clear other data.");
  if (!ok) return;
  state[config.arrayName] = state[config.arrayName].filter((entry) => entry.id !== itemId);
  saveState();
  markUnsyncedLocalChange(`deleted ${config.arrayName}`);
  scheduleAutoPush(`deleted ${config.arrayName}`, 3000);
  renderLogManagers();
}

function installEditSubmitHandlers() {
  LOG_CONFIGS.forEach((config) => {
    const form = document.getElementById(config.formId);
    if (!form || form.dataset.editHandlerInstalled === "true") return;
    form.dataset.editHandlerInstalled = "true";

    form.addEventListener("submit", (event) => {
      const editingId = form.dataset.editingId;
      if (!editingId) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const data = localFormData(form);
      const list = state?.[config.arrayName] || [];
      const index = list.findIndex((entry) => entry.id === editingId);
      if (index < 0) return;

      list[index] = config.buildRecord(data, list[index]);
      state[config.arrayName] = list;
      saveState();
      form.reset();
      const todayInput = form.querySelector('input[type="date"]');
      if (todayInput) todayInput.value = new Date().toISOString().slice(0, 10);
      resetEditingMode(config);
      markUnsyncedLocalChange(`edited ${config.arrayName}`);
      scheduleAutoPush(`edited ${config.arrayName}`, 3000);
      renderLogManagers();
    }, true);
  });
}

function renderLogManagers() {
  ensureLogManagers();
  LOG_CONFIGS.forEach((config) => {
    const listEl = document.getElementById(`${config.formId}List`);
    const countEl = document.getElementById(`${config.formId}CountLabel`);
    if (!listEl) return;
    const list = [...(state?.[config.arrayName] || [])].reverse();
    if (countEl) countEl.textContent = `${list.length} saved`;
    if (!list.length) {
      listEl.innerHTML = `<p class="muted">No saved entries yet.</p>`;
      return;
    }
    listEl.innerHTML = list.map((item) => `
      <article class="log-row" data-id="${item.id}">
        <div>
          <div class="log-row-main">${escapeHtmlForLog(config.summary(item))}</div>
          <div class="log-row-meta">Created: ${escapeHtmlForLog(item.createdAt || "unknown")}${item.updatedAt ? ` · Updated: ${escapeHtmlForLog(item.updatedAt)}` : ""}</div>
        </div>
        <div class="log-row-actions">
          <button type="button" class="edit-log">Edit</button>
          <button type="button" class="delete-log">Delete</button>
        </div>
      </article>
    `).join("");

    listEl.querySelectorAll(".edit-log").forEach((button) => {
      button.addEventListener("click", () => startEditLog(config, button.closest(".log-row")?.dataset.id));
    });
    listEl.querySelectorAll(".delete-log").forEach((button) => {
      button.addEventListener("click", () => deleteLog(config, button.closest(".log-row")?.dataset.id));
    });
  });
}

function escapeHtmlForLog(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function installPerLogManager() {
  hideGlobalClearButton();
  ensureLogManagers();
  installEditSubmitHandlers();
  renderLogManagers();
}

window.addEventListener("DOMContentLoaded", () => {
  applyPrivateDataDefaults();
  installSyncBehaviorControls();
  installPublicRepoPushGuard();
  installLocalChangeTracking();
  installPlanDraftProtection();
  installSafeManualPullGuard();
  installPushCleanMarker();
  installPerLogManager();
  installAutoPullOnRefresh();
});
