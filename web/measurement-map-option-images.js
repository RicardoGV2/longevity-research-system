(() => {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function run() {
    document.querySelectorAll("#measurementMap .device-option-card").forEach((card) => {
      const photo = card.querySelector(".option-photo-preview");
      if (!photo || photo.dataset.starterImageApplied === "1" || photo.querySelector("img")) return;
      const name = card.querySelector("[data-existing-option-field='name']")?.value || "Device option";
      photo.classList.add("has-image");
      photo.innerHTML = `<img loading="lazy" src="${svgImage(name)}" alt="${escapeHtml(name)}">`;
      photo.dataset.starterImageApplied = "1";
    });
  }

  function init() {
    run();
    [200, 700, 1400, 3000].forEach((delay) => setTimeout(run, delay));
    if (!window.__measurementMapOptionImagesObserverInstalled) {
      window.__measurementMapOptionImagesObserverInstalled = true;
      new MutationObserver(() => {
        clearTimeout(window.__measurementMapOptionImagesTimer);
        window.__measurementMapOptionImagesTimer = setTimeout(run, 80);
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  init();
})();
