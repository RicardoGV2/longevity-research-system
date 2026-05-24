(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";

  const RULES = new Map([
    ["age", { name: "Birth date", kind: "personal_fact", valueType: "date", hideUpdateDate: true, hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["birth date", { name: "Birth date", kind: "personal_fact", valueType: "date", hideUpdateDate: true, hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["height", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["actual weight (scale)", { name: "Weight", kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["weight", { name: "Weight", kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["waist circumference", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["hip circumference", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["homa-ir (calculated)", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }]
  ]);

  const KIND_LABELS = {
    all: "All",
    personal_fact: "Personal fact",
    body_measurement: "Body measurement",
    lab_test: "Lab test",
    clinical_study: "Clinical study",
    functional_test: "Functional test",
    wearable_metric: "Wearable metric",
    subjective_log: "Subjective log",
    nutrition_log: "Nutrition log",
    lifestyle_factor: "Lifestyle factor",
    equipment: "Equipment",
    questionnaire: "Self-assessment"
  };

  const KIND_DOTS = {
    all: "●",
    personal_fact: "●",
    body_measurement: "●",
    lab_test: "●",
    clinical_study: "●",
    functional_test: "●",
    wearable_metric: "●",
    subjective_log: "●",
    nutrition_log: "●",
    lifestyle_factor: "●",
    equipment: "●",
    questionnaire: "●"
  };

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function cssSafe(value) {
    return String(value || "").replace(/[^a-z0-9_-]/gi, "_");
  }

  function ruleForName(name) {
    return RULES.get(normalize(name)) || null;
  }

  function calculateAge(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDelta = today.getMonth() - date.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  }

  function applyRuleToItem(item) {
    if (!item) return false;
    const rule = ruleForName(item.name);
    if (!rule) return false;
    let changed = false;

    if (rule.name && item.name !== rule.name) {
      item.name = rule.name;
      changed = true;
    }
    if (rule.kind && item.kind !== rule.kind) {
      item.kind = rule.kind;
      changed = true;
    }
    if (rule.hidePriority && item.priority !== "none") {
      item.priority = "none";
      changed = true;
    }
    if (rule.hideNotes && item.notes) {
      item.notes = "";
      changed = true;
    }
    if (rule.clearActionFields) {
      if (item.actionability) { item.actionability = ""; changed = true; }
      if (item.targetDate) { item.targetDate = ""; changed = true; }
      if (item.cost) { item.cost = ""; changed = true; }
      if (item.invasiveness) { item.invasiveness = ""; changed = true; }
    }
    if (changed) item.updatedAt = new Date().toISOString();
    return changed;
  }

  function migrateAnalyses(appState) {
    if (!appState?.analyses?.categories || !appState?.analyses?.items) return false;
    let changed = false;

    const qIds = new Set(
      appState.analyses.categories
        .filter((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom)
        .map((cat) => cat.id)
    );

    if (qIds.size) {
      appState.analyses.categories = appState.analyses.categories.filter((cat) => !qIds.has(cat.id));
      appState.analyses.items = appState.analyses.items.filter((item) => !qIds.has(item.categoryId));
      changed = true;
    }

    for (const item of appState.analyses.items) {
      if (applyRuleToItem(item)) changed = true;
    }

    if (changed) appState.updatedAt = new Date().toISOString();
    return changed;
  }

  function persistState(appState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.warn("Could not persist analyses field rules", error);
    }
  }

  function migrateRuntimeState() {
    try {
      if (typeof state === "undefined" || !state) return false;
      const changed = migrateAnalyses(state);
      if (changed) persistState(state);
      return changed;
    } catch (error) {
      console.warn("Runtime analyses migration skipped", error);
      return false;
    }
  }

  function ensureKindFilterState() {
    try {
      if (typeof analysisFilters !== "undefined" && !analysisFilters.kind) analysisFilters.kind = "all";
    } catch {}
  }

  function currentKindFilter() {
    try { return analysisFilters.kind || "all"; } catch { return "all"; }
  }

  function setKindFilter(value) {
    try { analysisFilters.kind = value || "all"; } catch {}
  }

  function kindOptions() {
    let kinds = Object.keys(KIND_LABELS).filter((k) => k !== "all");
    try {
      const used = new Set((state?.analyses?.items || []).map((i) => i.kind || "questionnaire"));
      kinds = kinds.filter((k) => used.has(k));
    } catch {}
    return ["all", ...kinds];
  }

  function ensureKindFilter() {
    const filters = document.querySelector(".analyses-filters");
    if (!filters || document.getElementById("filterKind")) return;
    const label = document.createElement("label");
    label.id = "analysisKindFilterLabel";
    label.innerHTML = `<span>Type / tag</span><select id="filterKind" class="kind-filter-select"></select>`;
    filters.appendChild(label);
    label.querySelector("select")?.addEventListener("change", (event) => {
      setKindFilter(event.target.value);
      updateKindSelectClass();
      patchDom();
    });
  }

  function populateKindFilter() {
    const select = document.getElementById("filterKind");
    if (!select) return;
    const current = currentKindFilter();
    select.innerHTML = kindOptions().map((kind) => {
      const label = KIND_LABELS[kind] || kind;
      return `<option value="${kind}">${KIND_DOTS[kind] || "●"} ${label}</option>`;
    }).join("");
    select.value = kindOptions().includes(current) ? current : "all";
    if (select.value !== current) setKindFilter(select.value);
    updateKindSelectClass();
  }

  function updateKindSelectClass() {
    const select = document.getElementById("filterKind");
    if (!select) return;
    select.className = `kind-filter-select kind-filter-${cssSafe(select.value || "all")}`;
  }

  function ensureStyles() {
    if (document.getElementById("analysesFieldRulesStyles")) return;
    const style = document.createElement("style");
    style.id = "analysesFieldRulesStyles";
    style.textContent = `
      .analysis-item .field-rules-hidden { display: none !important; }
      .computed-age { background: #effaf3; color: #047a44; }

      .analysis-item {
        padding: 0 !important;
        overflow: hidden;
        background: #ffffff;
      }
      .analysis-item > .item-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 7px 8px;
        padding: 10px 12px 9px 16px !important;
        border-bottom: 1px solid rgba(223, 228, 238, 0.9);
        background: linear-gradient(90deg, #f8fbff 0%, #ffffff 58%);
      }
      .analysis-item > .item-row::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: var(--accent);
        opacity: 0.72;
      }
      .analysis-item .status-dot {
        order: 0;
        margin-top: 0 !important;
        align-self: center;
        flex: 0 0 auto;
      }
      .analysis-item .item-name {
        order: 1;
        flex: 1 1 calc(100% - 58px) !important;
        min-width: 0;
        padding: 0 !important;
        margin: 0 !important;
        font-size: clamp(1.02rem, 1.6vw, 1.2rem) !important;
        line-height: 1.18;
        font-weight: 850 !important;
        color: #111827;
        letter-spacing: -0.015em;
      }
      .analysis-item .icon-btn {
        order: 2;
        margin: 0 !important;
        padding: 2px 6px !important;
        align-self: center;
        flex: 0 0 auto;
      }
      .analysis-item .kind-chip {
        order: 3;
        margin-left: 18px;
      }
      .analysis-item .inline-select.status { order: 4; }
      .analysis-item .inline-select.priority { order: 5; }
      .analysis-item .latest-update { order: 6; }
      .analysis-item .kind-chip,
      .analysis-item .latest-update,
      .analysis-item .inline-select { margin-top: 0 !important; }
      .analysis-item .item-details {
        margin-top: 0;
        padding: 10px 12px 12px !important;
        border-top: 0 !important;
        background: #ffffff;
      }
      .analysis-item .updates-block {
        border-top: 0 !important;
        padding-top: 2px !important;
        margin-top: 0 !important;
      }
      .analysis-item .updates-head {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
      .analysis-item .add-update-form {
        margin-top: 8px !important;
      }
      .analysis-item[data-kind-filter-hidden="true"],
      .category-card[data-kind-filter-empty="true"] { display: none !important; }

      .kind-chip { border: 1px solid transparent; }
      .kind-chip-personal_fact, .kind-filter-personal_fact { background: #eef6ff !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; }
      .kind-chip-body_measurement, .kind-filter-body_measurement { background: #ecfeff !important; color: #0e7490 !important; border-color: #a5f3fc !important; }
      .kind-chip-lab_test, .kind-filter-lab_test { background: #fef2f2 !important; color: #b91c1c !important; border-color: #fecaca !important; }
      .kind-chip-clinical_study, .kind-filter-clinical_study { background: #faf5ff !important; color: #7e22ce !important; border-color: #e9d5ff !important; }
      .kind-chip-functional_test, .kind-filter-functional_test { background: #fff7ed !important; color: #c2410c !important; border-color: #fed7aa !important; }
      .kind-chip-wearable_metric, .kind-filter-wearable_metric { background: #eef2ff !important; color: #4338ca !important; border-color: #c7d2fe !important; }
      .kind-chip-subjective_log, .kind-filter-subjective_log { background: #fdf2f8 !important; color: #be185d !important; border-color: #fbcfe8 !important; }
      .kind-chip-nutrition_log, .kind-filter-nutrition_log { background: #ecfdf5 !important; color: #047857 !important; border-color: #bbf7d0 !important; }
      .kind-chip-lifestyle_factor, .kind-filter-lifestyle_factor { background: #f0fdf4 !important; color: #15803d !important; border-color: #bbf7d0 !important; }
      .kind-chip-equipment, .kind-filter-equipment { background: #f8fafc !important; color: #475569 !important; border-color: #cbd5e1 !important; }
      .kind-chip-questionnaire, .kind-filter-questionnaire { background: #fffbeb !important; color: #a16207 !important; border-color: #fde68a !important; }
      .kind-filter-all { background: #ffffff !important; color: #111827 !important; }

      @media (max-width: 560px) {
        .analysis-item > .item-row { padding: 9px 10px 8px 14px !important; gap: 6px; }
        .analysis-item .item-name { font-size: 1.05rem !important; }
        .analysis-item .kind-chip { margin-left: 16px; }
        .analysis-item .inline-select.status { min-width: 0; flex: 1 1 150px; }
      }
    `;
    document.head.appendChild(style);
  }

  function stripHiddenFieldsFromRowHtml(item, html) {
    const rule = ruleForName(item?.name);
    let out = String(html || "");
    const kind = item?.kind || "questionnaire";

    out = out.replace(/<li class="analysis-item([^\"]*)"/, `<li class="analysis-item$1" data-kind="${kind}"`);
    out = out.replace(/<span class="kind-chip"/g, `<span class="kind-chip kind-chip-${cssSafe(kind)}"`);

    if (!rule) return out;

    if (rule.hideNotes) {
      out = out.replace(/\s*<label class="full-width">Notes[\s\S]*?<\/label>/, "");
      out = out.replace(/\s*<input name="notes" type="text" placeholder="Optional notes" \/>/, "");
    }
    if (rule.hidePriority) {
      out = out.replace(/<select class="inline-select priority[\s\S]*?<\/select>/, "");
    }
    if (rule.hideUpdateDate) {
      out = out.replace(/\s*<input name="date" type="date" value="[^"]*" required \/>/, "");
    }
    if (rule.valueType === "date") {
      out = out.replace(/<input name="value" type="text" placeholder="[^"]*" \/>/, `<input name="value" type="date" aria-label="Birth date" />`);
    }
    return out;
  }

  function installRenderItemGuard() {
    try {
      if (typeof renderItemRow !== "function" || renderItemRow.__fieldRulesGuarded) return;
      const originalRenderItemRow = renderItemRow;
      renderItemRow = function guardedRenderItemRow(item) {
        applyRuleToItem(item);
        return stripHiddenFieldsFromRowHtml(item, originalRenderItemRow(item));
      };
      renderItemRow.__fieldRulesGuarded = true;
    } catch (error) {
      console.warn("Could not install analysis render guard", error);
    }
  }

  function installCategoryFilterLabelGuard() {
    try {
      if (typeof populateCategoryFilter !== "function" || populateCategoryFilter.__allLabelGuarded) return;
      const originalPopulateCategoryFilter = populateCategoryFilter;
      populateCategoryFilter = function populateCategoryFilterAllLabel() {
        originalPopulateCategoryFilter();
        const first = document.querySelector("#filterCategory option[value='all']");
        if (first) first.textContent = "All";
      };
      populateCategoryFilter.__allLabelGuarded = true;
    } catch (error) {
      console.warn("Could not install category label guard", error);
    }
  }

  function hideLabelByText(row, pattern) {
    row.querySelectorAll("label").forEach((label) => {
      if (pattern.test(label.textContent || "")) label.classList.add("field-rules-hidden");
    });
  }

  function patchBasicRow(row) {
    const title = row.querySelector(".item-name");
    if (!title) return;
    const rule = ruleForName(title.textContent);
    if (!rule) return;

    if (rule.name && title.textContent !== rule.name) title.textContent = rule.name;

    if (rule.hidePriority) row.querySelector(".priority")?.classList.add("field-rules-hidden");
    if (rule.clearActionFields) {
      hideLabelByText(row, /Actionability/i);
      hideLabelByText(row, /Target date/i);
      hideLabelByText(row, /Cost/i);
      hideLabelByText(row, /Invasiveness/i);
    }
    if (rule.hideNotes) {
      hideLabelByText(row, /^\s*Notes\s*/i);
      row.querySelector(".add-update-form input[name='notes']")?.classList.add("field-rules-hidden");
    }
    if (rule.hideUpdateDate) {
      row.querySelector(".add-update-form input[name='date']")?.classList.add("field-rules-hidden");
    }

    const valueInput = row.querySelector(".add-update-form input[name='value']");
    if (valueInput && rule.valueType) {
      valueInput.type = rule.valueType;
      valueInput.placeholder = "";
      valueInput.setAttribute("aria-label", rule.name || title.textContent || "Value");
    }
  }

  function patchBirthDateAge(row) {
    const title = normalize(row.querySelector(".item-name")?.textContent);
    if (title !== "birth date") return;
    row.querySelectorAll(".computed-age").forEach((el) => el.remove());
    const latest = row.querySelector(".latest-update");
    const match = (latest?.textContent || "").match(/:\s*(\d{4}-\d{2}-\d{2})/);
    const age = match ? calculateAge(match[1]) : null;
    if (latest && age !== null) {
      const badge = document.createElement("span");
      badge.className = "computed-age latest-update";
      badge.textContent = `Age: ${age}`;
      latest.insertAdjacentElement("afterend", badge);
    }
  }

  function patchQArtifacts() {
    document.querySelectorAll(".category-card").forEach((card) => {
      const code = card.querySelector(".category-code")?.textContent?.trim().toUpperCase();
      if (code === "Q") card.style.display = "none";
    });

    const suggestion = document.getElementById("planSyncSuggestion");
    if (suggestion) {
      suggestion.querySelectorAll("[data-code='Q']").forEach((chip) => chip.remove());
      if (!suggestion.querySelector(".chip")) {
        suggestion.classList.add("hidden");
        suggestion.innerHTML = "";
      }
    }

    document.querySelectorAll("#filterCategory option").forEach((option) => {
      if (/^Q\./i.test(option.textContent || "")) option.remove();
      if (option.value === "all") option.textContent = "All";
    });
  }

  function applyKindFilterToDom() {
    const wanted = currentKindFilter();
    document.querySelectorAll(".analysis-item").forEach((row) => {
      const kind = row.dataset.kind || "questionnaire";
      row.dataset.kindFilterHidden = wanted !== "all" && kind !== wanted ? "true" : "false";
    });

    document.querySelectorAll(".category-card").forEach((card) => {
      const visibleRows = [...card.querySelectorAll(".analysis-item")].filter((row) => row.dataset.kindFilterHidden !== "true");
      card.dataset.kindFilterEmpty = wanted !== "all" && visibleRows.length === 0 ? "true" : "false";
    });
  }

  function patchDom() {
    ensureStyles();
    ensureKindFilterState();
    ensureKindFilter();
    populateKindFilter();
    patchQArtifacts();
    document.querySelectorAll(".analysis-item").forEach((row) => {
      patchBasicRow(row);
      patchBirthDateAge(row);
    });
    applyKindFilterToDom();
  }

  function applyFieldRules({ rerender = false } = {}) {
    installCategoryFilterLabelGuard();
    installRenderItemGuard();
    const changed = migrateRuntimeState();
    if ((changed || rerender) && typeof renderAnalyses === "function") renderAnalyses();
    patchDom();
  }

  function schedulePatch() {
    setTimeout(() => patchDom(), 0);
    setTimeout(() => patchDom(), 120);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#analyses, #planSyncSuggestion")) schedulePatch();
  });
  document.addEventListener("change", (event) => {
    if (event.target.closest("#analyses")) schedulePatch();
  });
  document.addEventListener("submit", (event) => {
    if (event.target.closest("#analyses")) schedulePatch();
  });

  ensureStyles();
  ensureKindFilterState();
  installCategoryFilterLabelGuard();
  installRenderItemGuard();
  migrateRuntimeState();
  setTimeout(() => applyFieldRules({ rerender: true }), 0);
  document.addEventListener("DOMContentLoaded", () => setTimeout(() => applyFieldRules({ rerender: true }), 500));
})();
