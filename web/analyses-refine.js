(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";
  const BASIC_DATA_RULES = new Map([
    ["age", { renameTo: "Birth date", kindLabel: "Birth date", valueType: "date", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }],
    ["birth date", { renameTo: "Birth date", kindLabel: "Birth date", valueType: "date", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }],
    ["height", { hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }],
    ["actual weight (scale)", { renameTo: "Weight", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }],
    ["weight", { renameTo: "Weight", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }],
    ["waist circumference", { hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }],
    ["hip circumference", { hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true }]
  ]);
  const PRIORITY_KIND_LABELS = new Set(["lab test", "clinical study", "functional test"]);

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
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

  function ruleForItemName(name) {
    return BASIC_DATA_RULES.get(normalize(name)) || null;
  }

  function migrateLocalStateOnce() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      let changed = false;

      if (state?.analyses?.categories && state?.analyses?.items) {
        const qCategory = state.analyses.categories.find((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom);
        if (qCategory) {
          state.analyses.categories = state.analyses.categories.filter((cat) => cat.id !== qCategory.id);
          state.analyses.items = state.analyses.items.filter((item) => item.categoryId !== qCategory.id);
          changed = true;
        }

        state.analyses.items.forEach((item) => {
          const rule = ruleForItemName(item.name);
          if (!rule) return;
          if (rule.renameTo && item.name !== rule.renameTo) { item.name = rule.renameTo; changed = true; }
          if (normalize(item.name) === "birth date" && item.kind !== "personal_fact") { item.kind = "personal_fact"; changed = true; }
          if (rule.hidePriority && item.priority !== "none") { item.priority = "none"; changed = true; }
          if (rule.hideNotes && item.notes) { item.notes = ""; changed = true; }
          if (rule.hideActionability && item.actionability) { item.actionability = ""; changed = true; }
          if (rule.hideTargetDate && item.targetDate) { item.targetDate = ""; changed = true; }
        });
      }

      if (changed) {
        state.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      console.warn("Safe analyses migration failed", error);
    }
  }

  function ensureStyles() {
    if (document.getElementById("analysesRefineStyles")) return;
    const style = document.createElement("style");
    style.id = "analysesRefineStyles";
    style.textContent = `
      .analysis-item .inline-select.priority.hidden,
      .analysis-item label.hidden,
      .analysis-item input.hidden,
      .analysis-item textarea.hidden { display: none !important; }
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
      .analysis-item .item-name:hover { color: var(--accent); text-decoration: none; }
      .analysis-item .kind-chip,
      .analysis-item .latest-update,
      .analysis-item .computed-age,
      .analysis-item .inline-select,
      .analysis-item .icon-btn { margin-top: 2px; }
      .analysis-item .item-details {
        margin-top: 0;
        padding: 12px;
        border-top: 0;
        background: #ffffff;
      }
      .analysis-item .updates-block { margin-top: 2px; padding-top: 12px; }
      @media (max-width: 560px) {
        .analysis-item > .item-row { padding: 12px 10px 10px 14px !important; }
        .analysis-item .item-name { font-size: 1.08rem !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function hideLabelByText(row, pattern) {
    row.querySelectorAll("label").forEach((label) => {
      if (pattern.test(label.textContent || "")) label.classList.add("hidden");
    });
  }

  function patchBasicRow(row) {
    const title = row.querySelector(".item-name");
    if (!title) return;
    const rule = ruleForItemName(title.textContent);
    if (!rule) return;

    if (rule.renameTo) title.textContent = rule.renameTo;
    const kind = row.querySelector(".kind-chip");
    if (rule.kindLabel && kind) kind.textContent = rule.kindLabel;

    if (rule.hidePriority) row.querySelector(".priority")?.classList.add("hidden");
    if (rule.hideActionability) hideLabelByText(row, /Actionability/i);
    if (rule.hideTargetDate) hideLabelByText(row, /Target date/i);
    if (rule.hideNotes) hideLabelByText(row, /^\s*Notes\s*/i);

    const valueInput = row.querySelector(".add-update-form input[name='value']");
    if (valueInput && rule.valueType) {
      valueInput.type = rule.valueType;
      valueInput.placeholder = rule.renameTo || title.textContent || "Value";
    }
    const updateNotes = row.querySelector(".add-update-form input[name='notes']");
    if (updateNotes && rule.hideNotes) updateNotes.classList.add("hidden");
  }

  function patchBirthDateComputedAge(row) {
    const title = row.querySelector(".item-name");
    if (!title || normalize(title.textContent) !== "birth date") return;
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

  function patchPriority(row) {
    const priority = row.querySelector(".priority");
    if (!priority) return;
    const title = normalize(row.querySelector(".item-name")?.textContent);
    const kind = normalize(row.querySelector(".kind-chip")?.textContent);
    const basicRule = ruleForItemName(title);
    if (basicRule?.hidePriority || !PRIORITY_KIND_LABELS.has(kind)) priority.classList.add("hidden");
  }

  function hideRetiredQ() {
    document.querySelectorAll(".category-card").forEach((card) => {
      const code = card.querySelector(".category-code")?.textContent?.trim().toUpperCase();
      const title = normalize(card.querySelector(".category-title")?.textContent || "");
      if (code === "Q" || title.includes("ideal map of measurements")) {
        card.classList.add("analysis-retired-q");
        card.style.display = "none";
      }
    });
  }

  function patchUi() {
    ensureStyles();
    hideRetiredQ();
    document.querySelectorAll(".analysis-item").forEach((row) => {
      patchBasicRow(row);
      patchBirthDateComputedAge(row);
      patchPriority(row);
    });
  }

  function runSafePatches() {
    migrateLocalStateOnce();
    patchUi();
    setTimeout(patchUi, 300);
    setTimeout(patchUi, 1200);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(runSafePatches, 700);
  });
})();
