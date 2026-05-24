(() => {
  function installStyles() {
    if (document.getElementById("measurementMapInteractionFixStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapInteractionFixStyles";
    style.textContent = `
      /* Keep Measurement Map images useful but not dominant. */
      #measurementMap .map-card.map-card-ui-v2 {
        grid-template-columns: minmax(112px, 148px) minmax(0, 1fr) !important;
        align-items: start !important;
      }

      #measurementMap .map-card-ui-v2 .map-photo {
        align-self: start !important;
        width: 100% !important;
        height: 154px !important;
        min-height: 154px !important;
        max-height: 154px !important;
        border-right: 1px solid var(--line) !important;
        border-bottom: 0 !important;
        overflow: hidden !important;
      }

      #measurementMap .map-card-ui-v2 .map-photo img {
        width: 100% !important;
        height: 154px !important;
        min-height: 154px !important;
        max-height: 154px !important;
        object-fit: cover !important;
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
          grid-template-columns: 112px minmax(0, 1fr) !important;
        }

        #measurementMap .map-card-ui-v2 .map-photo,
        #measurementMap .map-card-ui-v2 .map-photo img {
          height: 136px !important;
          min-height: 136px !important;
          max-height: 136px !important;
        }
      }

      @media (max-width: 560px) {
        #measurementMap .map-card.map-card-ui-v2 {
          grid-template-columns: 1fr !important;
        }

        #measurementMap .map-card-ui-v2 .map-photo {
          height: 150px !important;
          min-height: 150px !important;
          max-height: 150px !important;
          border-right: 0 !important;
          border-bottom: 1px solid var(--line) !important;
        }

        #measurementMap .map-card-ui-v2 .map-photo img {
          height: 150px !important;
          min-height: 150px !important;
          max-height: 150px !important;
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
