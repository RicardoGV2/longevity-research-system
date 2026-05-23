(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";

  function stripQFromCodes(codes) {
    return (codes || []).filter((code) => String(code || "").toUpperCase() !== "Q");
  }

  function removeQFromState() {
    let changed = false;
    try {
      if (typeof state !== "undefined" && state?.analyses?.categories && state?.analyses?.items) {
        const qIds = new Set(
          state.analyses.categories
            .filter((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom)
            .map((cat) => cat.id)
        );
        if (qIds.size) {
          state.analyses.categories = state.analyses.categories.filter((cat) => !qIds.has(cat.id));
          state.analyses.items = state.analyses.items.filter((item) => !qIds.has(item.categoryId));
          changed = true;
        }
        if (changed) {
          state.updatedAt = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      }
    } catch (error) {
      console.warn("Q category state cleanup skipped", error);
    }
    return changed;
  }

  function removeQSuggestionFromDom() {
    const suggestion = document.getElementById("planSyncSuggestion");
    if (!suggestion) return;
    suggestion.querySelectorAll("[data-code='Q']").forEach((chip) => chip.remove());
    if (!suggestion.querySelector("[data-action='seed-code']")) {
      suggestion.classList.add("hidden");
      suggestion.innerHTML = "";
    }
  }

  function removeQFilterAndCards() {
    document.querySelectorAll("#filterCategory option").forEach((option) => {
      if (/^Q\./i.test(option.textContent || "") || option.value === "Q") option.remove();
    });
    document.querySelectorAll(".category-card").forEach((card) => {
      const code = card.querySelector(".category-code")?.textContent?.trim().toUpperCase();
      if (code === "Q") card.remove();
    });
  }

  function installGuards() {
    try {
      if (typeof detectPlanCategoryCodes === "function" && !detectPlanCategoryCodes.__qGuarded) {
        const originalDetectPlanCategoryCodes = detectPlanCategoryCodes;
        detectPlanCategoryCodes = function detectPlanCategoryCodesWithoutQ(markdown) {
          return stripQFromCodes(originalDetectPlanCategoryCodes(markdown));
        };
        detectPlanCategoryCodes.__qGuarded = true;
      }

      if (typeof renderPlanSyncSuggestion === "function" && !renderPlanSyncSuggestion.__qGuarded) {
        const originalRenderPlanSyncSuggestion = renderPlanSyncSuggestion;
        renderPlanSyncSuggestion = function renderPlanSyncSuggestionWithoutQ() {
          originalRenderPlanSyncSuggestion();
          removeQSuggestionFromDom();
        };
        renderPlanSyncSuggestion.__qGuarded = true;
      }

      if (typeof offerSeedForCode === "function" && !offerSeedForCode.__qGuarded) {
        const originalOfferSeedForCode = offerSeedForCode;
        offerSeedForCode = function offerSeedForCodeWithoutQ(code) {
          if (String(code || "").toUpperCase() === "Q") return;
          return originalOfferSeedForCode(code);
        };
        offerSeedForCode.__qGuarded = true;
      }
    } catch (error) {
      console.warn("Q category guard install skipped", error);
    }
  }

  function runCleanup({ rerender = false } = {}) {
    installGuards();
    const changed = removeQFromState();
    removeQSuggestionFromDom();
    removeQFilterAndCards();
    if ((changed || rerender) && typeof renderAnalyses === "function") {
      renderAnalyses();
      removeQSuggestionFromDom();
      removeQFilterAndCards();
    }
  }

  document.addEventListener("click", (event) => {
    const qChip = event.target.closest?.("[data-code='Q']");
    if (qChip) {
      event.preventDefault();
      event.stopPropagation();
      removeQSuggestionFromDom();
    }
  }, true);

  // Install immediately because app.js has already defined the core functions before this file loads.
  runCleanup({ rerender: true });
  document.addEventListener("DOMContentLoaded", () => {
    [100, 500, 1200, 2200].forEach((delay) => setTimeout(() => runCleanup({ rerender: delay === 500 }), delay));
  });
})();
