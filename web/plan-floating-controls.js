(() => {
  function installFloatingPlanControls() {
    if (document.getElementById("planFloatingControlsStyles")) return;

    const style = document.createElement("style");
    style.id = "planFloatingControlsStyles";
    style.textContent = `
      #plan.active #planModeToggleBtn {
        position: fixed !important;
        right: max(18px, calc((100vw - 1180px) / 2 + 28px)) !important;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 22px) !important;
        z-index: 2000 !important;
        box-shadow: 0 14px 38px rgba(15, 23, 42, 0.24) !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
      }

      #plan.active #savePlanBtn {
        position: fixed !important;
        right: max(176px, calc((100vw - 1180px) / 2 + 186px)) !important;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 22px) !important;
        z-index: 2000 !important;
        box-shadow: 0 14px 38px rgba(15, 23, 42, 0.24) !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
      }

      #plan.active #planModeToggleBtn::before {
        content: "";
      }

      @media (max-width: 780px) {
        #plan.active #planModeToggleBtn {
          right: 16px !important;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 18px) !important;
        }

        #plan.active #savePlanBtn {
          right: 16px !important;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 72px) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(installFloatingPlanControls, 650);
  });
})();
