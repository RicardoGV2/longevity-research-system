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

  function productSearchUrl(option) {
    const name = String(option?.name || "device").trim() || "device";
    return option?.url || `https://www.google.com/search?q=${encodeURIComponent(`${name} buy Ireland`)}`;
  }

  function imageSearchUrl(option) {
    const name = String(option?.name || "device").trim() || "device";
    return option?.imageSearchUrl || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${name} product photo`)}`;
  }

  function seedMissingLinks(item) {
    let changed = false;
    optionsFor(item).forEach((option) => {
      if (!String(option.url || "").trim()) {
        option.url = productSearchUrl(option);
        changed = true;
      }
      if (!String(option.imageSearchUrl || "").trim()) {
        option.imageSearchUrl = imageSearchUrl(option);
        changed = true;
      }
    });
    return changed;
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

  function fieldInput(label, field, value, placeholder = "1–5", inputmode = "decimal") {
    return `
      <label class="option-field">
        <span>${escapeHtml(label)}</span>
        <input data-existing-option-field="${escapeHtml(field)}" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" inputmode="${escapeHtml(inputmode)}">
      </label>
    `;
  }

  function renderOptions(deviceId) {
    const { state, item } = itemFor(deviceId);
    const holder = document.querySelector(`.device-options-editor[data-device-options-for='${CSS.escape(deviceId)}']`);
    if (!holder || !item) return;

    if (seedMissingLinks(item)) writeState(state);

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
        <div class="device-options-list" role="list" aria-label="Device comparison options">
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
        <input data-option-field="url" placeholder="Where to find it / source link">
        <input data-option-field="imageUrl" placeholder="Product photo URL">
        <textarea data-option-field="notes" placeholder="Notes: why this option is good/bad"></textarea>
        <button type="button" class="save-device-option-btn" data-device-id="${escapeHtml(deviceId)}">Save option</button>
      </div>
    `;

    updateTitleChip(document.querySelector(`#measurementMap .map-card[data-map-id='${CSS.escape(deviceId)}']`));
  }

  function renderOptionRow(deviceId, option) {
    const score = scoreOption(option);
    const url = productSearchUrl(option);
    const photoSearch = imageSearchUrl(option);
    const imageUrl = String(option.imageUrl || "").trim();
    return `
      <article class="device-option-card" role="listitem" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">
        <div class="device-option-card-head">
          <div class="option-photo-preview ${imageUrl ? "has-image" : ""}">
            ${imageUrl ? `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(option.name || "Device option")}">` : `<span>No product photo</span>`}
          </div>
          <div class="option-title-block">
            <label class="option-field option-name-field">
              <span>Name</span>
              <input data-existing-option-field="name" value="${escapeHtml(option.name || "")}" placeholder="Name / model / provider">
            </label>
            <div class="option-meta-row">
              <strong>${escapeHtml(formatCost(option))}</strong>
              <span>Score ${score}</span>
              ${option.selected ? `<em>Selected</em>` : ""}
            </div>
          </div>
          <div class="option-actions">
            <button type="button" class="select-device-option-btn ${option.selected ? "selected" : ""}" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">${option.selected ? "Selected" : "Select"}</button>
            <button type="button" class="delete-device-option-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">×</button>
          </div>
        </div>

        <div class="option-metric-grid">
          ${fieldInput("Cost", "cost", option.cost, "Cost", "decimal")}
          ${fieldInput("Quality", "quality", option.quality)}
          ${fieldInput("Accuracy", "accuracy", option.accuracy)}
          ${fieldInput("Ease", "ease", option.ease)}
          ${fieldInput("Export", "dataExport", option.dataExport)}
          ${fieldInput("Availability", "availability", option.availability)}
          ${fieldInput("Privacy", "privacy", option.privacy)}
          <div class="option-score-box"><span>Score</span><strong>${score}</strong></div>
        </div>

        <div class="option-source-grid">
          <label class="option-field">
            <span>Where to find it</span>
            <input data-existing-option-field="url" value="${escapeHtml(url)}" placeholder="Product/store/source link">
          </label>
          <label class="option-field">
            <span>Product photo URL</span>
            <input data-existing-option-field="imageUrl" value="${escapeHtml(imageUrl)}" placeholder="Paste image URL">
          </label>
        </div>

        <div class="option-link-actions">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open link</a>
          <a class="secondary-link" href="${escapeHtml(photoSearch)}" target="_blank" rel="noopener noreferrer">Find photo</a>
          <button type="button" class="paste-option-photo-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">Paste photo URL</button>
          ${imageUrl ? `<button type="button" class="use-option-photo-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(option.id)}">Use as card photo</button>` : ""}
        </div>

        <label class="option-field option-notes-field">
          <span>Notes</span>
          <textarea class="option-notes" data-existing-option-field="notes" placeholder="Notes">${escapeHtml(option.notes || "")}</textarea>
        </label>
      </article>`;
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
    mutator(option, options, item);
    writeState(state);
    renderOptions(deviceId);
  }

  function updateCardPhoto(deviceId, imageUrl, alt) {
    const card = document.querySelector(`#measurementMap .map-card[data-map-id='${CSS.escape(deviceId)}']`);
    const photo = card?.querySelector(".map-photo");
    if (photo && imageUrl) {
      photo.classList.remove("map-starter-photo");
      photo.innerHTML = `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt || "Device photo")}">`;
    }
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
        const option = { id: uid(), selected: false, currency: "€" };
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
        return;
      }

      const pastePhoto = event.target.closest?.(".paste-option-photo-btn");
      if (pastePhoto) {
        const url = prompt("Paste the product image URL:");
        if (url) {
          mutateOption(pastePhoto.dataset.deviceId, pastePhoto.dataset.optionId, (option) => {
            option.imageUrl = url.trim();
          });
        }
        return;
      }

      const usePhoto = event.target.closest?.(".use-option-photo-btn");
      if (usePhoto) {
        mutateOption(usePhoto.dataset.deviceId, usePhoto.dataset.optionId, (option, _options, item) => {
          if (!option.imageUrl) return;
          item.photoUrl = option.imageUrl;
          item.photo = option.imageUrl;
          updateCardPhoto(usePhoto.dataset.deviceId, option.imageUrl, option.name || item.name);
        });
      }
    }, true);

    document.addEventListener("input", (event) => {
      const input = event.target.closest?.("[data-existing-option-field]");
      if (!input) return;
      const row = input.closest("[data-device-id][data-option-id]");
      if (!row) return;
      clearTimeout(input._deviceOptionTimer);
      input._deviceOptionTimer = setTimeout(() => {
        mutateOption(row.dataset.deviceId, row.dataset.optionId, (option) => {
          option[input.dataset.existingOptionField] = input.value;
        });
      }, 450);
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
      #measurementMap .device-options-summary span { display: block; }
      #measurementMap .device-options-summary span { color: #64748b; font-size: 0.86rem; margin-top: 2px; }

      #measurementMap .device-options-list {
        display: grid;
        gap: 12px;
        padding-bottom: 4px;
      }

      #measurementMap .device-option-card {
        display: grid;
        gap: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 17px;
        background: #ffffff;
        padding: 11px;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
      }

      #measurementMap .device-option-card-head {
        display: grid;
        grid-template-columns: 82px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
      }

      #measurementMap .option-photo-preview {
        width: 78px;
        height: 78px;
        border-radius: 13px;
        border: 1px dashed #bfdbfe;
        background: #eff6ff;
        display: grid;
        place-items: center;
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 850;
        text-align: center;
        overflow: hidden;
      }

      #measurementMap .option-photo-preview.has-image { border-style: solid; background: #ffffff; }
      #measurementMap .option-photo-preview img { width: 100%; height: 100%; object-fit: contain; }

      #measurementMap .option-title-block { display: grid; gap: 6px; min-width: 0; }
      #measurementMap .option-meta-row { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; color: #64748b; font-size: 0.82rem; font-weight: 850; }
      #measurementMap .option-meta-row strong { color: #6d28d9; }
      #measurementMap .option-meta-row em { color: #047857; background: #ecfdf5; border-radius: 999px; padding: 3px 8px; font-style: normal; }

      #measurementMap .option-metric-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      #measurementMap .option-source-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      #measurementMap .option-field {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      #measurementMap .option-field > span,
      #measurementMap .option-score-box > span {
        color: #64748b;
        font-size: 0.68rem;
        font-weight: 950;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #measurementMap .device-option-card input,
      #measurementMap .device-option-card textarea,
      #measurementMap .device-option-form input,
      #measurementMap .device-option-form textarea {
        min-width: 0;
        width: 100%;
        border: 1px solid #dbe5f3;
        border-radius: 10px;
        padding: 8px 9px;
        font: inherit;
        font-size: 0.84rem;
        background: #ffffff;
        box-sizing: border-box;
      }

      #measurementMap .option-score-box {
        display: grid;
        gap: 4px;
        align-content: end;
        border: 1px solid #e9d5ff;
        border-radius: 11px;
        background: #faf5ff;
        padding: 7px 9px;
      }

      #measurementMap .option-score-box strong { color: #6d28d9; font-size: 1rem; }

      #measurementMap .option-actions,
      #measurementMap .option-link-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      #measurementMap .select-device-option-btn,
      #measurementMap .delete-device-option-btn,
      #measurementMap .option-link-actions a,
      #measurementMap .option-link-actions button {
        border: 1px solid #dbe5f3;
        border-radius: 999px;
        padding: 7px 10px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 900;
        background: #ffffff;
        color: #334155;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
      }

      #measurementMap .select-device-option-btn.selected { background: #2563eb; border-color: #2563eb; color: #ffffff; }
      #measurementMap .delete-device-option-btn { color: #b91c1c; }
      #measurementMap .option-link-actions a { color: #1d4ed8; border-color: #bfdbfe; }
      #measurementMap .option-link-actions .secondary-link { color: #6d28d9; border-color: #ddd6fe; }
      #measurementMap .use-option-photo-btn { color: #047857 !important; border-color: #bbf7d0 !important; }

      #measurementMap .option-notes-field textarea { min-height: 54px; }

      #measurementMap .device-option-form {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 10px;
        border-top: 1px dashed #dbe5f3;
        padding-top: 10px;
      }

      #measurementMap .device-option-form.hidden { display: none; }
      #measurementMap .device-option-form textarea { grid-column: 1 / -1; min-height: 60px; }
      #measurementMap .device-options-empty { margin: 8px 0 0; color: #64748b; }

      @media (max-width: 820px) {
        #measurementMap .option-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        #measurementMap .option-source-grid { grid-template-columns: 1fr; }
      }

      @media (max-width: 700px) {
        #measurementMap .device-options-summary,
        #measurementMap .device-option-form { grid-template-columns: 1fr; }
        #measurementMap .device-options-summary { display: grid; }
        #measurementMap .device-option-card-head { grid-template-columns: 72px minmax(0, 1fr); }
        #measurementMap .option-actions { grid-column: 1 / -1; justify-content: flex-start; }
        #measurementMap .option-photo-preview { width: 68px; height: 68px; }
        #measurementMap .option-link-actions { justify-content: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    installStyles();
    installEvents();
    [0, 250, 700, 1400, 2600].forEach((delay) => setTimeout(renderAllOptions, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(renderAllOptions, 50));
  window.addEventListener("measurementMapSeedUpdated", () => setTimeout(renderAllOptions, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(renderAllOptions, 80));
  init();
})();
