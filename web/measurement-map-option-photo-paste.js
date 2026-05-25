(() => {
  const MAP_KEY = "longevityResearchSystem.measurementMap.v0.1";
  let activeOptionCard = null;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(MAP_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(MAP_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged"));
    window.dispatchEvent(new CustomEvent("measurementMapOptionPhotoChanged"));
  }

  function optionName(card) {
    return card?.querySelector("[data-existing-option-field='name']")?.value?.trim() || "device option";
  }

  function findOption(card) {
    const deviceId = card?.dataset?.deviceId;
    const optionId = card?.dataset?.optionId;
    const state = readState();
    const item = (state.items || []).find((entry) => entry.id === deviceId);
    const option = item?.deviceOptions?.find?.((entry) => entry.id === optionId);
    return { state, item, option, deviceId, optionId };
  }

  function saveOptionPhoto(card, value) {
    const { state, item, option, deviceId } = findOption(card);
    if (!item || !option) return alert("Could not find this research option in the Measurement Map data.");

    option.imageUrl = value;
    writeState(state);

    const input = card.querySelector("[data-existing-option-field='imageUrl']");
    if (input) input.value = value;

    const photo = card.querySelector(".option-photo-preview");
    const name = option.name || optionName(card);
    if (photo) {
      photo.classList.remove("photo-error", "search-product-image");
      photo.classList.add("has-image", "real-product-image");
      photo.innerHTML = value
        ? `<img loading="lazy" src="${esc(value)}" alt="${esc(name)}">`
        : `<span>No product photo</span>`;
    }

    if (option.selected || card.querySelector(".select-device-option-btn.selected")) {
      const deviceCard = document.querySelector(`#measurementMap .map-card[data-map-id='${CSS.escape(deviceId)}']`);
      const devicePhoto = deviceCard?.querySelector(".map-photo");
      if (devicePhoto && value) {
        devicePhoto.classList.remove("map-starter-photo");
        devicePhoto.classList.add("selected-device-photo");
        devicePhoto.innerHTML = `<img loading="lazy" src="${esc(value)}" alt="${esc(name)}">`;
      }
    }
  }

  function ensureModal() {
    if (document.getElementById("optionPhotoPasteModal")) return;
    const modal = document.createElement("div");
    modal.id = "optionPhotoPasteModal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="option-photo-modal-backdrop" data-close-option-photo-modal="1"></div>
      <section class="option-photo-modal-card" role="dialog" aria-modal="true" aria-labelledby="optionPhotoModalTitle">
        <div class="option-photo-modal-head">
          <div>
            <span>Research option photo</span>
            <h3 id="optionPhotoModalTitle">Add or replace image</h3>
          </div>
          <button type="button" class="secondary-dark" data-close-option-photo-modal="1">Close</button>
        </div>
        <div id="optionPhotoPasteZone" class="option-photo-paste-zone" tabindex="0" contenteditable="true">
          Click here and paste an image from the clipboard, or paste an image URL.
        </div>
        <div class="option-photo-modal-grid">
          <label>Image URL
            <input id="optionPhotoUrlInput" type="url" placeholder="https://...">
          </label>
          <label>Upload image
            <input id="optionPhotoFileInput" type="file" accept="image/*">
          </label>
        </div>
        <div class="option-photo-modal-actions">
          <button type="button" id="saveOptionPhotoUrlBtn">Use URL</button>
          <button type="button" class="secondary-dark" id="clearOptionPhotoBtn">Clear image</button>
        </div>
        <p class="option-photo-modal-note">If this option is selected, the main device card image will follow this image automatically.</p>
      </section>
    `;
    document.body.appendChild(modal);
  }

  function openModal(card) {
    activeOptionCard = card;
    ensureModal();
    document.getElementById("optionPhotoModalTitle").textContent = `Add image for ${optionName(card)}`;
    document.getElementById("optionPhotoUrlInput").value = card.querySelector("[data-existing-option-field='imageUrl']")?.value || "";
    document.getElementById("optionPhotoFileInput").value = "";
    const zone = document.getElementById("optionPhotoPasteZone");
    zone.textContent = "Click here and paste an image from the clipboard, or paste an image URL.";
    document.getElementById("optionPhotoPasteModal").hidden = false;
    setTimeout(() => zone.focus(), 80);
  }

  function closeModal() {
    const modal = document.getElementById("optionPhotoPasteModal");
    if (modal) modal.hidden = true;
    activeOptionCard = null;
  }

  function resizeImage(file, maxSize = 900, quality = 0.74) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFile(file) {
    if (!activeOptionCard || !file || !file.type.startsWith("image/")) return;
    const dataUrl = await resizeImage(file);
    saveOptionPhoto(activeOptionCard, dataUrl);
    closeModal();
  }

  function installEvents() {
    if (window.__measurementMapOptionPhotoPasteEventsInstalled) return;
    window.__measurementMapOptionPhotoPasteEventsInstalled = true;

    document.addEventListener("click", (event) => {
      const close = event.target.closest?.("[data-close-option-photo-modal]");
      if (close) {
        closeModal();
        return;
      }

      const pasteBtn = event.target.closest?.("#measurementMap .paste-option-image-modal-btn, #measurementMap .paste-option-photo-btn");
      if (pasteBtn) {
        event.preventDefault();
        event.stopPropagation();
        openModal(pasteBtn.closest(".device-option-card"));
        return;
      }

      const photo = event.target.closest?.("#measurementMap .device-option-card .option-photo-preview");
      if (photo) {
        event.preventDefault();
        event.stopPropagation();
        openModal(photo.closest(".device-option-card"));
      }
    }, true);

    document.addEventListener("paste", async (event) => {
      const zone = event.target.closest?.("#optionPhotoPasteZone");
      if (!zone || !activeOptionCard) return;
      event.preventDefault();
      const file = [...(event.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
      if (file) return handleImageFile(file);
      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (text) {
        saveOptionPhoto(activeOptionCard, text);
        closeModal();
      }
    }, true);

    document.addEventListener("change", (event) => {
      if (event.target?.id === "optionPhotoFileInput") handleImageFile(event.target.files?.[0]);
    }, true);

    document.addEventListener("click", (event) => {
      if (event.target?.id === "saveOptionPhotoUrlBtn" && activeOptionCard) {
        const url = document.getElementById("optionPhotoUrlInput")?.value?.trim();
        if (!url) return alert("Paste an image URL first.");
        saveOptionPhoto(activeOptionCard, url);
        closeModal();
      }
      if (event.target?.id === "clearOptionPhotoBtn" && activeOptionCard) {
        saveOptionPhoto(activeOptionCard, "");
        closeModal();
      }
    }, true);
  }

  function installStyles() {
    if (document.getElementById("optionPhotoPasteStyles")) return;
    const style = document.createElement("style");
    style.id = "optionPhotoPasteStyles";
    style.textContent = `
      #measurementMap .device-option-card .option-photo-preview { cursor: pointer; }
      #optionPhotoPasteModal[hidden] { display: none !important; }
      #optionPhotoPasteModal {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .option-photo-modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.42);
        backdrop-filter: blur(4px);
      }
      .option-photo-modal-card {
        position: relative;
        width: min(720px, 100%);
        background: #ffffff;
        color: var(--ink, #111827);
        border-radius: 24px;
        border: 1px solid #dbe5f3;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
        padding: 18px;
        display: grid;
        gap: 14px;
      }
      .option-photo-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .option-photo-modal-head span {
        color: #64748b;
        font-size: 0.76rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .option-photo-modal-head h3 { margin: 3px 0 0; }
      .option-photo-paste-zone {
        min-height: 130px;
        border: 2px dashed #ddd6fe;
        border-radius: 18px;
        background: #f5f3ff;
        display: grid;
        place-items: center;
        padding: 18px;
        color: #6d28d9;
        font-weight: 850;
        text-align: center;
        outline: none;
      }
      .option-photo-paste-zone:focus {
        border-color: #7c3aed;
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.16);
      }
      .option-photo-modal-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .option-photo-modal-grid label {
        display: grid;
        gap: 6px;
        color: #64748b;
        font-weight: 800;
      }
      .option-photo-modal-grid input {
        border: 1px solid #dbe5f3;
        border-radius: 12px;
        padding: 10px 11px;
        font: inherit;
      }
      .option-photo-modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .option-photo-modal-note {
        color: #64748b;
        font-size: 0.88rem;
        margin: 0;
      }
      @media (max-width: 600px) { .option-photo-modal-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  function init() {
    ensureModal();
    installStyles();
    installEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
