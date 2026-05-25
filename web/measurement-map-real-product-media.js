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
    "wahoo tickr": "https://www.wahoofitness.com/devices/heart-rate-monitors",
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
    "camry eh101 digital dynamometer": "https://www.amazon.ie/s?k=Camry+EH101+digital+dynamometer",
    "baseline hydraulic dynamometer": "https://www.fabricationenterprises.com/evaluation/strength/dynamometers/",
    "takei t.k.k. 5401 grip-d": "https://www.takei-si.co.jp/en/products/fitness/tkk5401/",
    "uni-t ut383bt lux meter": "https://meters.uni-trend.com/product/ut383bt/",
    "dr.meter lx1330b lux meter": "https://www.amazon.ie/s?k=Dr.meter+LX1330B+lux+meter",
    "mini-wright peak flow meter": "https://www.clement-clarke.com/products/peak-flow/mini-wright/",
    "mir smart one spirometer": "https://www.spirometry.com/en/products/smart-one/",
    "lumen metabolism tracker": "https://www.lumen.me/",
    "lactate plus meter": "https://www.lactate.com/lactateplus.html",
    "lactate scout 4": "https://www.ekfdiagnostics.com/lactate-scout-4.html"
  };

  const AMAZON_AVAILABLE = [
    "renpho", "withings", "garmin", "omron", "beurer", "nonin", "apple watch", "polar", "wahoo", "accu-chek", "contour", "onetouch", "braun", "salter", "etekcity", "greater goods", "camry", "baseline", "takei", "uni-t", "dr.meter", "mini-wright", "mir smart one", "lumen", "lactate"
  ];

  function esc(value) {
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

  function nameFromCard(card) {
    return card.querySelector("[data-existing-option-field='name']")?.value?.trim() || "Device option";
  }

  function googleSearch(name) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${name} buy Ireland`)}`;
  }

  function amazonSearch(name) {
    return `https://www.amazon.ie/s?k=${encodeURIComponent(name)}`;
  }

  function directLink(name, fallback) {
    const key = norm(name);
    if (DIRECT[key]) return DIRECT[key];
    const current = String(fallback || "").trim();
    if (current && !/google\.[^/]+\/search/i.test(current)) return current;
    return googleSearch(name);
  }

  function realProductImageUrl(link) {
    if (/google\.[^/]+\/search/i.test(link)) return "";
    return `https://api.microlink.io/?url=${encodeURIComponent(link)}&embed=image.url`;
  }

  function amazonInfo(name) {
    const n = norm(name);
    const service = ["clinic", "private", "sleep apnea", "polysomnography", "dxa", "dexa", "blood panel", "gp ", "university", "sports lab", "stress echocardiogram", "exercise ecg", "cpet"].some((term) => n.includes(term));
    if (service) return { points: 0, text: "Service / not Amazon" };
    const available = AMAZON_AVAILABLE.some((term) => n.includes(term));
    return available ? { points: 1, text: "Likely on Amazon.ie" } : { points: 0, text: "Check Amazon.ie" };
  }

  function applyPhoto(card, name, link) {
    const photo = card.querySelector(".option-photo-preview");
    if (!photo) return;
    const manual = card.querySelector("[data-existing-option-field='imageUrl']")?.value?.trim();
    const src = manual || realProductImageUrl(link);
    photo.classList.remove("starter-product-image", "source-product-preview", "photo-error");
    if (!src) {
      photo.classList.add("photo-error");
      photo.innerHTML = `<span>Product image needs direct source<br><small>Use Find photo</small></span>`;
      return;
    }
    photo.classList.add("has-image", manual ? "real-product-image" : "source-product-image");
    photo.innerHTML = `<img loading="lazy" src="${esc(src)}" alt="${esc(name)}">`;
    const img = photo.querySelector("img");
    img?.addEventListener("error", () => {
      photo.classList.add("photo-error");
      photo.innerHTML = `<span>Image blocked<br><small>Use Find photo</small></span>`;
    }, { once: true });
  }

  function applyLinks(card, name, link) {
    const actions = card.querySelector(".option-link-actions");
    const sourceInput = card.querySelector("[data-existing-option-field='url']");
    if (sourceInput && sourceInput.value !== link) sourceInput.value = link;
    if (!actions) return;

    const open = actions.querySelector("a:not(.secondary-link):not(.google-search-link):not(.amazon-ie-link)");
    if (open) {
      open.href = link;
      open.textContent = /google\.[^/]+\/search/i.test(link) ? "Open search" : "Open source";
    }

    let google = actions.querySelector(".google-search-link");
    if (!google) {
      google = document.createElement("a");
      google.className = "google-search-link";
      google.target = "_blank";
      google.rel = "noopener noreferrer";
      google.textContent = "Google search";
      open?.insertAdjacentElement("afterend", google);
    }
    google.href = googleSearch(name);

    let amazon = actions.querySelector(".amazon-ie-link");
    if (!amazon) {
      amazon = document.createElement("a");
      amazon.className = "amazon-ie-link";
      amazon.target = "_blank";
      amazon.rel = "noopener noreferrer";
      amazon.textContent = "Amazon.ie";
      actions.appendChild(amazon);
    }
    amazon.href = amazonSearch(name);
  }

  function applyAmazonMetric(card, info) {
    const grid = card.querySelector(".option-metric-grid");
    if (!grid) return;
    let box = card.querySelector(".amazon-ie-score-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "option-score-box amazon-ie-score-box";
      grid.appendChild(box);
    }
    box.innerHTML = `<span>Amazon IE</span><strong>+${info.points}</strong><small>${esc(info.text)}</small>`;

    const scoreText = card.querySelector(".option-meta-row span");
    if (scoreText) {
      const base = scoreText.dataset.baseScoreText || scoreText.textContent.replace(/ · Amazon \+\d+$/, "");
      scoreText.dataset.baseScoreText = base;
      scoreText.textContent = `${base} · Amazon +${info.points}`;
    }
  }

  function run() {
    document.querySelectorAll("#measurementMap .device-option-card").forEach((card) => {
      const name = nameFromCard(card);
      const link = directLink(name, card.querySelector("[data-existing-option-field='url']")?.value);
      applyLinks(card, name, link);
      applyPhoto(card, name, link);
      applyAmazonMetric(card, amazonInfo(name));
    });
  }

  function installStyles() {
    if (document.getElementById("measurementMapRealProductMediaStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapRealProductMediaStyles";
    style.textContent = `
      #measurementMap .source-product-image img,
      #measurementMap .real-product-image img { object-fit: contain !important; background:#fff; }
      #measurementMap .photo-error { background:#f8fafc!important; border-style:dashed!important; }
      #measurementMap .photo-error span { color:#64748b; font-size:.68rem; font-weight:900; text-align:center; line-height:1.1; padding:4px; }
      #measurementMap .photo-error small { font-size:.6rem; font-weight:800; }
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
    if (!window.__measurementMapRealProductMediaObserverInstalled) {
      window.__measurementMapRealProductMediaObserverInstalled = true;
      new MutationObserver(() => {
        clearTimeout(window.__measurementMapRealProductMediaTimer);
        window.__measurementMapRealProductMediaTimer = setTimeout(run, 100);
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  init();
})();
