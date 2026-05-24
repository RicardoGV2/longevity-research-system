(() => {
  const PLAN_BACKUP_KEY = "longevityResearchSystem.planBeforeRestoreDefault.v0.1";
  const PLAN_BACKUP_HISTORY_KEY = "longevityResearchSystem.planRestoreHistory.v0.1";
  const DEFAULT_PLAN_PATH = "plans/longevity_base.md";

  function nowIso() {
    return new Date().toISOString();
  }

  function dateStamp() {
    return nowIso().replaceAll(":", "-").slice(0, 19);
  }

  function currentPlanText() {
    const editor = document.getElementById("planEditor");
    return editor?.value ?? state?.planMarkdown ?? "";
  }

  function setButtonText() {
    const button = document.getElementById("loadSeedPlanBtn");
    if (!button) return;
    button.textContent = "Restore default plan";
    button.title = "Replace the current local plan with the built-in default template. A backup is created first.";
    button.setAttribute("aria-label", "Restore default plan template");
  }

  function downloadPlanBackup(markdown) {
    const blob = new Blob([markdown || ""], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-before-restore-default-${dateStamp()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function savePlanBackup(markdown) {
    const backup = {
      schemaVersion: "plan-restore-backup.v1",
      createdAt: nowIso(),
      reason: "Before restoring the built-in default plan template",
      planMarkdown: markdown || ""
    };

    try {
      localStorage.setItem(PLAN_BACKUP_KEY, JSON.stringify(backup));
      const history = JSON.parse(localStorage.getItem(PLAN_BACKUP_HISTORY_KEY) || "[]");
      const next = [
        { createdAt: backup.createdAt, size: markdown.length },
        ...(Array.isArray(history) ? history : [])
      ].slice(0, 8);
      localStorage.setItem(PLAN_BACKUP_HISTORY_KEY, JSON.stringify(next));
      return "local";
    } catch (error) {
      console.warn("Could not save plan backup locally; downloading instead.", error);
      downloadPlanBackup(markdown);
      return "download";
    }
  }

  async function restoreDefaultPlan() {
    const existing = currentPlanText();
    const hasCurrentPlan = existing.trim().length > 0;
    const message = hasCurrentPlan
      ? "Restore the default plan template?\n\nThis will replace the current local plan shown in the editor. A backup of the current plan will be created first.\n\nThis is not the same as Pull from GitHub."
      : "Load the default plan template?";

    if (!confirm(message)) return;

    let backupMode = "none";
    if (hasCurrentPlan) backupMode = savePlanBackup(existing);

    try {
      const response = await fetch(`${DEFAULT_PLAN_PATH}?v=${Date.now()}`);
      if (!response.ok) throw new Error(`Default plan fetch failed: ${response.status}`);
      state.planMarkdown = await response.text();
      saveState();
      syncPlanEditorFromState();
      if (typeof setSyncStatus === "function") {
        const backupText = backupMode === "local"
          ? " Previous plan backed up locally."
          : backupMode === "download"
            ? " Previous plan downloaded as a backup file."
            : "";
        setSyncStatus(`Default plan restored.${backupText} Push to GitHub if you want this version on other devices.`);
      }
      if (typeof enhancedPlanRender === "function") enhancedPlanRender();
    } catch (error) {
      console.error(error);
      alert("Could not restore the default plan. Your current plan was not replaced.");
      if (typeof setSyncStatus === "function") {
        setSyncStatus("Could not restore the default plan. Your current plan was not replaced.", true);
      }
    }
  }

  function installRestoreDefaultHandler() {
    setButtonText();
    const button = document.getElementById("loadSeedPlanBtn");
    if (!button || button.dataset.restoreDefaultHandler === "installed") return;
    button.dataset.restoreDefaultHandler = "installed";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      restoreDefaultPlan();
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    [0, 150, 600, 1300].forEach((delay) => window.setTimeout(installRestoreDefaultHandler, delay));
  });
  installRestoreDefaultHandler();
})();
