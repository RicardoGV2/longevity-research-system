(() => {
  function addButton() {
    const actions = document.querySelector("#measurementMap .section-head .inline-actions");
    if (!actions || document.getElementById("quickPullMapBtn")) return;
    const button = document.createElement("button");
    button.id = "quickPullMapBtn";
    button.type = "button";
    button.className = "secondary-dark";
    button.textContent = "Pull map";
    actions.appendChild(button);
  }

  function setStatus(text, error) {
    const status = document.getElementById("measurementMapStatus");
    if (!status) return;
    status.textContent = text;
    status.style.color = error ? "#b91c1c" : "#647084";
  }

  function pullMap() {
    const api = window.LRS_MEASUREMENT_MAP_AUTO_SYNC;
    if (!api || !api.pull) {
      setStatus("Sync is still loading. Try again in a moment.", true);
      return;
    }
    setStatus("Pulling Measurement Map...");
    api.pull({ force: true });
  }

  function init() {
    addButton();
    document.addEventListener("click", (event) => {
      if (event.target && event.target.id === "quickPullMapBtn") pullMap();
      if (event.target.closest && event.target.closest(".tab[data-tab='measurementMap']")) {
        setTimeout(addButton, 100);
        setTimeout(addButton, 600);
        setTimeout(addButton, 1600);
      }
    }, true);
    window.addEventListener("measurementMapTabsRebuilt", () => setTimeout(addButton, 100));
    window.addEventListener("measurementMapEnhancementsLoaded", () => setTimeout(addButton, 100));
    [100, 600, 1600, 3500].forEach((delay) => setTimeout(addButton, delay));
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
  init();
})();
