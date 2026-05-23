(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function migrateStateNow() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      let changed = false;

      if (state?.analyses?.categories && state?.analyses?.items) {
        const q = state.analyses.categories.find((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom);
        if (q) {
          state.analyses.categories = state.analyses.categories.filter((cat) => cat.id !== q.id);
          state.analyses.items = state.analyses.items.filter((item) => item.categoryId !== q.id);
          changed = true;
        }

        state.analyses.items.forEach((item) => {
          if (normalize(item.name) === "age") {
            item.name = "Birth date";
            item.kind = "personal_fact";
            item.priority = "none";
            item.notes = "";
            item.actionability = "";
            item.targetDate = "";
            changed = true;
          }
        });
      }

      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Instant analyses migration failed", error);
    }
  }

  function patchDomNow() {
    document.querySelectorAll(".analysis-item").forEach((row) => {
      const title = row.querySelector(".item-name");
      const name = normalize(title?.textContent);
      if (name === "age") {
        title.textContent = "Birth date";
        const kind = row.querySelector(".kind-chip");
        if (kind) kind.textContent = "Birth date";
      }
    });

    document.querySelectorAll(".category-card").forEach((card) => {
      const code = card.querySelector(".category-code")?.textContent?.trim().toUpperCase();
      const title = normalize(card.querySelector(".category-title")?.textContent || "");
      if (code === "Q" || title.includes("ideal map of measurements")) {
        card.style.display = "none";
        card.classList.add("analysis-retired-q");
      }
    });
  }

  migrateStateNow();

  const observer = new MutationObserver(() => patchDomNow());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Run quickly after app.js renders, and keep a short safety loop for user-triggered rerenders.
  patchDomNow();
  const times = [0, 16, 50, 120, 250, 500, 1000, 1800];
  times.forEach((ms) => setTimeout(patchDomNow, ms));
})();
