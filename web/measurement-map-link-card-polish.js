(() => {
  function installStyles() {
    if (document.getElementById("measurementMapLinkCardPolishStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapLinkCardPolishStyles";
    style.textContent = `
      #measurementMap .map-info-panel[data-map-info-panel="analyses"] {
        overflow: hidden !important;
      }

      #measurementMap .map-info-panel[data-map-info-panel="analyses"] > span {
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }

      #measurementMap .linked-analyses-panel-head {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 10px 12px !important;
      }

      #measurementMap .linked-analyses-panel-head strong {
        font-size: 0.9rem !important;
        letter-spacing: normal !important;
        text-transform: none !important;
        white-space: nowrap !important;
      }

      #measurementMap .linked-analyses-panel-head span {
        display: block !important;
        min-width: 0 !important;
        color: #64748b !important;
        font-size: 0.84rem !important;
        font-weight: 750 !important;
        line-height: 1.25 !important;
        letter-spacing: normal !important;
        text-transform: none !important;
        text-align: right !important;
        white-space: normal !important;
      }

      #measurementMap .clean-link-chip-row {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
        gap: 8px !important;
        align-items: stretch !important;
        width: 100% !important;
        max-height: 250px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 0 3px 3px 0 !important;
      }

      #measurementMap .clean-analysis-chip {
        box-sizing: border-box !important;
        display: grid !important;
        grid-template-columns: 28px minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        min-height: 46px !important;
        padding: 8px 10px !important;
        border-radius: 14px !important;
        overflow: hidden !important;
        text-align: left !important;
        line-height: 1.18 !important;
      }

      #measurementMap .clean-analysis-chip .chip-code,
      #measurementMap .clean-analysis-chip .chip-text {
        text-transform: none !important;
        letter-spacing: normal !important;
        text-align: left !important;
      }

      #measurementMap .clean-analysis-chip .chip-code {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        margin: 0 !important;
        border-radius: 999px !important;
        font-size: 0.74rem !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      #measurementMap .clean-analysis-chip .chip-text {
        display: -webkit-box !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: hidden !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: anywhere !important;
        font-size: 0.85rem !important;
        font-weight: 800 !important;
        color: #1d4ed8 !important;
        line-height: 1.16 !important;
      }

      @media (max-width: 760px) {
        #measurementMap .clean-link-chip-row {
          grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)) !important;
        }
      }

      @media (max-width: 560px) {
        #measurementMap .linked-analyses-panel-head {
          grid-template-columns: 1fr !important;
          align-items: start !important;
        }

        #measurementMap .linked-analyses-panel-head span {
          text-align: left !important;
        }

        #measurementMap .clean-link-chip-row {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function run() {
    installStyles();
  }

  document.addEventListener("DOMContentLoaded", run);
  window.addEventListener("measurementMapTabsRebuilt", run);
  run();
})();
