(() => {
  let activeCard = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureModal() {
    if (document.getElementById("mapPhotoPasteModal")) return;
    const modal = document.createElement("div");
    modal.id = "mapPhotoPasteModal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="map-photo-modal-backdrop" data-close-photo-modal="1"></div>
      <section class="map-photo-modal-card" role="dialog" aria-modal="true" aria-labelledby="mapPhotoModalTitle">
        <div class="map-photo-modal-head">
          <div>
            <span>Device photo</span>
            <h3 id="mapPhotoModalTitle">Add or replace image</h3>
          </div>
          <button type="button" class="secondary-dark" data-close-photo-modal="1">Close</button>
        </div>
        <div id="mapPhotoPasteZone" class="map-photo-paste-zone" tabindex="0" contenteditable="true">
          Click here and paste an image from the clipboard, or paste an image URL.
        </div>
        <div class="map-photo-modal-grid">
          <label>Image URL
            <input id="mapPhotoUrlInput" type="url" placeholder="https://...">
          </label>
          <label>Upload image
            <input id="mapPhotoFileInput" type="file" accept="image/*">
          </label>
        </div>
        <div class="map-photo-modal-actions">
          <button type="button" id="saveMapPhotoUrlBtn">Use URL</button>
          <button type="button" class="secondary-dark" id="clearMapPhotoBtn">Clear image</button>
        </div>
        <p class="map-photo-modal-note">Images are stored in the Measurement Map data. Large pasted images are resized before saving.</p>
      </section>
    `;
    document.body.appendChild(modal);
  }

  function installStyles() {
    if (document.getElementById("mapPhotoPasteStyles")) return;
    const style = document.createElement("style");
    style.id = "mapPhotoPasteStyles";
    style.textContent = `
      #measurementMap .map-photo {
        cursor: pointer;
        position: relative;
      }
      #measurementMap .map-photo::after {
        content: "Click to add / paste photo";
        position: absolute;
        left: 8px;
        right: 8px;
        bottom: 8px;
        background: rgba(15, 23, 42, 0.72);
        color: #fff;
        border-radius: 999px;
        padding: 5px 8px;
        font-size: 0.72rem;
        font-weight: 800;
        text-align: center;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.16s ease, transform 0.16s ease;
        pointer-events: none;
      }
      #measurementMap .map-photo:hover::after,
      #measurementMap .map-photo:focus-within::after {
        opacity: 1;
        transform: translateY(0);
      }
      #mapPhotoPasteModal[hidden] { display: none !important; }
      #mapPhotoPasteModal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .map-photo-modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.42);
        backdrop-filter: blur(4px);
      }
      .map-photo-modal-card {
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
      .map-photo-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .map-photo-modal-head span {
        color: #64748b;
        font-size: 0.76rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .map-photo-modal-head h3 {
        margin: 3px 0 0;
      }
      .map-photo-paste-zone {
        min-height: 130px;
        border: 2px dashed #bfdbfe;
        border-radius: 18px;
        background: #eff6ff;
        display: grid;
        place-items: center;
        padding: 18px;
        color: #1d4ed8;
        font-weight: 850;
        text-align: center;
        outline: none;
      }
      .map-photo-paste-zone:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
      }
      .map-photo-modal-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .map-photo-modal-grid label {
        display: grid;
        gap: 6px;
        color: #64748b;
        font-weight: 800;
      }
      .map-photo-modal-grid input {
        border: 1px solid #dbe5f3;
        border-radius: 12px;
        padding: 10px 11px;
        font: inherit;
      }
      .map-photo-modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .map-photo-modal-note {
        color: #64748b;
        font-size: 0.88rem;
        margin: 0;
      }
      @media (max-width: 600px) {
        .map-photo-modal-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function openModal(card) {
    activeCard = card;
    ensureModal();
    const modal = document.getElementById("mapPhotoPasteModal");
    const title = card.querySelector(".map-title h3")?.textContent?.trim() || "device";
    document.getElementById("mapPhotoModalTitle").textContent = `Add image for ${title}`;
    document.getElementById("mapPhotoUrlInput").value = "";
    document.getElementById("mapPhotoFileInput").value = "";
    const zone = document.getElementById("mapPhotoPasteZone");
    zone.textContent = "Click here and paste an image from the clipboard, or paste an image URL.";
    modal.hidden = false;
    setTimeout(() => zone.focus(), 80);
  }

  function closeModal() {
    const modal = document.getElementById("mapPhotoPasteModal");
    if (modal) modal.hidden = true;
    activeCard = null;
  }

  function hiddenPhotoInput(card) {
    return card?.querySelector?.("[data-field='photoUrl']") || null;
  }

  function savePhotoToCard(card, value) {
    const input = hiddenPhotoInput(card);
    if (!input) return alert("Could not find the hidden photo field for this device.");
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const photo = card.querySelector(".map-photo");
    if (photo) {
      const name = card.querySelector(".map-title h3")?.textContent?.trim() || "Device image";
      photo.classList.remove("map-starter-photo");
      photo.innerHTML = value ? `<img loading="lazy" src="${escapeHtml(value)}" alt="${escapeHtml(name)}">` : `<div>No photo yet<br><small>Click image to paste</small></div>`;
    }
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
    if (!activeCard || !file || !file.type.startsWith("image/")) return;
    const dataUrl = await resizeImage(file);
    savePhotoToCard(activeCard, dataUrl);
    closeModal();
  }

  function installEvents() {
    if (window.__measurementMapPhotoPasteEventsInstalled) return;
    window.__measurementMapPhotoPasteEventsInstalled = true;

    document.addEventListener("click", (event) => {
      const close = event.target.closest?.("[data-close-photo-modal]");
      if (close) {
        closeModal();
        return;
      }
      const photo = event.target.closest?.("#measurementMap .map-photo");
      if (photo) {
        event.preventDefault();
        event.stopPropagation();
        openModal(photo.closest(".map-card"));
      }
    }, true);

    document.addEventListener("paste", async (event) => {
      const zone = event.target.closest?.("#mapPhotoPasteZone");
      if (!zone || !activeCard) return;
      event.preventDefault();
      const file = [...(event.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
      if (file) return handleImageFile(file);
      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (text) {
        savePhotoToCard(activeCard, text);
        closeModal();
      }
    }, true);

    document.addEventListener("change", (event) => {
      if (event.target?.id === "mapPhotoFileInput") handleImageFile(event.target.files?.[0]);
    }, true);

    document.addEventListener("click", (event) => {
      if (event.target?.id === "saveMapPhotoUrlBtn" && activeCard) {
        const url = document.getElementById("mapPhotoUrlInput")?.value?.trim();
        if (!url) return alert("Paste an image URL first.");
        savePhotoToCard(activeCard, url);
        closeModal();
      }
      if (event.target?.id === "clearMapPhotoBtn" && activeCard) {
        savePhotoToCard(activeCard, "");
        closeModal();
      }
    }, true);
  }

  function init() {
    installStyles();
    ensureModal();
    installEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
