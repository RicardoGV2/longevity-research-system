(() => {
  const KEY = "longevityResearchSystem.measurementMap.v0.1";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch { return {}; }
  }

  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
  }

  function findOption(deviceId, optionId) {
    const state = readState();
    const item = Array.isArray(state.items) ? state.items.find((entry) => entry.id === deviceId) : null;
    const option = item?.deviceOptions?.find?.((entry) => entry.id === optionId);
    return { state, item, option };
  }

  function searchUrl(optionName) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${optionName} buy Ireland`)}`;
  }

  function imageSearchUrl(optionName) {
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${optionName} product photo`)}`;
  }

  function seedLinks() {
    const state = readState();
    const items = Array.isArray(state.items) ? state.items : [];
    let changed = false;

    items.forEach((item) => {
      (item.deviceOptions || []).forEach((option) => {
        const name = String(option.name || "").trim();
        if (!name) return;
        if (!option.url) {
          option.url = searchUrl(name);
          changed = true;
        }
        if (!option.imageSearchUrl) {
          option.imageSearchUrl = imageSearchUrl(name);
          changed = true;
        }
      });
    });

    if (changed) writeState(state);
  }

  function renderMedia(row) {
    const deviceId = row.dataset.deviceId;
    const optionId = row.dataset.optionId;
    const { option } = findOption(deviceId, optionId);
    if (!option) return;

    row.querySelector(".device-option-media")?.remove();

    const url = option.url || searchUrl(option.name || "device");
    const imageUrl = option.imageUrl || "";
    const imageSearch = option.imageSearchUrl || imageSearchUrl(option.name || "device");
    const media = document.createElement("div");
    media.className = "device-option-media";
    media.innerHTML = `
      <div class="option-photo-preview ${imageUrl ? "has-image" : ""}">
        ${imageUrl ? `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(option.name || "Device option")}">` : `<span>No product photo</span>`}
      </div>
      <div class="option-link-fields">
        <label>Where to find it
          <input class="option-url-field" data-option-extra-field="url" value="${escapeHtml(url)}" placeholder="Product/store link">
        </label>
        <label>Product photo URL
          <input class="option-image-url-field" data-option-extra-field="imageUrl" value="${escapeHtml(imageUrl)}" placeholder="Paste image URL">
        </label>
      </div>
      <div class="option-link-actions">
        <a class="option-open-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open</a>
        <a class="option-open-link secondary-link" href="${escapeHtml(imageSearch)}" target="_blank" rel="noopener noreferrer">Find photo</a>
        <button type="button" class="paste-option-photo-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(optionId)}">Paste photo URL</button>
        ${imageUrl ? `<button type="button" class="use-option-photo-btn" data-device-id="${escapeHtml(deviceId)}" data-option-id="${escapeHtml(optionId)}">Use as card photo</button>` : ""}
      </div>
    `;

    const notes = row.querySelector(".option-notes");
    if (notes) notes.insertAdjacentElement("beforebegin", media);
    else row.appendChild(media);
  }

  function renderAllMedia() {
    document.querySelectorAll("#measurementMap .device-option-row[data-device-id][data-option-id]").forEach(renderMedia);
  }

  function updateOption(deviceId, optionId, field, value) {
    const { state, option } = findOption(deviceId, optionId);
    if (!option) return;
    option[field] = value;
    if (field === "url" && value && !option.imageSearchUrl) option.imageSearchUrl = imageSearchUrl(option.name || "device");
    writeState(state);
  }

  function useAsCardPhoto(deviceId, optionId) {
    const { state, item, option } = findOption(deviceId, optionId);
    if (!item || !option?.imageUrl) return;
    item.photoUrl = option.imageUrl;
    item.photo = option.imageUrl;
    writeState(state);
    const card = document.querySelector(`#measurementMap .map-card[data-map-id='${CSS.escape(deviceId)}']`);
    const photo = card?.querySelector(".map-photo");
    if (photo) {
      photo.classList.remove("map-starter-photo");
      photo.innerHTML = `<img loading="lazy" src="${escapeHtml(option.imageUrl)}" alt="${escapeHtml(option.name || item.name || "Device photo")}">`;
    }
  }

  function installEvents() {
    if (window.__measurementMapOptionLinksPhotosEventsInstalled) return;
    window.__measurementMapOptionLinksPhotosEventsInstalled = true;

    document.addEventListener("input", (event) => {
      const input = event.target.closest?.("#measurementMap [data-option-extra-field]");
      if (!input) return;
      const row = input.closest(".device-option-row[data-device-id][data-option-id]");
      if (!row) return;
      clearTimeout(input._optionExtraTimer);
      input._optionExtraTimer = setTimeout(() => {
        updateOption(row.dataset.deviceId, row.dataset.optionId, input.dataset.optionExtraField, input.value.trim());
        renderMedia(row);
      }, 450);
    }, true);

    document.addEventListener("click", (event) => {
      const paste = event.target.closest?.(".paste-option-photo-btn");
      if (paste) {
        const url = prompt("Paste the product image URL:");
        if (url) {
          updateOption(paste.dataset.deviceId, paste.dataset.optionId, "imageUrl", url.trim());
          const row = paste.closest(".device-option-row");
          if (row) renderMedia(row);
        }
        return;
      }

      const use = event.target.closest?.(".use-option-photo-btn");
      if (use) {
        useAsCardPhoto(use.dataset.deviceId, use.dataset.optionId);
      }
    }, true);
  }

  function installStyles() {
    if (document.getElementById("measurementMapOptionLinksPhotosStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapOptionLinksPhotosStyles";
    style.textContent = `
      #measurementMap .device-option-media {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: 88px minmax(280px, 1fr) auto;
        gap: 10px;
        align-items: center;
        border: 1px solid #e0e7ff;
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
        border-radius: 13px;
        padding: 8px;
      }

      #measurementMap .option-photo-preview {
        width: 78px;
        height: 78px;
        border-radius: 12px;
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

      #measurementMap .option-photo-preview.has-image {
        border-style: solid;
        background: #ffffff;
      }

      #measurementMap .option-photo-preview img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      #measurementMap .option-link-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      #measurementMap .option-link-fields label {
        display: grid;
        gap: 4px;
        color: #64748b;
        font-size: 0.75rem;
        font-weight: 900;
        letter-spacing: 0.03em;
      }

      #measurementMap .option-link-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      #measurementMap .option-open-link,
      #measurementMap .paste-option-photo-btn,
      #measurementMap .use-option-photo-btn {
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        padding: 7px 10px;
        background: #ffffff;
        color: #1d4ed8;
        font-size: 0.78rem;
        font-weight: 900;
        text-decoration: none;
        white-space: nowrap;
      }

      #measurementMap .option-open-link.secondary-link {
        color: #6d28d9;
        border-color: #ddd6fe;
      }

      #measurementMap .use-option-photo-btn {
        color: #047857;
        border-color: #bbf7d0;
      }

      @media (max-width: 820px) {
        #measurementMap .device-option-media {
          grid-template-columns: 76px 1fr;
        }
        #measurementMap .option-link-actions {
          grid-column: 1 / -1;
          justify-content: flex-start;
        }
        #measurementMap .option-link-fields {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function run() {
    seedLinks();
    installStyles();
    installEvents();
    renderAllMedia();
  }

  function init() {
    run();
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapOptionLinksPhotosTimer);
      window.__measurementMapOptionLinksPhotosTimer = setTimeout(renderAllMedia, 120);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(renderAllMedia, 80));
  init();
})();
