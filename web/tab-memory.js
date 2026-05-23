(() => {
  const TAB_KEY = "longevityResearchSystem.activeTab.v0.1";
  let restoring = false;

  function getTabIdFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "";
    } catch {
      return "";
    }
  }

  function getSavedTab() {
    return getTabIdFromUrl() || localStorage.getItem(TAB_KEY) || "dashboard";
  }

  function activateTab(tabId, { save = true } = {}) {
    const button = document.querySelector(`.tab[data-tab="${CSS.escape(tabId)}"]`);
    const panel = document.getElementById(tabId);
    if (!button || !panel) return false;

    restoring = true;
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    button.classList.add("active");
    panel.classList.add("active");
    if (save) localStorage.setItem(TAB_KEY, tabId);
    requestAnimationFrame(() => {
      restoring = false;
      if (typeof render === "function") render();
    });
    return true;
  }

  function restoreTabWithFallback() {
    const saved = getSavedTab();
    if (activateTab(saved, { save: true })) return;
    activateTab("dashboard", { save: true });
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest?.(".tab[data-tab]");
    if (!tab || restoring) return;
    localStorage.setItem(TAB_KEY, tab.dataset.tab || "dashboard");
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    // Run multiple times because some tabs, like Measurement Map, are injected after app startup.
    [120, 700, 1200, 1800].forEach((delay) => setTimeout(restoreTabWithFallback, delay));
  });

  window.longevityActivateTab = activateTab;
})();
