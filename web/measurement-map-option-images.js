(() => {
  const DIRECT = {
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
    "onetouch select plus": "https://www.onetouch.co.uk/products/meters/onetouch-select-plus",
    "freestyle libre 2 sensor": "https://www.freestyle.abbott/ie-en/products/freestyle-libre-2.html",
    "dexcom one+": "https://www.dexcom.com/en-ie/dexcom-one-plus",
    "freestyle libre 3": "https://www.freestyle.abbott/ie-en/products/freestyle-libre-3.html",
    "kardiamobile 6l": "https://store.kardia.com/products/kardiamobile6l",
    "watchpat one home test": "https://www.itamar-medical.com/watchpat-one/",
    "aranet4 co2 monitor": "https://aranet.com/products/aranet4/",
    "airthings view plus": "https://www.airthings.com/en-ie/view-plus",
    "qingping air monitor lite": "https://www.qingping.co/air-monitor-lite/overview",
    "braun thermoscan 7": "https://www.braunhealthcare.com/uk_en/thermometers/thermoscan-7",
    "withings thermo": "https://www.withings.com/ie/en/thermo",
    "salter digital kitchen scale": "https://salter.com/collections/kitchen-scales",
    "etekcity food kitchen scale": "https://www.etekcity.com/collections/kitchen-scales",
    "greater goods nutrition scale": "https://greatergoods.com/products/nourish-digital-kitchen-scale",
    "baseline hydraulic dynamometer": "https://www.fabricationenterprises.com/evaluation/strength/dynamometers/",
    "takei t.k.k. 5401 grip-d": "https://www.takei-si.co.jp/en/products/fitness/tkk5401/",
    "uni-t ut383bt lux meter": "https://meters.uni-trend.com/product/ut383bt/",
    "mini-wright peak flow meter": "https://www.clement-clarke.com/products/peak-flow/mini-wright/",
    "mir smart one spirometer": "https://www.spirometry.com/en/products/smart-one/",
    "lumen metabolism tracker": "https://www.lumen.me/",
    "lactate plus meter": "https://www.lactate.com/lactateplus.html",
    "lactate scout 4": "https://www.ekfdiagnostics.com/lactate-scout-4.html"
  };

  const AMAZON_LIKELY = [
    "renpho", "withings", "garmin", "omron", "beurer", "nonin", "apple watch", "polar", "wahoo", "accu-chek", "contour", "onetouch", "braun", "salter", "etekcity", "greater goods", "camry", "baseline", "takei", "uni-t", "dr.meter", "mini-wright", "mir smart one", "lumen", "lactate"
  ];

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function norm(value) {
    return String(value || "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  function googleSearch(name) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${name} buy Ireland`)}`;
  }

  function amazonSearch(name) {
    return `https://www.amazon.ie/s?k=${encodeURIComponent(name)}`;
  }

  function sourcePreview(url) {
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=360`;
  }

  function productName(card) {
    return card.querySelector("[data-existing-option-field='name']")?.value || "Device option";
  }

  function directLinkFor(name, fallback) {
    const key = norm(name);
    if (DIRECT[key]) return DIRECT[key];
    const current = String(fallback || "").trim();
    if (current && !current.includes("google.com/search")) return current;
    return googleSearch(name);
  }

  function amazonStatus(name) {
    const n = norm(name);
    if (n.includes("clinic") || n.includes("private") || n.includes("sleep apnea") || n.includes("polysomnography") || n.includes("dxa") || n.includes("dexa") || n.includes("blood panel") || n.includes("gp ")) {
      return { text: "Service / not Amazon", points: 0 };
    }
    const likely = AMAZON_LIKELY.some((term) => n.includes(term));
    return likely ? { text: "Likely on Amazon.ie", points: 1 } : { text: "Check Amazon.ie", points: 0 };
  }

  function setPhoto(card, link, name) {
    const photo = card.querySelector(".option-photo-preview");
    if (!photo) return;
    const existingUrl = card.querySelector("[data-existing-option-field='imageUrl']")?.value?.trim();
    const src = existingUrl || sourcePreview(link);
    photo.classList.add("has-image", existingUrl ? "real-product-image" : "source-product-preview");
    photo.innerHTML = `<img loading="lazy" src="${esc(src)}" alt="${esc(name)}">`;
    photo.dataset.realProductPreview = "1";
  }

  function addAmazonMetric(card, status) {
    const grid = card.querySelector(".option-metric-grid");
    if (!grid || card.querySelector(".amazon-ie-score-box")) return;
    const box = document.createElement("div");
    box.className = "option-score-box amazon-ie-score-box";
    box.innerHTML = `<span>Amazon IE</span><strong>+${status.points}</strong><small>${esc(status.text)}</small>`;
    grid.appendChild(box);
  }

  function addButtons(card, name, link) {
    const actions = card.querySelector(".option-link-actions");
    if (!actions) return;
    const open = actions.querySelector("a:not(.secondary-link):not(.google-search-link):not(.amazon-ie-link)");
    if (open) open.href = link;
    if (!actions.querySelector(".google-search-link")) {
      const google = document.createElement("a");
      google.className = "google-search-link";
      google.href = googleSearch(name);
      google.target = "_blank";
      google.rel = "noopener noreferrer";
      google.textContent = "Google search";
      open?.insertAdjacentElement("afterend", google);
    }
    if (!actions.querySelector(".amazon-ie-link")) {
      const amazon = document.createElement("a");
      amazon.className = "amazon-ie-link";
      amazon.href = amazonSearch(name);
      amazon.target = "_blank";
      amazon.rel = "noopener noreferrer";
      amazon.textContent = "Amazon.ie";
      actions.appendChild(amazon);
    }
  }

  function updateScoreText(card, status) {
    const score = card.querySelector(".option-meta-row span");
    if (!score || score.dataset.amazonAdjusted === "1") return;
    score.textContent = `${score.textContent} · Amazon +${status.points}`;
    score.dataset.amazonAdjusted = "1";
  }

  function run() {
    document.querySelectorAll("#measurementMap .device-option-card").forEach((card) => {
      const name = productName(card);
      const urlInput = card.querySelector("[data-existing-option-field='url']");
      const link = directLinkFor(name, urlInput?.value);
      if (urlInput && urlInput.value !== link) urlInput.value = link;
      setPhoto(card, link, name);
      addButtons(card, name, link);
      const status = amazonStatus(name);
      addAmazonMetric(card, status);
      updateScoreText(card, status);
    });
  }

  function installStyles() {
    if (document.getElementById("measurementMapRealOptionImagesStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapRealOptionImagesStyles";
    style.textContent = `
      #measurementMap .source-product-preview img { object-fit: cover !important; }
      #measurementMap .amazon-ie-link { color:#b45309!important; border-color:#fcd34d!important; }
      #measurementMap .google-search-link { color:#0f766e!important; border-color:#99f6e4!important; }
      #measurementMap .amazon-ie-score-box small { color:#64748b; font-size:.66rem; font-weight:800; line-height:1.1; }
    `;
    document.head.appendChild(style);
  }

  function init() {
    installStyles();
    run();
    [250, 800, 1800, 3500, 6000].forEach((delay) => setTimeout(run, delay));
    if (!window.__measurementMapRealOptionImagesObserverInstalled) {
      window.__measurementMapRealOptionImagesObserverInstalled = true;
      new MutationObserver(() => {
        clearTimeout(window.__measurementMapRealOptionImagesTimer);
        window.__measurementMapRealOptionImagesTimer = setTimeout(run, 100);
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  init();
})();
