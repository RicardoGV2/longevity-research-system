(() => {
  const STARTER_IMAGE_LABELS = {
    "scale": { title: "Scale", accent: "#2563eb", bg1: "#eff6ff", bg2: "#dbeafe", icon: "⚖" },
    "tape-measure": { title: "Tape measure", accent: "#ca8a04", bg1: "#fff7ed", bg2: "#fed7aa", icon: "〰" },
    "bp-monitor": { title: "Blood pressure monitor", accent: "#dc2626", bg1: "#fef2f2", bg2: "#fecaca", icon: "♥" },
    "pulse-oximeter": { title: "Pulse oximeter", accent: "#0891b2", bg1: "#ecfeff", bg2: "#a5f3fc", icon: "SpO₂" },
    "wearable": { title: "Smartwatch / ring", accent: "#4f46e5", bg1: "#eef2ff", bg2: "#c7d2fe", icon: "⌚" },
    "chest-strap": { title: "Chest HR strap", accent: "#0f766e", bg1: "#f0fdfa", bg2: "#99f6e4", icon: "HR" },
    "glucometer": { title: "Glucometer", accent: "#16a34a", bg1: "#f0fdf4", bg2: "#bbf7d0", icon: "mg/dL" },
    "cgm": { title: "CGM sensor", accent: "#059669", bg1: "#ecfdf5", bg2: "#a7f3d0", icon: "CGM" },
    "ecg": { title: "12-lead ECG", accent: "#e11d48", bg1: "#fff1f2", bg2: "#fecdd3", icon: "ECG" },
    "stress-test": { title: "Exercise stress test", accent: "#ea580c", bg1: "#fff7ed", bg2: "#fed7aa", icon: "🏃" },
    "cpet": { title: "CPET / VO₂ max", accent: "#7c3aed", bg1: "#f5f3ff", bg2: "#ddd6fe", icon: "VO₂" },
    "dexa": { title: "DEXA / DXA", accent: "#475569", bg1: "#f8fafc", bg2: "#cbd5e1", icon: "DXA" },
    "sleep-study": { title: "Sleep study", accent: "#4338ca", bg1: "#eef2ff", bg2: "#c7d2fe", icon: "☾" },
    "blood-panel": { title: "Blood panel", accent: "#be123c", bg1: "#fff1f2", bg2: "#fecdd3", icon: "LAB" },
    "air-monitor": { title: "CO₂ / air quality", accent: "#0d9488", bg1: "#f0fdfa", bg2: "#99f6e4", icon: "CO₂" }
  };

  function escapeXml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function svgDataUrl(meta) {
    const title = escapeXml(meta.title);
    const icon = escapeXml(meta.icon);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 650" role="img" aria-label="${title}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="${meta.bg1}"/>
            <stop offset="1" stop-color="${meta.bg2}"/>
          </linearGradient>
          <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#ffffff"/>
            <stop offset="1" stop-color="#f1f5f9"/>
          </linearGradient>
        </defs>
        <rect width="900" height="650" fill="url(#bg)"/>
        <circle cx="760" cy="95" r="92" fill="#ffffff" opacity="0.35"/>
        <circle cx="115" cy="520" r="125" fill="#ffffff" opacity="0.28"/>
        <ellipse cx="450" cy="512" rx="305" ry="42" fill="#0f172a" opacity="0.14"/>
        <rect x="218" y="135" width="464" height="360" rx="48" fill="url(#card)" stroke="#ffffff" stroke-width="10"/>
        <rect x="278" y="195" width="344" height="150" rx="34" fill="${meta.accent}" opacity="0.14"/>
        <circle cx="450" cy="270" r="94" fill="#ffffff" stroke="${meta.accent}" stroke-width="10"/>
        <text x="450" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="900" fill="${meta.accent}">${icon}</text>
        <rect x="292" y="382" width="316" height="24" rx="12" fill="${meta.accent}" opacity="0.35"/>
        <rect x="335" y="426" width="230" height="20" rx="10" fill="${meta.accent}" opacity="0.24"/>
        <text x="450" y="594" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="${meta.accent}">${title}</text>
      </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const STARTER_IMAGES = Object.fromEntries(
    Object.entries(STARTER_IMAGE_LABELS).map(([id, meta]) => [id, svgDataUrl(meta)])
  );

  function addStarterClass() {
    if (document.getElementById("measurementMapStarterPhotoStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapStarterPhotoStyles";
    style.textContent = `
      .map-photo.map-starter-photo {
        background: #f8fafc;
      }
      .map-photo.map-starter-photo img {
        object-fit: cover;
      }
    `;
    document.head.appendChild(style);
  }

  function patchVisibleStarterImages() {
    addStarterClass();
    document.querySelectorAll(".map-card").forEach((card) => {
      const id = card.dataset.mapId;
      const src = STARTER_IMAGES[id];
      if (!src) return;
      const photo = card.querySelector(".map-photo");
      if (!photo || photo.querySelector("img")) return;
      photo.classList.add("map-starter-photo");
      const title = STARTER_IMAGE_LABELS[id]?.title || "Measurement item";
      photo.innerHTML = `<img loading="lazy" src="${src}" alt="${escapeXml(title)} starter image">`;
    });
  }

  function installRenderMapWrapper() {
    if (typeof renderMap !== "function" || renderMap.__starterPhotosWrapped) return;
    const originalRenderMap = renderMap;
    renderMap = function renderMapWithStarterPhotos(...args) {
      const result = originalRenderMap.apply(this, args);
      requestAnimationFrame(patchVisibleStarterImages);
      return result;
    };
    renderMap.__starterPhotosWrapped = true;
  }

  function init() {
    installRenderMapWrapper();
    patchVisibleStarterImages();
  }

  const observer = new MutationObserver(() => patchVisibleStarterImages());
  document.addEventListener("DOMContentLoaded", () => {
    init();
    const grid = document.getElementById("measurementMapGrid");
    if (grid) observer.observe(grid, { childList: true, subtree: true });
    [500, 1200, 2200].forEach((delay) => setTimeout(init, delay));
  });
  init();
})();
