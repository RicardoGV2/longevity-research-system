(() => {
  function installStyles() {
    if (document.getElementById("measurementMapLinksPanelFinalStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapLinksPanelFinalStyles";
    style.textContent = `
      #measurementMap .map-body > .map-analysis-links,
      #measurementMap .map-analysis-links-source-only {
        display: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-links.inside-links-panel {
        width: 100% !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 18px !important;
        background: #ffffff !important;
        padding: 14px !important;
        display: grid !important;
        gap: 10px !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head span {
        color: #64748b !important;
        font-size: 0.72rem !important;
        font-weight: 900 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-box-head small {
        color: #334155 !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 999px !important;
        padding: 4px 9px !important;
        font-weight: 900 !important;
        white-space: nowrap !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-help {
        margin: -2px 0 1px !important;
        color: #64748b !important;
        font-size: 0.86rem !important;
        font-weight: 750 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .link-chip-row,
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .compact-link-chip-row {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        gap: 8px !important;
        max-height: 250px !important;
        overflow: auto !important;
        padding: 2px 3px 2px 0 !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 6px !important;
        width: auto !important;
        max-width: 260px !important;
        min-height: 34px !important;
        border: 1px solid #dbe5f3 !important;
        background: #ffffff !important;
        color: #1d4ed8 !important;
        border-radius: 999px !important;
        padding: 6px 10px !important;
        font: inherit !important;
        font-size: 0.78rem !important;
        font-weight: 850 !important;
        line-height: 1.1 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip span,
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip .chip-code {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 20px !important;
        min-width: 20px !important;
        max-width: 20px !important;
        height: 20px !important;
        margin: 0 !important;
        border-radius: 999px !important;
        background: #f1f5f9 !important;
        color: #2563eb !important;
        font-size: 0.72rem !important;
        font-weight: 900 !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip .chip-text {
        display: inline !important;
        min-width: 0 !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] .map-analysis-chip:hover {
        border-color: #93c5fd !important;
        background: #f8fbff !important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeDuplicateOutsideBlocks() {
    document.querySelectorAll("#measurementMap .map-card").forEach((card) => {
      const panel = card.querySelector(".map-info-panel[data-map-info-panel='analyses']");
      if (!panel) return;
      card.querySelectorAll(".map-analysis-links").forEach((block) => {
        if (!panel.contains(block)) block.remove();
      });
    });
  }

  function normalizeChipMarkup() {
    document.querySelectorAll("#measurementMap .map-info-panel[data-map-info-panel='analyses'] .map-analysis-chip").forEach((chip) => {
      if (chip.dataset.styleNormalized === "1") return;
      const codeEl = chip.querySelector("span, .chip-code");
      if (!codeEl) return;
      const codeText = codeEl.textContent.trim();
      const text = Array.from(chip.childNodes)
        .filter((node) => node !== codeEl)
        .map((node) => node.textContent || "")
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");
      if (text && !chip.querySelector(".chip-text")) {
        chip.innerHTML = `<span class="chip-code">${codeText}</span><span class="chip-text">${text}</span>`;
      }
      chip.dataset.styleNormalized = "1";
    });
  }

  function run() {
    installStyles();
    removeDuplicateOutsideBlocks();
    normalizeChipMarkup();
  }

  function init() {
    run();
    [100, 400, 900, 1800, 3500].forEach((delay) => setTimeout(run, delay));
    if (!window.__measurementMapLinksPanelFinalObserverInstalled) {
      window.__measurementMapLinksPanelFinalObserverInstalled = true;
      new MutationObserver(() => {
        clearTimeout(window.__measurementMapLinksPanelFinalTimer);
        window.__measurementMapLinksPanelFinalTimer = setTimeout(run, 80);
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(run, 80));
  window.addEventListener("measurementMapDeviceOptionsChanged", () => setTimeout(run, 80));
  init();
})();
