(() => {
  function installStyles() {
    if (document.getElementById("measurementMapInnerScrollStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapInnerScrollStyles";
    style.textContent = `
      #measurementMap .map-info-tabs,
      #measurementMap .clean-link-chip-row,
      #measurementMap .device-options-table,
      #measurementMap .device-options-list {
        cursor: grab;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
      }

      #measurementMap .map-info-tabs.inner-dragging,
      #measurementMap .clean-link-chip-row.inner-dragging,
      #measurementMap .device-options-table.inner-dragging,
      #measurementMap .device-options-list.inner-dragging {
        cursor: grabbing;
        user-select: none;
        -webkit-user-select: none;
      }

      #measurementMap .map-info-tabs.inner-dragging *,
      #measurementMap .clean-link-chip-row.inner-dragging *,
      #measurementMap .device-options-table.inner-dragging *,
      #measurementMap .device-options-list.inner-dragging * {
        pointer-events: none;
      }

      #measurementMap .clean-link-chip-row {
        max-height: 280px;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        padding-right: 4px;
      }

      #measurementMap .clean-analysis-chip .chip-text {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      #measurementMap .option-link-actions .google-search-link {
        color: #0f766e !important;
        border-color: #99f6e4 !important;
      }

      #measurementMap .starter-product-image {
        border-style: solid !important;
        background: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }

  function installDragScroll(scroller) {
    if (!scroller || scroller.dataset.innerMouseScrollInstalled === "1") return;
    scroller.dataset.innerMouseScrollInstalled = "1";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let dragged = false;
    let suppressClickUntil = 0;

    const canScrollX = () => scroller.scrollWidth > scroller.clientWidth + 2;
    const canScrollY = () => scroller.scrollHeight > scroller.clientHeight + 2;
    const reset = () => {
      pointerId = null;
      dragged = false;
      scroller.classList.remove("inner-dragging");
    };

    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      if (event.button !== undefined && event.button !== 0) return;
      if (!canScrollX() && !canScrollY()) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = scroller.scrollLeft;
      startScrollTop = scroller.scrollTop;
      dragged = false;
      scroller.setPointerCapture?.(pointerId);
    }, true);

    scroller.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragged && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      dragged = true;
      scroller.classList.add("inner-dragging");
      if (canScrollX()) scroller.scrollLeft = startScrollLeft - dx;
      if (canScrollY()) scroller.scrollTop = startScrollTop - dy;
      event.preventDefault();
    }, true);

    scroller.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) return;
      if (dragged) suppressClickUntil = Date.now() + 260;
      scroller.releasePointerCapture?.(pointerId);
      reset();
    }, true);

    scroller.addEventListener("pointercancel", reset, true);
    scroller.addEventListener("lostpointercapture", reset, true);

    scroller.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    scroller.addEventListener("wheel", (event) => {
      if (!canScrollX() && !canScrollY()) return;
      const beforeLeft = scroller.scrollLeft;
      const beforeTop = scroller.scrollTop;

      if (canScrollX() && Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        scroller.scrollLeft += event.deltaX;
      } else if (canScrollY()) {
        scroller.scrollTop += event.deltaY;
      } else if (canScrollX()) {
        scroller.scrollLeft += event.deltaY;
      }

      if (scroller.scrollLeft !== beforeLeft || scroller.scrollTop !== beforeTop) event.preventDefault();
    }, { passive: false });
  }

  const DIRECT_LINKS = {
    "renpho smart body scale": "https://renpho.com/products/smart-body-scale",
    "withings body smart": "https://www.withings.com/ie/en/body-smart",
    "garmin index s2": "https://www.garmin.com/en-IE/p/679362",
    "renpho smart tape measure": "https://renpho.com/products/smart-tape-measure",
    "omron m3 comfort upper-arm": "https://www.omron-healthcare.com/eu/blood-pressure-monitors/M3_Comfort.html",
    "omron m7 intelli it": "https://www.omron-healthcare.com/eu/blood-pressure-monitors/M7_Intelli_IT.html",
    "withings bpm connect": "https://www.withings.com/ie/en/bpm-connect",
    "beurer po 30": "https://www.beurer.com/uk/p/45431/",
    "beurer po 60 bluetooth": "https://www.beurer.com/uk/p/45420/",
    "nonin onyx vantage 9590": "https://www.nonin.com/products/onyx-vantage-9590/",
    "apple watch se / series": "https://www.apple.com/ie/watch/",
    "garmin forerunner 165": "https://www.garmin.com/en-IE/p/1057989",
    "oura ring 4": "https://ouraring.com/product/rings",
    "polar h10": "https://www.polar.com/en/sensors/h10-heart-rate-sensor",
    "garmin hrm-pro plus": "https://www.garmin.com/en-IE/p/770963",
    "accu-chek instant": "https://www.accu-chek.co.uk/blood-glucose-meter/instant",
    "contour next one": "https://www.contournextone.com/",
    "freestyle libre 2 sensor": "https://www.freestyle.abbott/ie-en/products/freestyle-libre-2.html",
    "dexcom one+": "https://www.dexcom.com/en-ie/dexcom-one-plus",
    "freestyle libre 3": "https://www.freestyle.abbott/ie-en/products/freestyle-libre-3.html",
    "kardiamobile 6l": "https://store.kardia.com/products/kardiamobile6l",
    "watchpat one home test": "https://www.itamar-medical.com/watchpat-one/",
    "aranet4 co2 monitor": "https://aranet.com/products/aranet4/",
    "airthings view plus": "https://www.airthings.com/en-ie/view-plus",
    "withings thermo": "https://www.withings.com/ie/en/thermo",
    "lumen metabolism tracker": "https://www.lumen.me/",
    "lactate scout 4": "https://www.ekfdiagnostics.com/lactate-scout-4.html"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(value) {
    return String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  function googleSearch(name) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${name} buy Ireland`)}`;
  }

  function categoryFor(text) {
    const t = String(text || "").toLowerCase();
    if (t.includes("tape")) return ["⌁", "#fef3c7", "#b45309"];
    if (t.includes("pressure") || t.includes("omron") || t.includes("bpm")) return ["♥", "#fee2e2", "#dc2626"];
    if (t.includes("spo") || t.includes("ox")) return ["O₂", "#cffafe", "#0891b2"];
    if (t.includes("watch") || t.includes("ring") || t.includes("garmin")) return ["⌚", "#dbeafe", "#2563eb"];
    if (t.includes("glucose") || t.includes("libre") || t.includes("dexcom")) return ["G", "#fee2e2", "#b91c1c"];
    if (t.includes("ecg") || t.includes("kardia")) return ["ECG", "#dcfce7", "#047857"];
    if (t.includes("vo2") || t.includes("cpet")) return ["VO₂", "#ede9fe", "#7c3aed"];
    if (t.includes("dxa") || t.includes("dexa")) return ["DXA", "#fce7f3", "#be185d"];
    if (t.includes("sleep")) return ["☾", "#e0e7ff", "#4338ca"];
    if (t.includes("air") || t.includes("co2")) return ["CO₂", "#ccfbf1", "#0f766e"];
    if (t.includes("thermo")) return ["°C", "#ffedd5", "#ea580c"];
    if (t.includes("kitchen")) return ["g", "#ecfccb", "#4d7c0f"];
    if (t.includes("grip")) return ["✊", "#f3e8ff", "#7e22ce"];
    if (t.includes("lux")) return ["☀", "#fef9c3", "#ca8a04"];
    if (t.includes("spiro")) return ["L/s", "#e0f2fe", "#0369a1"];
    if (t.includes("lactate")) return ["La", "#fee2e2", "#991b1b"];
    return ["⚖", "#eef2ff", "#2563eb"];
  }

  function svgImage(name) {
    const [icon, bg, accent] = categoryFor(name);
    const title = String(name || "Device option").slice(0, 42).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" rx="26" fill="${bg}"/><ellipse cx="160" cy="188" rx="104" ry="15" fill="#64748b" opacity=".18"/><rect x="74" y="52" width="172" height="110" rx="22" fill="#fff" stroke="#dbe5f3" stroke-width="2"/><circle cx="160" cy="105" r="45" fill="#fff" stroke="${accent}" stroke-width="8"/><text x="160" y="116" text-anchor="middle" font-family="Arial" font-size="28" font-weight="800" fill="${accent}">${icon}</text><rect x="96" y="172" width="128" height="10" rx="5" fill="${accent}" opacity=".25"/><text x="160" y="211" text-anchor="middle" font-family="Arial" font-size="17" font-weight="800" fill="${accent}">${title}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function enhanceOptionCard(card) {
    const name = card.querySelector("[data-existing-option-field='name']")?.value || "Device option";
    const key = norm(name);
    const directLink = DIRECT_LINKS[key];
    const photo = card.querySelector(".option-photo-preview");
    if (photo && !photo.querySelector("img")) {
      photo.classList.add("has-image", "starter-product-image");
      photo.innerHTML = `<img loading="lazy" src="${svgImage(name)}" alt="${escapeHtml(name)}">`;
    }

    const actions = card.querySelector(".option-link-actions");
    if (actions) {
      const firstLink = actions.querySelector("a:not(.secondary-link):not(.google-search-link)");
      if (firstLink && directLink) firstLink.href = directLink;
      if (!actions.querySelector(".google-search-link")) {
        const link = document.createElement("a");
        link.className = "google-search-link";
        link.href = googleSearch(name);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Google search";
        firstLink?.insertAdjacentElement("afterend", link);
      }
    }

    const urlInput = card.querySelector("[data-existing-option-field='url']");
    if (urlInput && directLink && urlInput.value !== directLink) urlInput.value = directLink;
  }

  function run() {
    installStyles();
    document.querySelectorAll("#measurementMap .map-info-tabs, #measurementMap .clean-link-chip-row, #measurementMap .device-options-table, #measurementMap .device-options-list").forEach(installDragScroll);
    document.querySelectorAll("#measurementMap .device-option-card").forEach(enhanceOptionCard);
  }

  function init() {
    run();
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapInnerScrollTimer);
      window.__measurementMapInnerScrollTimer = setTimeout(run, 100);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    [250, 800, 1800, 3500].forEach((delay) => setTimeout(run, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  init();
})();
