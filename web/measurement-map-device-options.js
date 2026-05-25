(() => {
  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
  }

  function itemFor(deviceId) {
    const state = readState();
    const item = Array.isArray(state.items) ? state.items.find((entry) => entry.id === deviceId) : null;
    return { state, item };
  }

  function optionsFor(item) {
    if (!item) return [];
    if (!Array.isArray(item.deviceOptions)) item.deviceOptions = [];
    return item.deviceOptions;
  }

  function numberValue(value) {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function scoreOption(option) {
    const quality = numberValue(option.quality);
    const accuracy = numberValue(option.accuracy);
    const ease = numberValue(option.ease);
    const exportScore = numberValue(option.dataExport);
    const availability = numberValue(option.availability);
    const privacy = numberValue(option.privacy);
    const total = quality * 2 + accuracy * 2 + ease + exportScore + availability + privacy;
    return Math.round(total * 10) / 10;
  }

  function sortedOptions(item) {
    return [...optionsFor(item)].sort((a, b) => {
      if (!!b.selected !== !!a.selected) return b.selected ? 1 : -1;
      return scoreOption(b) - scoreOption(a);
    });
  }

  function selectedOption(item) {
    const options = sortedOptions(item);
    return options.find((option) => option.selected) || options[0] || null;
  }

  function formatCost(option) {
    if (!option) return "";
    const cost = String(option.cost ?? "").trim();
    if (!cost) return "Cost pending";
    const currency = String(option.currency || "€").trim();
    return `${currency}${cost}`;
  }

  function updateTitleChip(card) {
    const deviceId = card?.dataset?.mapId;
    if (!deviceId) return;
    const { item } = itemFor(deviceId);
    const title = card.querySelector(".map-title");
    if (!title || !item) return;

    title.querySelectorAll(".best-device-cost-chip").forEach((node) => node.remove());
    const option = selectedOption(item);
    if (!option) return;

    const chip = document.createElement("span");
    chip.className = "map-chip best-device-cost-chip";
    const label = option.selected ? "Selected" : "Top";
    chip.textContent = `${label}: ${formatCost(option)}`;
    chip.title = `${option.name || "Device option"} · Score ${scoreOption(option)}`;
    title.appendChild(chip);
  }

  function renderOptions(deviceId) {
    const { state, item } = itemFor(deviceId);
    const holder = document.querySelector(`.device-options-editor[data-device-options-for='${CSS.escape(deviceId)}']`);
    if (!holder || !item) return;
    const options = sortedOptions(item);
    const selected = selectedOption(item);

    holder.innerHTML = `
      <div class="device-options-summary">
        <div>
          <strong>${selected ? escapeHtml(selected.name || "Selected option") : "No option selected yet"}</strong>
          <span>${selected ? `${escapeHtml(formatCost(selected))} · Score ${scoreOption(selected)}` : "Add options to compare price, quality and usage."}</span>
        </div>
        <button type="button" class="secondary-dark add-device-option-btn" data-device-id="${escapeHtml(deviceId)}">+ Add option</button>
      </div>
      ${options.length ? `
        <div class="device-options-table" role="table" aria-label="Device comparison options">
          <div class="device-option-row header" role="row">
            <span>Name</span><span>Cost</span><span>Quality</span><span>Accuracy</span><span>Ease</span><span>Export</span><span>Availability</span><span>Privacy</span><span>Score</span><span>Best</span>
          </div>
          ${options.map((option) => renderOptionRow(deviceId, option)).join("")}
        </div>
      ` : `<p class="device-options-empty">No options yet. Add candidates here as you research devices, services or tests.</p>`}
      <div class="device-option-form hidden" data-device-option-form="${escapeHtml(deviceId)}">
        <input data-option-field="name" placeholder="Option/model/provider name">
        <input data-option-field="cost" placeholder="Cost" inputmode="decimal">
        <input data-option-field="currency" placeholder="€" value="€">
        <input data-option-field="quality" placeholder="Quality 1–5" inputmode="decimal">
        <input data-option-field="accuracy" placeholder="Accuracy 1–5" inputmode="decimal">
        <input data-option-field="ease" placeholder="Ease 1–5" inputmode="decimal">
        <input data-option-field="dataExport" placeholder="Export 1–5" inputmode="decimal">
        <input data-option-field="availability" placeholder="Availability 1–5" inputmode="decimal">
        <input data-option-field="privacy" placeholder="Privacy 1–5" inputmode="decimal">
        <input data-option-field="url" placeholder="Link / source optional">
        <textarea data-option-field="notes" placeholder="Notes: why this option is good/bad"></textarea>
        <button type="button" class="save-device-option-btn" data-device-id="${escapeHtml(deviceId)}">Save option</button>
      </div>
    `;

    updateTitleChip(document.querySelector(`#measurementMap .map-card[data-map-id='${CSS.escape(deviceId)}']`));
  }

  function renderOptionRow(deviceId, option) {
    const score = scoreOption(option);
    return `
      <div class="device-option-row" role="row" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">
        <input data-existing-option-field="name" value="${escapeHtml(option.name || "")}" placeholder="Name">
        <input data-existing-option-field="cost" value="${escapeHtml(option.cost || "")}" placeholder="Cost" inputmode="decimal">
        <input data-existing-option-field="quality" value="${escapeHtml(option.quality || "")}" placeholder="1–5" inputmode="decimal">
        <input data-existing-option-field="accuracy" value="${escapeHtml(option.accuracy || "")}" placeholder="1–5" inputmode="decimal">
        <input data-existing-option-field="ease" value="${escapeHtml(option.ease || "")}" placeholder="1–5" inputmode="decimal">
        <input data-existing-option-field="dataExport" value="${escapeHtml(option.dataExport || "")}" placeholder="1–5" inputmode="decimal">
        <input data-existing-option-field="availability" value="${escapeHtml(option.availability || "")}" placeholder="1–5" inputmode="decimal">
        <input data-existing-option-field="privacy" value="${escapeHtml(option.privacy || "")}" placeholder="1–5" inputmode="decimal">
        <strong>${score}</strong>
        <div class="option-actions">
          <button type="button" class="select-device-option-btn ${option.selected ? "selected" : ""}" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">${option.selected ? "Selected" : "Select"}</button>
          <button type="button" class="delete-device-option-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">×</button>
        </div>
        <textarea class="option-notes" data-existing-option-field="notes" placeholder="Notes">${escapeHtml(option.notes || "")}</textarea>
      </div>`;
  }

  function renderAllOptions() {
    document.querySelectorAll(".device-options-editor[data-device-options-for]").forEach((holder) => {
      renderOptions(holder.dataset.deviceOptionsFor);
    });
    document.querySelectorAll("#measurementMap .map-card").forEach(updateTitleChip);
  }

  function mutateOption(deviceId, optionId, mutator) {
    const { state, item } = itemFor(deviceId);
    if (!item) return;
    const options = optionsFor(item);
    const option = options.find((entry) => entry.id === optionId);
    if (!option) return;
    mutator(option, options);
    writeState(state);
    renderOptions(deviceId);
  }

  function installEvents() {
    if (window.__measurementMapDeviceOptionsEventsInstalled) return;
    window.__measurementMapDeviceOptionsEventsInstalled = true;

    document.addEventListener("click", (event) => {
      const add = event.target.closest?.(".add-device-option-btn");
      if (add) {
        const form = document.querySelector(`.device-option-form[data-device-option-form='${CSS.escape(add.dataset.deviceId)}']`);
        form?.classList.toggle("hidden");
        return;
      }

      const save = event.target.closest?.(".save-device-option-btn");
      if (save) {
        const deviceId = save.dataset.deviceId;
        const { state, item } = itemFor(deviceId);
        const form = document.querySelector(`.device-option-form[data-device-option-form='${CSS.escape(deviceId)}']`);
        if (!item || !form) return;
        const option = { id: uid(), selected: false };
        form.querySelectorAll("[data-option-field]").forEach((input) => {
          option[input.dataset.optionField] = input.value?.trim() || "";
        });
        if (!option.name && !option.cost) return alert("Add at least a name or cost for this option.");
        optionsFor(item).push(option);
        writeState(state);
        renderOptions(deviceId);
        return;
      }

      const select = event.target.closest?.(".select-device-option-btn");
      if (select) {
        mutateOption(select.dataset.deviceId, select.dataset.optionId, (_option, options) => {
          options.forEach((entry) => { entry.selected = entry.id === select.dataset.optionId; });
        });
        return;
      }

      const del = event.target.closest?.(".delete-device-option-btn");
      if (del) {
        const { state, item } = itemFor(del.dataset.deviceId);
        if (!item) return;
        item.deviceOptions = optionsFor(item).filter((entry) => entry.id !== del.dataset.optionId);
        writeState(state);
        renderOptions(del.dataset.deviceId);
      }
    }, true);

    document.addEventListener("input", (event) => {
      const input = event.target.closest?.("[data-existing-option-field]");
      if (!input) return;
      const row = input.closest(".device-option-row[data-device-id][data-option-id]");
      if (!row) return;
      clearTimeout(input._deviceOptionTimer);
      input._deviceOptionTimer = setTimeout(() => {
        mutateOption(row.dataset.deviceId, row.dataset.optionId, (option) => {
          option[input.dataset.existingOptionField] = input.value;
        });
      }, 350);
    }, true);
  }

  function installStyles() {
    if (document.getElementById("measurementMapDeviceOptionsStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapDeviceOptionsStyles";
    style.textContent = `
      #measurementMap .best-device-cost-chip {
        background: #f5f3ff;
        color: #6d28d9;
        border: 1px solid #ddd6fe;
      }
      #measurementMap .device-options-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        border: 1px solid #e9d5ff;
        background: #ffffff;
        border-radius: 15px;
        padding: 10px;
        margin: 10px 0;
      }
      #measurementMap .device-options-summary strong,
      #measurementMap .device-options-summary span {
        display: block;
      }
      #measurementMap .device-options-summary span {
        color: #64748b;
        font-size: 0.86rem;
        margin-top: 2px;
      }
      #measurementMap .device-options-table {
        display: grid;
        gap: 7px;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      #measurementMap .device-option-row {
        display: grid;
        grid-template-columns: minmax(150px, 1.4fr) 82px repeat(6, 76px) 56px 116px;
        gap: 6px;
        align-items: center;
        min-width: 980px;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 7px;
      }
      #measurementMap .device-option-row.header {
        background: #f8fafc;
        color: #64748b;
        font-size: 0.76rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      #measurementMap .device-option-row input,
      #measurementMap .device-option-row textarea,
      #measurementMap .device-option-form input,
      #measurementMap .device-option-form textarea {
        min-width: 0;
        width: 100%;
        border: 1px solid #dbe5f3;
        border-radius: 9px;
        padding: 7px 8px;
        font: inherit;
        font-size: 0.83rem;
        background: #ffffff;
      }
      #measurementMap .device-option-row .option-notes {
        grid-column: 1 / -1;
        min-height: 46px;
      }
      #measurementMap .option-actions {
        display: flex;
        gap: 5px;
      }
      #measurementMap .select-device-option-btn,
      #measurementMap .delete-device-option-btn {
        border: 1px solid #dbe5f3;
        border-radius: 10px;
        padding: 7px 8px;
        font: inherit;
        font-size: 0.8rem;
        font-weight: 850;
        background: #ffffff;
        color: #334155;
      }
      #measurementMap .select-device-option-btn.selected {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
      }
      #measurementMap .delete-device-option-btn {
        color: #b91c1c;
      }
      #measurementMap .device-option-form {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
        border-top: 1px dashed #dbe5f3;
        padding-top: 10px;
      }
      #measurementMap .device-option-form.hidden {
        display: none;
      }
      #measurementMap .device-option-form textarea {
        grid-column: 1 / -1;
        min-height: 60px;
      }
      #measurementMap .device-options-empty {
        margin: 8px 0 0;
        color: #64748b;
      }
      @media (max-width: 700px) {
        #measurementMap .device-options-summary,
        #measurementMap .device-option-form {
          grid-template-columns: 1fr;
        }
        #measurementMap .device-options-summary {
          display: grid;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    installStyles();
    installEvents();
    [0, 300, 900, 1800].forEach((delay) => setTimeout(renderAllOptions, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(renderAllOptions, 50));
  window.addEventListener("measurementMapSeedUpdated", () => setTimeout(renderAllOptions, 80));
  init();
})();
