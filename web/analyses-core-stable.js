(() => {
  const SINGLE_VALUE_NAMES = new Set([
    "birth date",
    "height",
    "weight",
    "waist circumference",
    "hip circumference"
  ]);

  function norm(value) {
    return String(value || "").trim().toLowerCase();
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
    if (isBirthDate(item)) return "date";
    return "number";
  }

  function inputAttrs(item) {
    if (isBirthDate(item)) return "";
    return `inputmode="decimal" step="0.1"`;
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
      const qIndex = ANALYSES_SEED_CATALOG.findIndex((c) => c.code === "Q");
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
          item.kind = "personal_fact";
          item.priority = "none";
          item.notes = "";
          item.cost = "";
          item.invasiveness = "";
          item.actionability = "";
          item.targetDate = "";
          const latest = latestUpdate(item);
          if (latest?.value && item.status !== "done") {
            item.status = "done";
            changed = true;
          }
        }
      }
      if (changed && typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      console.warn("State normalization skipped", error);
    }
    return changed;
  }

  function singleValueLatestLine(item, statusMeta) {
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

  function renderCoreItemRow(item) {
    const isOpen = expandedItems.has(item.id);
    const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
    const priorityMeta = PRIORITY_META[item.priority || "none"];
    const meta = kindMeta(item.kind);
    const updates = Array.isArray(item.updates) ? item.updates : [];
    const latest = latestUpdate(item);
    const single = isSingleValueItem(item);
    const latestLine = single
      ? singleValueLatestLine(item, statusMeta)
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
      <li class="analysis-item ${isOpen ? "open" : ""} ${single ? "single-value-item" : ""}" data-item-id="${escapeHtml(item.id)}" data-kind="${escapeHtml(item.kind || "questionnaire")}">
        <div class="item-row">
          <span class="status-dot ${statusMeta.className}" aria-hidden="true"></span>
          <button type="button" class="item-name" data-action="toggle-item">${escapeHtml(item.name)}</button>
          <span class="kind-chip kind-chip-${escapeHtml(item.kind || "questionnaire")}" title="Field type">${escapeHtml(meta.label)}</span>
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

  function installRenderer() {
    try {
      renderItemRow = renderCoreItemRow;
    } catch (error) {
      console.warn("Could not replace analysis renderer", error);
    }
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
    if (document.getElementById("analysesCoreStableStyles")) return;
    const style = document.createElement("style");
    style.id = "analysesCoreStableStyles";
    style.textContent = `
      .single-value-item .item-details {
        padding-top: 8px !important;
      }
      .single-value-form,
      .single-value-edit-form {
        display: grid;
        grid-template-columns: minmax(150px, 1fr) auto;
        gap: 10px;
        align-items: center;
      }
      .single-value-edit-form {
        grid-template-columns: minmax(150px, 1fr) auto auto;
      }
      .single-value-summary {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 10px 12px;
        background: #fbfcff;
      }
      .single-value-summary span {
        display: block;
        color: var(--muted);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 850;
      }
      .single-value-summary strong {
        display: block;
        margin-top: 3px;
        color: #111827;
        font-size: 1.05rem;
      }
      @media (max-width: 620px) {
        .single-value-form,
        .single-value-edit-form,
        .single-value-summary {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  normalizeSeedCatalog();
  normalizeState();
  installStyles();
  installRenderer();
  installSingleValueHandlers();
  document.addEventListener("DOMContentLoaded", () => {
    normalizeState();
    if (typeof renderAnalyses === "function") renderAnalyses();
  });
})();
