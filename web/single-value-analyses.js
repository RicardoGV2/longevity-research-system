(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";
  const SINGLE_VALUE_NAMES = new Set([
    "birth date",
    "height",
    "weight",
    "waist circumference",
    "hip circumference",
    "medications",
    "supplements"
  ]);

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isSingleValueItem(item) {
    if (!item) return false;
    if (SINGLE_VALUE_NAMES.has(normalize(item.name))) return true;
    return item.kind === "personal_fact" && !/supplement|medication/i.test(item.name || "");
  }

  function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (typeof render === "function") render();
  }

  function firstOrLatestUpdate(item) {
    const updates = Array.isArray(item.updates) ? item.updates : [];
    return updates.length ? updates[updates.length - 1] : null;
  }

  function itemById(id) {
    return (state?.analyses?.items || []).find((item) => item.id === id);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function valueInputType(item) {
    const name = normalize(item?.name);
    if (name === "birth date") return "date";
    if (["height", "weight", "waist circumference", "hip circumference"].includes(name)) return "number";
    return "text";
  }

  function valueInputAttrs(item) {
    const name = normalize(item?.name);
    if (["height", "weight", "waist circumference", "hip circumference"].includes(name)) {
      return `inputmode="decimal" step="0.1"`;
    }
    return "";
  }

  function valuePlaceholder(item) {
    const name = normalize(item?.name);
    if (name === "height") return "cm";
    if (name === "weight") return "kg";
    if (name.includes("circumference")) return "cm";
    return "value";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function installStyles() {
    if (document.getElementById("singleValueAnalysesStyles")) return;
    const style = document.createElement("style");
    style.id = "singleValueAnalysesStyles";
    style.textContent = `
      .single-value-summary {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 10px 12px;
        background: #fbfcff;
        margin-top: 2px;
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
      .single-value-edit-form {
        display: grid;
        grid-template-columns: minmax(140px, 1fr) auto auto;
        gap: 8px;
        align-items: center;
        margin-top: 8px;
      }
      .single-value-edit-form input {
        width: 100%;
        min-height: 40px;
      }
      .single-value-pending .add-update-form {
        grid-template-columns: minmax(130px, 1fr) auto !important;
      }
      .single-value-pending .add-update-form input[name="date"],
      .single-value-pending .add-update-form input[name="notes"] {
        display: none !important;
      }
      @media (max-width: 620px) {
        .single-value-summary { grid-template-columns: 1fr; }
        .single-value-edit-form { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function markDoneIfAnswered(item) {
    if (!isSingleValueItem(item)) return false;
    const update = firstOrLatestUpdate(item);
    if (!update || !String(update.value || "").trim()) return false;
    let changed = false;
    if (item.status !== "done") {
      item.status = "done";
      changed = true;
    }
    if (item.priority && item.priority !== "none") {
      item.priority = "none";
      changed = true;
    }
    if (changed) item.updatedAt = new Date().toISOString();
    return changed;
  }

  function migrateSingleValues() {
    let changed = false;
    for (const item of state?.analyses?.items || []) {
      if (markDoneIfAnswered(item)) changed = true;
    }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function handleSingleValueSubmit(event) {
    const form = event.target.closest?.("form[data-action='add-update']");
    if (!form) return;
    const li = form.closest(".analysis-item");
    const item = itemById(li?.dataset?.itemId || form.dataset.itemId);
    if (!isSingleValueItem(item)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const value = String(data.get("value") || "").trim();
    if (!value) return;

    if (!Array.isArray(item.updates)) item.updates = [];
    const existing = firstOrLatestUpdate(item);
    const payload = {
      id: existing?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      date: data.get("date") || existing?.date || todayIso(),
      value,
      notes: "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    item.updates = [payload];
    item.status = "done";
    item.priority = "none";
    item.updatedAt = new Date().toISOString();
    expandedItems.add(item.id);
    saveAndRender();
  }

  function patchSingleValueCard(row) {
    const item = itemById(row.dataset.itemId);
    if (!isSingleValueItem(item)) return;
    const update = firstOrLatestUpdate(item);
    const details = row.querySelector(".item-details");
    if (!details) return;

    row.classList.add(update?.value ? "single-value-done" : "single-value-pending");

    const form = details.querySelector(".add-update-form");
    if (!form) return;

    form.querySelector("input[name='date']")?.remove();
    form.querySelector("input[name='notes']")?.remove();
    const input = form.querySelector("input[name='value']");
    if (input) {
      input.type = valueInputType(item);
      input.placeholder = valuePlaceholder(item);
      input.setAttribute("aria-label", item.name || "Value");
      const attrs = valueInputAttrs(item);
      if (attrs.includes("decimal")) {
        input.setAttribute("inputmode", "decimal");
        input.setAttribute("step", "0.1");
      }
    }

    if (!update?.value) return;

    const block = details.querySelector(".updates-block");
    if (!block) return;
    const existingSummary = block.querySelector(".single-value-summary");
    if (existingSummary) existingSummary.remove();
    const existingEdit = block.querySelector(".single-value-edit-form");
    if (existingEdit) existingEdit.remove();

    const summary = document.createElement("div");
    summary.className = "single-value-summary";
    summary.innerHTML = `
      <div><span>Saved value</span><strong>${escapeHtml(update.value)}</strong></div>
      <button type="button" class="secondary-dark" data-single-action="edit">Edit value</button>
    `;

    const updatesHead = block.querySelector(".updates-head");
    const updatesList = block.querySelector(".updates-list, .updates-empty");
    updatesHead?.classList.add("field-rules-hidden");
    updatesList?.classList.add("field-rules-hidden");
    form.classList.add("field-rules-hidden");
    block.prepend(summary);
  }

  function patchDom() {
    installStyles();
    migrateSingleValues();
    document.querySelectorAll(".analysis-item").forEach(patchSingleValueCard);
  }

  function beginEdit(row) {
    const item = itemById(row?.dataset?.itemId);
    if (!item) return;
    const update = firstOrLatestUpdate(item);
    const block = row.querySelector(".updates-block");
    const summary = row.querySelector(".single-value-summary");
    if (!block || !summary) return;

    block.querySelector(".single-value-edit-form")?.remove();
    const form = document.createElement("form");
    form.className = "single-value-edit-form";
    form.dataset.singleAction = "saveEdit";
    form.innerHTML = `
      <input name="value" type="${valueInputType(item)}" ${valueInputAttrs(item)} value="${escapeHtml(update?.value || "")}" placeholder="${escapeHtml(valuePlaceholder(item))}" required />
      <button type="submit">Save</button>
      <button type="button" class="secondary-dark" data-single-action="cancel">Cancel</button>
    `;
    summary.insertAdjacentElement("afterend", form);
    summary.classList.add("field-rules-hidden");
    form.querySelector("input")?.focus();
  }

  function saveEdit(row, form) {
    const item = itemById(row?.dataset?.itemId);
    if (!item) return;
    const value = String(new FormData(form).get("value") || "").trim();
    if (!value) return;
    const existing = firstOrLatestUpdate(item);
    item.updates = [{
      id: existing?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      date: existing?.date || todayIso(),
      value,
      notes: "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    item.status = "done";
    item.priority = "none";
    item.updatedAt = new Date().toISOString();
    expandedItems.add(item.id);
    saveAndRender();
  }

  document.addEventListener("submit", (event) => {
    const editForm = event.target.closest?.(".single-value-edit-form");
    if (editForm) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      saveEdit(editForm.closest(".analysis-item"), editForm);
      return;
    }
    handleSingleValueSubmit(event);
  }, true);

  document.addEventListener("click", (event) => {
    const action = event.target?.dataset?.singleAction;
    if (!action) return;
    const row = event.target.closest(".analysis-item");
    if (action === "edit") beginEdit(row);
    if (action === "cancel") {
      row?.querySelector(".single-value-edit-form")?.remove();
      row?.querySelector(".single-value-summary")?.classList.remove("field-rules-hidden");
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    [150, 700, 1400].forEach((delay) => setTimeout(patchDom, delay));
  });

  const originalRenderPatch = () => setTimeout(patchDom, 0);
  document.addEventListener("click", (event) => {
    if (event.target.closest("#analyses")) originalRenderPatch();
  });
  document.addEventListener("change", (event) => {
    if (event.target.closest("#analyses")) originalRenderPatch();
  });
})();
