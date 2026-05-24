(() => {
  function installStyles() {
    if (document.getElementById("tabsMouseScrollStyles")) return;
    const style = document.createElement("style");
    style.id = "tabsMouseScrollStyles";
    style.textContent = `
      .tabs {
        cursor: grab;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
        scrollbar-width: none;
      }

      .tabs::-webkit-scrollbar {
        display: none;
      }

      .tabs.tabs-dragging {
        cursor: grabbing;
        user-select: none;
        -webkit-user-select: none;
      }

      .tabs.tabs-dragging .tab {
        pointer-events: none;
      }

      .tabs .tab {
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  }

  function installDragScroll(tabs) {
    if (!tabs || tabs.dataset.mouseScrollInstalled === "1") return;
    tabs.dataset.mouseScrollInstalled = "1";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let dragged = false;
    let suppressClickUntil = 0;

    function canScrollHorizontally() {
      return tabs.scrollWidth > tabs.clientWidth + 2;
    }

    function reset() {
      pointerId = null;
      dragged = false;
      tabs.classList.remove("tabs-dragging");
    }

    tabs.addEventListener("pointerdown", (event) => {
      if (!canScrollHorizontally()) return;
      if (event.pointerType === "touch") return;
      if (event.button !== undefined && event.button !== 0) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = tabs.scrollLeft;
      dragged = false;
      tabs.setPointerCapture?.(pointerId);
    }, true);

    tabs.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!dragged && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (!dragged && Math.abs(dx) < Math.abs(dy) * 0.75) return;

      dragged = true;
      tabs.classList.add("tabs-dragging");
      tabs.scrollLeft = startScrollLeft - dx;
      event.preventDefault();
    }, true);

    tabs.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) return;
      if (dragged) suppressClickUntil = Date.now() + 350;
      tabs.releasePointerCapture?.(pointerId);
      reset();
    }, true);

    tabs.addEventListener("pointercancel", reset, true);
    tabs.addEventListener("lostpointercapture", () => {
      if (dragged) suppressClickUntil = Date.now() + 350;
      reset();
    }, true);

    tabs.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    tabs.addEventListener("wheel", (event) => {
      if (!canScrollHorizontally()) return;
      const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!rawDelta) return;

      const before = tabs.scrollLeft;
      tabs.scrollLeft += rawDelta;
      if (tabs.scrollLeft !== before) event.preventDefault();
    }, { passive: false });
  }

  function init() {
    installStyles();
    document.querySelectorAll(".tabs").forEach(installDragScroll);
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
