(() => {
  function installStyles() {
    if (document.getElementById("measurementMapInnerScrollStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapInnerScrollStyles";
    style.textContent = `
      #measurementMap .map-info-tabs,
      #measurementMap .clean-link-chip-row,
      #measurementMap .device-options-table {
        cursor: grab;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
      }

      #measurementMap .map-info-tabs.inner-dragging,
      #measurementMap .clean-link-chip-row.inner-dragging,
      #measurementMap .device-options-table.inner-dragging {
        cursor: grabbing;
        user-select: none;
        -webkit-user-select: none;
      }

      #measurementMap .map-info-tabs.inner-dragging *,
      #measurementMap .clean-link-chip-row.inner-dragging *,
      #measurementMap .device-options-table.inner-dragging * {
        pointer-events: none;
      }

      #measurementMap .clean-link-chip-row {
        max-height: 280px;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        padding-right: 4px;
      }

      #measurementMap .clean-analysis-chip .chip-text {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    `;
    document.head.appendChild(style);
  }

  function installDragScroll(scroller) {
    if (!scroller || scroller.dataset.innerMouseScrollInstalled === "1") return;
    scroller.dataset.innerMouseScrollInstalled = "1";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;
    let dragged = false;
    let suppressClickUntil = 0;

    const canScrollX = () => scroller.scrollWidth > scroller.clientWidth + 2;
    const canScrollY = () => scroller.scrollHeight > scroller.clientHeight + 2;
    const reset = () => {
      pointerId = null;
      dragged = false;
      scroller.classList.remove("inner-dragging");
    };

    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      if (event.button !== undefined && event.button !== 0) return;
      if (!canScrollX() && !canScrollY()) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = scroller.scrollLeft;
      startScrollTop = scroller.scrollTop;
      dragged = false;
      scroller.setPointerCapture?.(pointerId);
    }, true);

    scroller.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragged && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      dragged = true;
      scroller.classList.add("inner-dragging");
      if (canScrollX()) scroller.scrollLeft = startScrollLeft - dx;
      if (canScrollY()) scroller.scrollTop = startScrollTop - dy;
      event.preventDefault();
    }, true);

    scroller.addEventListener("pointerup", (event) => {
      if (pointerId !== event.pointerId) return;
      if (dragged) suppressClickUntil = Date.now() + 260;
      scroller.releasePointerCapture?.(pointerId);
      reset();
    }, true);

    scroller.addEventListener("pointercancel", reset, true);
    scroller.addEventListener("lostpointercapture", reset, true);

    scroller.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    scroller.addEventListener("wheel", (event) => {
      if (!canScrollX() && !canScrollY()) return;
      const beforeLeft = scroller.scrollLeft;
      const beforeTop = scroller.scrollTop;

      if (canScrollX() && Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
        scroller.scrollLeft += event.deltaX;
      } else if (canScrollY()) {
        scroller.scrollTop += event.deltaY;
      } else if (canScrollX()) {
        scroller.scrollLeft += event.deltaY;
      }

      if (scroller.scrollLeft !== beforeLeft || scroller.scrollTop !== beforeTop) event.preventDefault();
    }, { passive: false });
  }

  function run() {
    installStyles();
    document.querySelectorAll("#measurementMap .map-info-tabs, #measurementMap .clean-link-chip-row, #measurementMap .device-options-table").forEach(installDragScroll);
  }

  function init() {
    run();
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapInnerScrollTimer);
      window.__measurementMapInnerScrollTimer = setTimeout(run, 100);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
