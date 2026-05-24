(() => {
  const RECURRENCE_META = {
    once: { label: "Once", short: "Once" },
    initial: { label: "Initial", short: "Initial" },
    daily: { label: "Daily", short: "Daily" },
    seven_day: { label: "7-day log", short: "7 days" },
    weekly: { label: "Weekly", short: "Weekly" },
    monthly: { label: "Monthly", short: "Monthly" },
    quarterly: { label: "Every 3–6 months", short: "3–6 mo" },
    yearly: { label: "Yearly", short: "Yearly" },
    per_event: { label: "Per event / experiment", short: "Per event" },
    as_needed: { label: "As needed", short: "As needed" }
  };

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function safeClass(value) {
    return String(value || "as_needed").replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function escapeHtmlLocal(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function itemText(item) {
    return `${item?.name || ""} ${item?.kind || ""} ${item?.description || ""}`.toLowerCase();
  }

  function inferRecurrence(item) {
    const name = norm(item?.name);
    const kind = item?.kind || "questionnaire";
    const text = itemText(item);

    if (["birth date", "height", "sex", "sex biological", "biological sex", "country/city", "location"].includes(name)) return "once";
    if (["medications", "supplements"].includes(name)) return "as_needed";

    if (name === "weight") return "daily";
    if (name.includes("sleep") || name.includes("steps") || name.includes("stress") || name.includes("energy") || name.includes("pain")) return "daily";
    if (name.includes("heart rate variability") || name.includes("hrv") || name.includes("resting heart rate")) return "daily";

    if (name.includes("food") || name.includes("meal") || name.includes("hunger") || name.includes("digestion") || kind === "nutrition_log") return "seven_day";
    if (name.includes("recipe") || name.includes("experiment")) return "per_event";

    if (name.includes("waist")) return "weekly";
    if (name.includes("hip") || name.includes("photo") || name.includes("mobility") || name.includes("balance") || name.includes("grip") || name.includes("strength")) return "monthly";
    if (name.includes("blood pressure") || name.includes("pressure") || name.includes("glucose") || name.includes("spo₂") || name.includes("spo2") || name.includes("oxygen")) return "weekly";

    if (kind === "wearable_metric") return "daily";
    if (kind === "subjective_log") return "daily";
    if (kind === "body_measurement") return "monthly";
    if (kind === "functional_test") return "monthly";
    if (kind === "clinical_study" || kind === "lab_test") return "quarterly";
    if (kind === "equipment") return "as_needed";
    if (kind === "lifestyle_factor") return "as_needed";

    if (text.includes("daily") || text.includes("diario")) return "daily";
    if (text.includes("weekly") || text.includes("semanal")) return "weekly";
    if (text.includes("monthly") || text.includes("mensual")) return "monthly";
    if (text.includes("3–6") || text.includes("3-6") || text.includes("quarter")) return "quarterly";
    if (text.includes("7 days") || text.includes("7 días") || text.includes("7-day")) return "seven_day";

    return "initial";
  }

  function normalizeRecurrencesInAnalyses(analyses) {
    if (!analyses || !Array.isArray(analyses.items)) return false;
    let changed = false;
    for (const item of analyses.items) {
      const inferred = inferRecurrence(item);
      if (!item.recurrence || !RECURRENCE_META[item.recurrence]) {
        item.recurrence = inferred;
        changed = true;
      }
    }
    return changed;
  }

  function normalizeAllRecurrences() {
    let changed = false;
    try {
      if (state?.analyses) changed = normalizeRecurrencesInAnalyses(state.analyses) || changed;
      const profileData = state?.multiUser?.profileData;
      if (profileData && typeof profileData === "object") {
        for (const data of Object.values(profileData)) {
          if (data?.analyses) changed = normalizeRecurrencesInAnalyses(data.analyses) || changed;
        }
      }
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Recurrence normalization skipped", error);
    }
    return changed;
  }

  function recurrenceForItem(item) {
    if (!item) return "initial";
    if (!item.recurrence || !RECURRENCE_META[item.recurrence]) item.recurrence = inferRecurrence(item);
    return item.recurrence;
  }

  function recurrenceChipHtml(item) {
    const recurrence = recurrenceForItem(item);
    const meta = RECURRENCE_META[recurrence] || RECURRENCE_META.initial;
    return `<span class="recurrence-chip recurrence-${safeClass(recurrence)}" title="How often this should be entered or reviewed">↻ ${escapeHtmlLocal(meta.short)}</span>`;
  }

  function installItemRowWrapper() {
    if (typeof renderItemRow !== "function" || renderItemRow.__recurrenceWrapped) return;
    const originalRenderItemRow = renderItemRow;
    renderItemRow = function renderItemRowWithRecurrence(item) {
      const html = originalRenderItemRow(item);
      if (html.includes("recurrence-chip")) return html;
      const chip = recurrenceChipHtml(item);
      return html.replace(/(<span class="kind-chip[\s\S]*?<\/span>)/, `$1${chip}`);
    };
    renderItemRow.__recurrenceWrapped = true;
  }

  function activeKindFilter() {
    return analysisFilters?.kind || "all";
  }

  function activeRecurrenceFilter() {
    if (!analysisFilters) return "all";
    if (!analysisFilters.recurrence) analysisFilters.recurrence = "all";
    return analysisFilters.recurrence;
  }

  function usedRecurrences() {
    const used = new Set((state?.analyses?.items || []).map((item) => recurrenceForItem(item)));
    return ["all", ...Object.keys(RECURRENCE_META).filter((key) => used.has(key))];
  }

  function ensureRecurrenceFilter() {
    const filters = document.querySelector(".analyses-filters");
    if (!filters) return;
    let label = document.getElementById("analysisRecurrenceFilterLabel");
    if (!label) {
      label = document.createElement("label");
      label.id = "analysisRecurrenceFilterLabel";
      label.innerHTML = `<span>Recurrence</span><select id="filterRecurrence" class="recurrence-filter-select"></select>`;
      filters.appendChild(label);
      label.querySelector("select").addEventListener("change", (event) => {
        analysisFilters.recurrence = event.target.value || "all";
        renderAnalyses();
      });
    }

    const select = document.getElementById("filterRecurrence");
    if (!select) return;
    const values = usedRecurrences();
    const current = activeRecurrenceFilter();
    select.innerHTML = values.map((value) => {
      const label = value === "all" ? "All" : RECURRENCE_META[value]?.label || value;
      return `<option value="${escapeHtmlLocal(value)}">${escapeHtmlLocal(label)}</option>`;
    }).join("");
    if (!values.includes(current)) analysisFilters.recurrence = "all";
    select.value = activeRecurrenceFilter();
    select.className = `recurrence-filter-select recurrence-filter-${safeClass(select.value)}`;
  }

  function installCategoryGridWrapper() {
    if (typeof renderCategoryGrid !== "function" || renderCategoryGrid.__recurrenceWrapped) return;
    renderCategoryGrid = function renderCategoryGridWithRecurrence() {
      const grid = document.getElementById("analysesCategories");
      const emptyMsg = document.getElementById("analysesEmpty");
      if (!grid) return;

      if (!state.analyses.categories.length) {
        grid.innerHTML = "";
        if (emptyMsg) emptyMsg.classList.remove("hidden");
        return;
      }
      if (emptyMsg) emptyMsg.classList.add("hidden");

      const search = analysisFilters.search;
      const filterCategory = analysisFilters.category;
      const filterStatus = analysisFilters.status;
      const filterPriority = analysisFilters.priority;
      const filterKind = activeKindFilter();
      const filterRecurrence = activeRecurrenceFilter();

      const categories = (filterCategory === "all"
        ? state.analyses.categories
        : state.analyses.categories.filter((c) => c.id === filterCategory)
      ).filter((c) => String(c.code || "").toUpperCase() !== "Q");

      const html = categories.map((cat) => {
        const items = state.analyses.items.filter((i) => i.categoryId === cat.id).filter((item) => {
          if (filterStatus !== "all" && item.status !== filterStatus) return false;
          if (filterPriority !== "all" && (item.priority || "none") !== filterPriority) return false;
          if (filterKind !== "all" && (item.kind || "questionnaire") !== filterKind) return false;
          if (filterRecurrence !== "all" && recurrenceForItem(item) !== filterRecurrence) return false;
          if (search) {
            const hay = `${item.name} ${item.notes || ""} ${item.description || ""}`.toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        });
        if ((filterKind !== "all" || filterRecurrence !== "all") && items.length === 0) return "";
        return renderCategoryCard(cat, items);
      }).join("");

      grid.innerHTML = html;
    };
    renderCategoryGrid.__recurrenceWrapped = true;
  }

  function installRenderAnalysesWrapper() {
    if (typeof renderAnalyses !== "function" || renderAnalyses.__recurrenceWrapped) return;
    const originalRenderAnalyses = renderAnalyses;
    renderAnalyses = function renderAnalysesWithRecurrence(...args) {
      normalizeAllRecurrences();
      installItemRowWrapper();
      installCategoryGridWrapper();
      const result = originalRenderAnalyses.apply(this, args);
      ensureRecurrenceFilter();
      return result;
    };
    renderAnalyses.__recurrenceWrapped = true;
  }

  function installStyles() {
    if (document.getElementById("analysesRecurrenceStyles")) return;
    const style = document.createElement("style");
    style.id = "analysesRecurrenceStyles";
    style.textContent = `
      .recurrence-chip {
        order: 4;
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 0.78rem;
        font-weight: 850;
        white-space: nowrap;
      }
      .analysis-item .inline-select.status { order: 5; }
      .analysis-item .inline-select.priority { order: 6; }
      .analysis-item .latest-update { order: 7; }
      .recurrence-once, .recurrence-filter-once { background: #f8fafc !important; color: #475569 !important; border-color: #cbd5e1 !important; }
      .recurrence-initial, .recurrence-filter-initial { background: #eef6ff !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; }
      .recurrence-daily, .recurrence-filter-daily { background: #ecfdf5 !important; color: #047857 !important; border-color: #bbf7d0 !important; }
      .recurrence-seven_day, .recurrence-filter-seven_day { background: #fff7ed !important; color: #c2410c !important; border-color: #fed7aa !important; }
      .recurrence-weekly, .recurrence-filter-weekly { background: #ecfeff !important; color: #0e7490 !important; border-color: #a5f3fc !important; }
      .recurrence-monthly, .recurrence-filter-monthly { background: #faf5ff !important; color: #7e22ce !important; border-color: #e9d5ff !important; }
      .recurrence-quarterly, .recurrence-filter-quarterly { background: #fef2f2 !important; color: #b91c1c !important; border-color: #fecaca !important; }
      .recurrence-yearly, .recurrence-filter-yearly { background: #fffbeb !important; color: #a16207 !important; border-color: #fde68a !important; }
      .recurrence-per_event, .recurrence-filter-per_event { background: #fdf2f8 !important; color: #be185d !important; border-color: #fbcfe8 !important; }
      .recurrence-as_needed, .recurrence-filter-as_needed { background: #f1f5f9 !important; color: #334155 !important; border-color: #cbd5e1 !important; }
      .recurrence-filter-all { background: #ffffff !important; color: #111827 !important; }
      @media (max-width: 560px) {
        .recurrence-chip {
          margin-left: 16px;
          font-size: 0.75rem;
          padding: 3px 7px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function run() {
    normalizeAllRecurrences();
    installStyles();
    installItemRowWrapper();
    installCategoryGridWrapper();
    installRenderAnalysesWrapper();
    ensureRecurrenceFilter();
    if (typeof renderAnalyses === "function") requestAnimationFrame(renderAnalyses);
  }

  run();
  document.addEventListener("DOMContentLoaded", () => {
    [0, 150, 600, 1500].forEach((delay) => setTimeout(run, delay));
  });
})();
