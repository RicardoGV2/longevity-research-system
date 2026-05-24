(() => {
  const SINGLE_VALUE_NAMES = new Set([
    "birth date",
    "height",
    "weight",
    "waist circumference",
    "hip circumference"
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

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function safeClass(value) {
    return String(value || "questionnaire").replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function isSingleValueItem(item) {
    return !!item && SINGLE_VALUE_NAMES.has(norm(item.name));
  }

  function isBirthDate(item) {
    return norm(item?.name) === "birth date";
  }

  function latestUpdate(item) {
    const updates = Array.isArray(item?.updates) ? item.updates : [];
    return updates.length ? updates[updates.length - 1] : null;
  }

  function calcAge(dateString) {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const md = today.getMonth() - d.getMonth();
    if (md < 0 || (md === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  }

  function inputType(item) {
    return isBirthDate(item) ? "date" : "number";
  }

  function inputAttrs(item) {
    return isBirthDate(item) ? "" : `inputmode="decimal" step="0.1"`;
  }

  function valueHint(item) {
    const name = norm(item?.name);
    if (name === "height") return "cm";
    if (name === "weight") return "kg";
    if (name.includes("circumference")) return "cm";
    return "value";
  }

  function normalizeSeedCatalog() {
    try {
      if (!Array.isArray(ANALYSES_SEED_CATALOG)) return;
      const catA = ANALYSES_SEED_CATALOG.find((c) => c.code === "A");
      if (catA?.items) {
        const age = catA.items.find((i) => norm(i.name) === "age");
        if (age) { age.name = "Birth date"; age.kind = "personal_fact"; }
        const weight = catA.items.find((i) => norm(i.name) === "actual weight (scale)");
        if (weight) { weight.name = "Weight"; weight.kind = "personal_fact"; }
      }
      const qIndex = ANALYSES_SEED_CATALOG.findIndex((c) => String(c.code || "").toUpperCase() === "Q");
      if (qIndex >= 0) ANALYSES_SEED_CATALOG.splice(qIndex, 1);
    } catch (error) {
      console.warn("Seed catalog normalization skipped", error);
    }
  }

  function normalizeState() {
    let changed = false;
    try {
      if (!state?.analyses) return false;
      const qIds = new Set(
        (state.analyses.categories || [])
          .filter((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom)
          .map((cat) => cat.id)
      );
      if (qIds.size) {
        state.analyses.categories = state.analyses.categories.filter((cat) => !qIds.has(cat.id));
        state.analyses.items = state.analyses.items.filter((item) => !qIds.has(item.categoryId));
        changed = true;
      }
      for (const item of state.analyses.items || []) {
        if (norm(item.name) === "age") { item.name = "Birth date"; item.kind = "personal_fact"; changed = true; }
        if (norm(item.name) === "actual weight (scale)") { item.name = "Weight"; item.kind = "personal_fact"; changed = true; }
        if (isSingleValueItem(item)) {
          if (item.kind !== "personal_fact") { item.kind = "personal_fact"; changed = true; }
          if (item.priority !== "none") { item.priority = "none"; changed = true; }
          if (item.notes) { item.notes = ""; changed = true; }
          if (item.cost) { item.cost = ""; changed = true; }
          if (item.invasiveness) { item.invasiveness = ""; changed = true; }
          if (item.actionability) { item.actionability = ""; changed = true; }
          if (item.targetDate) { item.targetDate = ""; changed = true; }
          const latest = latestUpdate(item);
          if (latest?.value && item.status !== "done") {
            item.status = "done";
            changed = true;
          }
        }
      }
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("State normalization skipped", error);
    }
    return changed;
  }

  function activeKindFilter() {
    return analysisFilters.kind || "all";
  }

  function ensureKindFilterState() {
    if (!analysisFilters.kind) analysisFilters.kind = "all";
  }

  function usedKinds() {
    const used = new Set((state?.analyses?.items || []).map((item) => item.kind || "questionnaire"));
    return Object.keys(KIND_LABELS).filter((kind) => kind === "all" || used.has(kind));
  }

  function ensureKindFilter() {
    const filters = document.querySelector(".analyses-filters");
    if (!filters) return;
    let label = document.getElementById("analysisKindFilterLabel");
    if (!label) {
      label = document.createElement("label");
      label.id = "analysisKindFilterLabel";
      label.innerHTML = `<span>Type / tag</span><select id="filterKind" class="kind-filter-select"></select>`;
      filters.appendChild(label);
      label.querySelector("select").addEventListener("change", (event) => {
        analysisFilters.kind = event.target.value || "all";
        renderAnalyses();
      });
    }
    const select = document.getElementById("filterKind");
    const kinds = usedKinds();
    select.innerHTML = kinds.map((kind) => `<option value="${escapeHtml(kind)}">● ${escapeHtml(KIND_LABELS[kind] || kind)}</option>`).join("");
    if (!kinds.includes(activeKindFilter())) analysisFilters.kind = "all";
    select.value = activeKindFilter();
    select.className = `kind-filter-select kind-filter-${safeClass(select.value)}`;
  }

  function installCategoryFilter() {
    populateCategoryFilter = function stablePopulateCategoryFilter() {
      const select = document.getElementById("filterCategory");
      if (!select) return;
      const current = analysisFilters.category;
      const opts = [`<option value="all">All</option>`].concat(
        state.analyses.categories
          .filter((c) => String(c.code || "").toUpperCase() !== "Q")
          .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.code ? `${c.code}. ${c.name}` : c.name)}</option>`)
      );
      select.innerHTML = opts.join("");
      if (current === "all" || state.analyses.categories.some((c) => c.id === current)) {
        select.value = current;
      } else {
        select.value = "all";
        analysisFilters.category = "all";
      }
    };
  }

  function installPlanCodeDetector() {
    detectPlanCategoryCodes = function stableDetectPlanCategoryCodes(markdown) {
      const lines = String(markdown || "").split("\n");
      const codes = [];
      let inSection = false;
      for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("## ")) {
          inSection = /^##\s+4\.\s/.test(line);
          continue;
        }
        if (inSection && line.startsWith("### ")) {
          const m = line.slice(4).match(/^([A-Za-z])\.\s+/);
          if (m && m[1].toUpperCase() !== "Q") codes.push(m[1].toUpperCase());
        }
      }
      return codes;
    };
  }

  function singleValueLatestLine(item) {
    const latest = latestUpdate(item);
    if (!latest?.value) return "";
    const age = isBirthDate(item) ? calcAge(latest.value) : null;
    return `
      <span class="latest-update" title="Saved value">${escapeHtml(latest.value)}</span>
      ${age !== null ? `<span class="latest-update computed-age">Age: ${age}</span>` : ""}
    `;
  }

  function renderSingleValueDetails(item, latest) {
    const input = `<input name="value" type="${inputType(item)}" ${inputAttrs(item)} placeholder="${escapeHtml(valueHint(item))}" value="" required />`;
    if (latest?.value) {
      return `
        <div class="single-value-panel">
          <div class="single-value-summary">
            <div>
              <span>Saved value</span>
              <strong>${escapeHtml(latest.value)}</strong>
            </div>
            <button type="button" class="secondary-dark" data-single-action="edit">Edit value</button>
          </div>
        </div>
      `;
    }
    return `
      <form class="single-value-form" data-action="single-value-add" data-item-id="${escapeHtml(item.id)}">
        ${input}
        <button type="submit">Save value</button>
      </form>
    `;
  }

  function renderStableItemRow(item) {
    const isOpen = expandedItems.has(item.id);
    const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
    const priorityMeta = PRIORITY_META[item.priority || "none"];
    const meta = kindMeta(item.kind);
    const updates = Array.isArray(item.updates) ? item.updates : [];
    const latest = latestUpdate(item);
    const single = isSingleValueItem(item);
    const kind = item.kind || "questionnaire";
    const latestLine = single
      ? singleValueLatestLine(item)
      : (latest
        ? `<span class="latest-update" title="${escapeHtml(latest.notes || "")}">${escapeHtml(latest.date || latest.createdAt.slice(0, 10))}: ${escapeHtml(latest.value || "(no value)")}</span>`
        : "");

    const detailFields = [];
    if (!single && meta.cost) {
      detailFields.push(`<label>Cost
        <select data-action="update" data-field="cost">
          ${COST_OPTIONS.map((o) => `<option value="${o.value}" ${item.cost === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
        </select>
      </label>`);
    }
    if (!single && meta.invasiveness) {
      detailFields.push(`<label>Invasiveness
        <select data-action="update" data-field="invasiveness">
          ${INVASIVENESS_OPTIONS.map((o) => `<option value="${o.value}" ${item.invasiveness === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
        </select>
      </label>`);
    }
    if (!single && meta.actionability) {
      detailFields.push(`<label>Actionability 1-5
        <input type="number" min="1" max="5" step="1" value="${escapeHtml(item.actionability || "")}" data-action="update" data-field="actionability" />
      </label>`);
    }
    if (!single && meta.targetDate) {
      detailFields.push(`<label>Target date
        <input type="date" value="${escapeHtml(item.targetDate || "")}" data-action="update" data-field="targetDate" />
      </label>`);
    }

    const detailsGrid = detailFields.length
      ? `<div class="item-details-grid">${detailFields.join("")}</div>`
      : "";

    const updatesList = updates.length
      ? `<ul class="updates-list">${updates.slice().reverse().map((u) => `
          <li class="update-row">
            <span class="update-date">${escapeHtml(u.date || (u.createdAt || "").slice(0, 10))}</span>
            <span class="update-value">${escapeHtml(u.value || "")}</span>
            ${u.notes ? `<span class="update-notes">${escapeHtml(u.notes)}</span>` : ""}
          </li>`).join("")}</ul>`
      : `<p class="muted small-pad updates-empty">No updates logged yet.</p>`;

    const today = new Date().toISOString().slice(0, 10);
    const valueHintText = escapeHtml(meta.valueHint || "value");
    const details = single
      ? renderSingleValueDetails(item, latest)
      : `
          ${detailsGrid}
          <label class="full-width">Notes
            <textarea rows="2" data-action="update" data-field="notes" placeholder="Context, where to do it, real cost, observations...">${escapeHtml(item.notes || "")}</textarea>
          </label>
          <div class="updates-block">
            <div class="updates-head">Updates <span class="muted">(${updates.length})</span></div>
            ${updatesList}
            <form class="add-update-form" data-action="add-update" data-item-id="${escapeHtml(item.id)}">
              <input name="date" type="date" value="${today}" required />
              <input name="value" type="text" placeholder="${valueHintText}" />
              <input name="notes" type="text" placeholder="Optional notes" />
              <button type="submit">+ Add update</button>
            </form>
          </div>
        `;

    return `
      <li class="analysis-item ${isOpen ? "open" : ""} ${single ? "single-value-item" : ""}" data-item-id="${escapeHtml(item.id)}" data-kind="${escapeHtml(kind)}">
        <div class="item-row">
          <span class="status-dot ${statusMeta.className}" aria-hidden="true"></span>
          <button type="button" class="item-name" data-action="toggle-item">${escapeHtml(item.name)}</button>
          <span class="kind-chip kind-chip-${escapeHtml(safeClass(kind))}" title="Field type">${escapeHtml(meta.label)}</span>
          ${single ? "" : `<select class="inline-select priority ${priorityMeta.className}" data-action="update" data-field="priority">
            ${Object.entries(PRIORITY_META).map(([v, m]) => `<option value="${v}" ${item.priority === v || (!item.priority && v === "none") ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("")}
          </select>`}
          <select class="inline-select status ${statusMeta.className}" data-action="update" data-field="status">
            ${Object.entries(STATUS_META).map(([v, m]) => `<option value="${v}" ${item.status === v ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("")}
          </select>
          ${latestLine}
          <button type="button" class="icon-btn" data-action="toggle-item" title="Details">${isOpen ? "▴" : "▾"}</button>
        </div>
        <div class="item-details" ${isOpen ? "" : "hidden"}>
          ${details}
        </div>
      </li>
    `;
  }

  function installItemRenderer() {
    renderItemRow = renderStableItemRow;
  }

  function installCategoryGridRenderer() {
    renderCategoryGrid = function stableRenderCategoryGrid() {
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
      const categories = (filterCategory === "all"
        ? state.analyses.categories
        : state.analyses.categories.filter((c) => c.id === filterCategory)
      ).filter((c) => String(c.code || "").toUpperCase() !== "Q");
      const html = categories.map((cat) => {
        const items = state.analyses.items.filter((i) => i.categoryId === cat.id).filter((item) => {
          if (filterStatus !== "all" && item.status !== filterStatus) return false;
          if (filterPriority !== "all" && (item.priority || "none") !== filterPriority) return false;
          if (filterKind !== "all" && (item.kind || "questionnaire") !== filterKind) return false;
          if (search) {
            const hay = `${item.name} ${item.notes || ""} ${item.description || ""}`.toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        });
        if (filterKind !== "all" && items.length === 0) return "";
        return renderCategoryCard(cat, items);
      }).join("");
      grid.innerHTML = html;
    };
  }

  function installRenderAnalysesWrapper() {
    const baseRenderAnalyses = renderAnalyses;
    renderAnalyses = function stableRenderAnalyses() {
      normalizeState();
      baseRenderAnalyses();
      ensureKindFilter();
    };
  }

  function saveSingleValue(item, value) {
    const clean = String(value || "").trim();
    if (!clean) return;
    const existing = latestUpdate(item);
    item.updates = [{
      id: existing?.id || uid(),
      date: existing?.date || new Date().toISOString().slice(0, 10),
      value: clean,
      notes: "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    item.status = "done";
    item.priority = "none";
    item.updatedAt = new Date().toISOString();
    expandedItems.add(item.id);
    saveState();
  }

  function itemFromForm(form) {
    const id = form?.dataset?.itemId || form?.closest(".analysis-item")?.dataset?.itemId;
    return (state?.analyses?.items || []).find((item) => item.id === id);
  }

  function installSingleValueHandlers() {
    document.addEventListener("submit", (event) => {
      const form = event.target.closest?.("form[data-action='single-value-add'], form[data-action='single-value-edit']");
      if (!form) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const item = itemFromForm(form);
      if (!isSingleValueItem(item)) return;
      saveSingleValue(item, new FormData(form).get("value"));
    }, true);
    document.addEventListener("click", (event) => {
      const action = event.target?.dataset?.singleAction;
      if (!action) return;
      const row = event.target.closest(".analysis-item");
      const item = (state?.analyses?.items || []).find((x) => x.id === row?.dataset?.itemId);
      if (!isSingleValueItem(item)) return;
      const panel = row.querySelector(".single-value-panel");
      const latest = latestUpdate(item);
      if (action === "edit" && panel && latest) {
        event.preventDefault();
        panel.innerHTML = `
          <form class="single-value-edit-form" data-action="single-value-edit" data-item-id="${escapeHtml(item.id)}">
            <input name="value" type="${inputType(item)}" ${inputAttrs(item)} value="${escapeHtml(latest.value || "")}" placeholder="${escapeHtml(valueHint(item))}" required />
            <button type="submit">Save</button>
            <button type="button" class="secondary-dark" data-single-action="cancel">Cancel</button>
          </form>
        `;
        panel.querySelector("input")?.focus();
      }
      if (action === "cancel") {
        event.preventDefault();
        renderAnalyses();
      }
    }, true);
  }

  function installStyles() {
    if (document.getElementById("analysesStableV2Styles")) return;
    const style = document.createElement("style");
    style.id = "analysesStableV2Styles";
    style.textContent = `
      .analysis-item { padding: 0 !important; overflow: hidden; background: #ffffff; }
      .analysis-item > .item-row { position: relative; display: flex; align-items: center; gap: 7px 8px; padding: 10px 12px 9px 16px !important; border-bottom: 1px solid rgba(223, 228, 238, 0.9); background: linear-gradient(90deg, #f8fbff 0%, #ffffff 58%); }
      .analysis-item > .item-row::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); opacity: 0.72; }
      .analysis-item .status-dot { order: 0; margin-top: 0 !important; align-self: center; flex: 0 0 auto; }
      .analysis-item .item-name { order: 1; flex: 1 1 calc(100% - 58px) !important; min-width: 0; padding: 0 !important; margin: 0 !important; font-size: clamp(1.02rem, 1.6vw, 1.2rem) !important; line-height: 1.18; font-weight: 850 !important; color: #111827; letter-spacing: -0.015em; }
      .analysis-item .icon-btn { order: 2; margin: 0 !important; padding: 2px 6px !important; align-self: center; flex: 0 0 auto; }
      .analysis-item .kind-chip { order: 3; margin-left: 18px; }
      .analysis-item .inline-select.status { order: 4; }
      .analysis-item .inline-select.priority { order: 5; }
      .analysis-item .latest-update { order: 6; }
      .analysis-item .kind-chip, .analysis-item .latest-update, .analysis-item .inline-select { margin-top: 0 !important; }
      .analysis-item .item-details { margin-top: 0; padding: 10px 12px 12px !important; border-top: 0 !important; background: #ffffff; }
      .analysis-item .updates-block { border-top: 0 !important; padding-top: 2px !important; margin-top: 0 !important; }
      .analysis-item .updates-head { padding-top: 0 !important; margin-top: 0 !important; }
      .analysis-item .add-update-form { margin-top: 8px !important; }
      .computed-age { background: #effaf3; color: #047a44; }
      .single-value-form, .single-value-edit-form { display: grid; grid-template-columns: minmax(150px, 1fr) auto; gap: 10px; align-items: center; }
      .single-value-edit-form { grid-template-columns: minmax(150px, 1fr) auto auto; }
      .single-value-summary { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; background: #fbfcff; }
      .single-value-summary span { display: block; color: var(--muted); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 850; }
      .single-value-summary strong { display: block; margin-top: 3px; color: #111827; font-size: 1.05rem; }
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
      @media (max-width: 620px) { .single-value-form, .single-value-edit-form, .single-value-summary { grid-template-columns: 1fr; } }
      @media (max-width: 560px) { .analysis-item > .item-row { padding: 9px 10px 8px 14px !important; gap: 6px; } .analysis-item .item-name { font-size: 1.05rem !important; } .analysis-item .kind-chip { margin-left: 16px; } .analysis-item .inline-select.status { min-width: 0; flex: 1 1 150px; } }
    `;
    document.head.appendChild(style);
  }

  normalizeSeedCatalog();
  normalizeState();
  ensureKindFilterState();
  installStyles();
  installCategoryFilter();
  installPlanCodeDetector();
  installItemRenderer();
  installCategoryGridRenderer();
  installRenderAnalysesWrapper();
  installSingleValueHandlers();

  document.addEventListener("DOMContentLoaded", () => {
    normalizeState();
    ensureKindFilter();
    if (typeof renderAnalyses === "function") renderAnalyses();
  });
})();
