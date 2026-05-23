(() => {
  function runAnalysesRecovery() {
    try {
      const categories = document.getElementById("analysesCategories");
      const suggestion = document.getElementById("planSyncSuggestion");
      const empty = document.getElementById("analysesEmpty");

      const looksEmpty =
        empty && !empty.classList.contains("hidden") ||
        categories && !categories.textContent.trim() ||
        suggestion && /Found in plan|missing here/i.test(suggestion.textContent || "");

      const canSeed = typeof window.loadAnalysesSeed === "function";
      const canRender = typeof window.renderAnalyses === "function";
      const canBadges = typeof window.schedulePlanBadgeInject === "function";

      if (!looksEmpty || !canSeed) return;

      window.loadAnalysesSeed();
      if (canRender) window.renderAnalyses();
      if (canBadges) window.schedulePlanBadgeInject();

      console.info("Analyses auto-seed recovery applied.");
    } catch (error) {
      console.warn("Analyses auto-seed recovery failed", error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(runAnalysesRecovery, 1200);
    setTimeout(runAnalysesRecovery, 2500);
  });
})();
