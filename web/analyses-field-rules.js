(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";

  const RULES = new Map([
    ["age", { name: "Birth date", kind: "personal_fact", valueType: "date", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["birth date", { name: "Birth date", kind: "personal_fact", valueType: "date", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["height", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["actual weight (scale)", { name: "Weight", kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["weight", { name: "Weight", kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["waist circumference", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["hip circumference", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }],
    ["homa-ir (calculated)", { kind: "personal_fact", hidePriority: true, hideNotes: true, clearActionFields: true }]
  ]);

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
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
        align-items: flex-start;
        padding: 12px 12px 10px 16px !important;
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
      .analysis-item .status-dot { margin-top: 8px; }
      .analysis-item .item-name {
        flex-basis: 100%;
        min-width: 0;
        padding: 0 0 4px !important;
        margin-bottom: 2px;
        font-size: clamp(1.04rem, 1.7vw, 1.24rem) !important;
        line-height: 1.25;
        font-weight: 850 !important;
        color: #111827;
        letter-spacing: -0.015em;
      }
      .analysis-item .kind-chip,
      .analysis-item .latest-update,
      .analysis-item .inline-select,
      .analysis-item .icon-btn { margin-top: 2px; }
      .analysis-item .item-details {
        margin-top: 0;
        padding: 12px;
        border-top: 0;
        background: #ffffff;
      }
      @media (max-width: 560px) {
        .analysis-item > .item-row { padding: 12px 10px 10px 14px !important; }
        .analysis-item .item-name { font-size: 1.08rem !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function stripHiddenFieldsFromRowHtml(item, html) {
    const rule = ruleForName(item?.name);
    if (!rule) return html;
    let out = String(html || "");

    // Prevent flicker by removing these controls before the DOM is inserted.
    if (rule.hideNotes) {
      out = out.replace(/\s*<label class="full-width">Notes[\s\S]*?<\/label>/, "");
      out = out.replace(/\s*<input name="notes" type="text" placeholder="Optional notes" \/>/, "");
    }
    if (rule.hidePriority) {
      out = out.replace(/<select class="inline-select priority[\s\S]*?<\/select>/, "");
    }
    if (rule.valueType === "date") {
      out = out.replace(/<input name="value" type="text" placeholder="[^"]*" \/>/, `<input name="value" type="date" />`);
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

    const valueInput = row.querySelector(".add-update-form input[name='value']");
    if (valueInput && rule.valueType) {
      valueInput.type = rule.valueType;
      valueInput.placeholder = rule.name || title.textContent || "Value";
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
    });
  }

  function patchDom() {
    ensureStyles();
    patchQArtifacts();
    document.querySelectorAll(".analysis-item").forEach((row) => {
      patchBasicRow(row);
      patchBirthDateAge(row);
    });
  }

  function applyFieldRules({ rerender = false } = {}) {
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

  // app.js runs before this file. Install the render guard synchronously so the first render
  // does not briefly insert Notes/priority/action fields for basic facts such as Birth date.
  ensureStyles();
  installRenderItemGuard();
  migrateRuntimeState();
  setTimeout(() => applyFieldRules({ rerender: true }), 0);
  document.addEventListener("DOMContentLoaded", () => setTimeout(() => applyFieldRules({ rerender: true }), 500));
})();
