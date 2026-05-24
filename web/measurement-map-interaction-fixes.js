(() => {
  function installStyles() {
    if (document.getElementById("measurementMapInteractionFixStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapInteractionFixStyles";
    style.textContent = `
      /* Compact image + full-width information boards. */
      #measurementMap .map-card.map-card-ui-v2 {
        grid-template-columns: minmax(104px, 136px) minmax(0, 1fr) !important;
        align-items: start !important;
        gap: 0 !important;
      }

      #measurementMap .map-card-ui-v2 .map-photo {
        grid-column: 1 !important;
        grid-row: 1 / span 2 !important;
        align-self: start !important;
        width: 100% !important;
        height: 132px !important;
        min-height: 132px !important;
        max-height: 132px !important;
        border-right: 1px solid var(--line) !important;
        border-bottom: 1px solid var(--line) !important;
        border-bottom-right-radius: 18px !important;
        overflow: hidden !important;
      }

      #measurementMap .map-card-ui-v2 .map-photo img {
        width: 100% !important;
        height: 132px !important;
        min-height: 132px !important;
        max-height: 132px !important;
        object-fit: cover !important;
      }

      #measurementMap .map-card-ui-v2 .map-body {
        display: contents !important;
      }

      #measurementMap .map-card-ui-v2 .map-title,
      #measurementMap .map-card-ui-v2 .map-info-tabs {
        grid-column: 2 !important;
        padding-left: 18px !important;
        padding-right: 18px !important;
      }

      #measurementMap .map-card-ui-v2 .map-title {
        padding-top: 18px !important;
      }

      #measurementMap .map-card-ui-v2 .map-info-tabs {
        padding-bottom: 10px !important;
      }

      #measurementMap .map-card-ui-v2 .map-info-panels,
      #measurementMap .map-card-ui-v2 .map-analysis-links {
        grid-column: 1 / -1 !important;
        margin-left: 16px !important;
        margin-right: 16px !important;
      }

      #measurementMap .map-card-ui-v2 .map-info-panels {
        margin-top: 0 !important;
        margin-bottom: 12px !important;
      }

      #measurementMap .map-card-ui-v2 .map-analysis-links {
        margin-bottom: 16px !important;
      }

      #measurementMap .map-card-ui-v2 .map-info-panel {
        min-height: 82px !important;
      }

      /* Make linked chips behave like buttons on mouse and touch, not selectable text. */
      #measurementMap .map-analysis-chip,
      #measurementMap .map-analysis-chip *,
      .analysis-device-chip,
      .analysis-device-chip *,
      .map-info-tab,
      .map-info-tab * {
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      #measurementMap .map-analysis-chip,
      .analysis-device-chip,
      .map-info-tab {
        cursor: pointer !important;
        touch-action: manipulation !important;
      }

      #measurementMap .map-analysis-chip:active,
      .analysis-device-chip:active,
      .map-info-tab:active {
        transform: translateY(1px);
      }

      @media (max-width: 720px) {
        #measurementMap .map-card.map-card-ui-v2 {
          grid-template-columns: 104px minmax(0, 1fr) !important;
        }

        #measurementMap .map-card-ui-v2 .map-photo,
        #measurementMap .map-card-ui-v2 .map-photo img {
          height: 122px !important;
          min-height: 122px !important;
          max-height: 122px !important;
        }

        #measurementMap .map-card-ui-v2 .map-title,
        #measurementMap .map-card-ui-v2 .map-info-tabs {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        #measurementMap .map-card-ui-v2 .map-info-panels,
        #measurementMap .map-card-ui-v2 .map-analysis-links {
          margin-left: 12px !important;
          margin-right: 12px !important;
        }
      }

      @media (max-width: 560px) {
        #measurementMap .map-card.map-card-ui-v2 {
          grid-template-columns: 1fr !important;
        }

        #measurementMap .map-card-ui-v2 .map-photo {
          grid-column: 1 !important;
          grid-row: auto !important;
          height: 138px !important;
          min-height: 138px !important;
          max-height: 138px !important;
          border-right: 0 !important;
          border-bottom: 1px solid var(--line) !important;
          border-bottom-right-radius: 0 !important;
        }

        #measurementMap .map-card-ui-v2 .map-photo img {
          height: 138px !important;
          min-height: 138px !important;
          max-height: 138px !important;
        }

        #measurementMap .map-card-ui-v2 .map-title,
        #measurementMap .map-card-ui-v2 .map-info-tabs,
        #measurementMap .map-card-ui-v2 .map-info-panels,
        #measurementMap .map-card-ui-v2 .map-analysis-links {
          grid-column: 1 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installSelectionGuards() {
    if (window.__measurementMapSelectionGuardsInstalled) return;
    window.__measurementMapSelectionGuardsInstalled = true;

    const isInteractiveChip = (target) => target?.closest?.("#measurementMap .map-analysis-chip, .analysis-device-chip, .map-info-tab");

    document.addEventListener("selectstart", (event) => {
      if (isInteractiveChip(event.target)) event.preventDefault();
    }, true);

    document.addEventListener("dragstart", (event) => {
      if (isInteractiveChip(event.target)) event.preventDefault();
    }, true);

    document.addEventListener("mousedown", (event) => {
      if (isInteractiveChip(event.target)) {
        const selection = window.getSelection?.();
        if (selection && !selection.isCollapsed) selection.removeAllRanges();
      }
    }, true);
  }

  function init() {
    installStyles();
    installSelectionGuards();
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
