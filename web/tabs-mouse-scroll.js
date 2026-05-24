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
    if (!tabs || tabs.dataset.mouseScrollInstalled === "2") return;
    tabs.dataset.mouseScrollInstalled = "2";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let dragged = false;
    let pointerDownTab = null;
    let suppressClickUntil = 0;

    function canScrollHorizontally() {
      return tabs.scrollWidth > tabs.clientWidth + 2;
    }

    function tabAtPoint(x, y) {
      return document.elementFromPoint(x, y)?.closest?.(".tabs .tab") || null;
    }

    function reset() {
      pointerId = null;
      dragged = false;
      pointerDownTab = null;
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
      pointerDownTab = event.target.closest?.(".tabs .tab") || null;
      tabs.setPointerCapture?.(pointerId);
    }, true);

    tabs.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!dragged && Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (!dragged && Math.abs(dx) < Math.abs(dy) * 1.15) return;

      const nextScrollLeft = startScrollLeft - dx;
      const changed = Math.abs(nextScrollLeft - tabs.scrollLeft) > 1;
      dragged = true;
      tabs.classList.add("tabs-dragging");
      tabs.scrollLeft = nextScrollLeft;
      if (changed) event.preventDefault();
    }, true);

    tabs.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) return;

      const downTab = pointerDownTab;
      const upTab = tabAtPoint(event.clientX, event.clientY);
      const wasDragged = dragged && Math.abs(tabs.scrollLeft - startScrollLeft) > 4;

      tabs.releasePointerCapture?.(pointerId);
      reset();

      if (wasDragged) {
        suppressClickUntil = Date.now() + 220;
        return;
      }

      if (downTab && upTab === downTab) {
        // On some iPad/Safari mouse paths, pointer capture prevents the normal click
        // from reaching the tab. Fire a safe fallback click for non-drag taps.
        setTimeout(() => downTab.click(), 0);
      }
    }, true);

    tabs.addEventListener("pointercancel", reset, true);
    tabs.addEventListener("lostpointercapture", () => {
      if (dragged && Math.abs(tabs.scrollLeft - startScrollLeft) > 4) suppressClickUntil = Date.now() + 220;
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
