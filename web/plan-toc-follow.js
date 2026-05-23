(() => {
  const DESKTOP_BREAKPOINT = 781;
  const BASE_MARGIN = 14;
  const MIN_TOC_WIDTH = 190;
  const MAX_TOC_WIDTH = 280;

  let followStartY = null;
  let lastActiveAnchor = null;

  function getPlanElements() {
    return {
      plan: document.getElementById("plan"),
      shell: document.querySelector("#plan .plan-shell"),
      toc: document.querySelector("#plan .plan-toc"),
      tocList: document.getElementById("planTocList"),
      preview: document.getElementById("planPreview"),
      tabs: document.querySelector(".tabs")
    };
  }

  function safeTopOffset() {
    const { tabs } = getPlanElements();
    if (!tabs) return BASE_MARGIN;
    const rect = tabs.getBoundingClientRect();
    if (rect.bottom > BASE_MARGIN && rect.top < window.innerHeight) {
      return Math.ceil(rect.bottom + 10);
    }
    return BASE_MARGIN;
  }

  function ensureStyles() {
    if (document.getElementById("planTocFollowStyles")) return;
    const style = document.createElement("style");
    style.id = "planTocFollowStyles";
    style.textContent = `
      #plan .plan-shell { align-items: start; }
      #plan .plan-toc {
        align-self: start;
        background: #fbfcff;
        border: 1px solid var(--line);
        border-radius: 18px;
      }
      #plan .plan-toc.is-following {
        position: fixed !important;
        top: var(--plan-toc-top, ${BASE_MARGIN}px) !important;
        left: var(--plan-toc-left) !important;
        width: var(--plan-toc-width) !important;
        height: calc(100vh - var(--plan-toc-top, ${BASE_MARGIN}px) - ${BASE_MARGIN}px) !important;
        max-height: calc(100vh - var(--plan-toc-top, ${BASE_MARGIN}px) - ${BASE_MARGIN}px) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        z-index: 40;
        box-shadow: 0 14px 36px rgba(15, 23, 42, 0.16);
      }
      #plan .plan-toc-spacer { display: none; }
      #plan .plan-toc-spacer.is-active {
        display: block;
        width: var(--plan-toc-width);
        min-height: 1px;
        flex: 0 0 var(--plan-toc-width);
      }
      #plan .plan-view { min-width: 0; position: relative; z-index: 1; }
      #plan .plan-toc-title {
        flex: 0 0 auto;
        position: sticky;
        top: 0;
        z-index: 2;
        background: #fbfcff;
        padding-bottom: 8px;
      }
      #plan #planTocList { min-height: 0; scroll-behavior: auto !important; }
      #plan .plan-toc.is-following #planTocList {
        flex: 1 1 auto;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 3px;
        overscroll-behavior: contain;
        scroll-behavior: auto !important;
      }
      #plan .plan-toc a.active {
        background: #e8efff;
        color: #1d4ed8;
        font-weight: 850;
        border-radius: 10px;
        padding-left: 8px;
        padding-right: 8px;
      }
      @media (max-width: 780px) {
        #plan .plan-toc.is-following {
          position: relative !important;
          top: 0 !important;
          left: auto !important;
          width: auto !important;
          height: auto !important;
          max-height: 290px !important;
          overflow-y: auto !important;
          display: block !important;
          box-shadow: none;
        }
        #plan .plan-toc.is-following #planTocList { overflow: visible; }
        #plan .plan-toc-spacer.is-active { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSpacer() {
    const { shell, toc } = getPlanElements();
    if (!shell || !toc) return null;
    let spacer = document.getElementById("planTocSpacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.id = "planTocSpacer";
      spacer.className = "plan-toc-spacer";
      shell.insertBefore(spacer, toc);
    }
    return spacer;
  }

  function resetToc() {
    const { toc } = getPlanElements();
    const spacer = document.getElementById("planTocSpacer");
    if (toc) {
      toc.classList.remove("is-following");
      toc.style.removeProperty("--plan-toc-left");
      toc.style.removeProperty("--plan-toc-width");
      toc.style.removeProperty("--plan-toc-top");
    }
    if (spacer) {
      spacer.classList.remove("is-active");
      spacer.style.removeProperty("--plan-toc-width");
    }
  }

  function calculateFollowStartY() {
    const { toc } = getPlanElements();
    const spacer = ensureSpacer();
    if (!toc || !spacer) return null;
    const anchor = toc.classList.contains("is-following") ? spacer : toc;
    return window.scrollY + anchor.getBoundingClientRect().top - safeTopOffset();
  }

  function updateStickyToc() {
    const { plan, shell, toc } = getPlanElements();
    const spacer = ensureSpacer();
    if (!plan || !shell || !toc || !spacer) return;

    const planIsActive = plan.classList.contains("active");
    if (!planIsActive || window.innerWidth < DESKTOP_BREAKPOINT) {
      resetToc();
      followStartY = null;
      return;
    }

    if (!toc.classList.contains("is-following")) {
      followStartY = calculateFollowStartY();
    }

    const top = safeTopOffset();
    const planRect = plan.getBoundingClientRect();
    const shouldFollow = followStartY !== null && window.scrollY >= followStartY && planRect.bottom > top + 220;
    if (!shouldFollow) {
      resetToc();
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const widthSource = spacer.getBoundingClientRect();
    const width = Math.max(MIN_TOC_WIDTH, Math.min(widthSource.width || 260, MAX_TOC_WIDTH));
    const left = Math.max(8, shellRect.left);

    toc.style.setProperty("--plan-toc-top", `${top}px`);
    toc.style.setProperty("--plan-toc-left", `${left}px`);
    toc.style.setProperty("--plan-toc-width", `${width}px`);
    spacer.style.setProperty("--plan-toc-width", `${width}px`);
    spacer.classList.add("is-active");
    toc.classList.add("is-following");
  }

  function findCurrentHeading() {
    const { preview } = getPlanElements();
    if (!preview || preview.classList.contains("is-hidden")) return null;
    const headings = [...preview.querySelectorAll("h1, h2, h3, h4")];
    if (!headings.length) return null;
    return headings.filter((heading) => heading.getBoundingClientRect().top <= 150).pop() || headings[0];
  }

  function jumpListToActiveLink(activeLink) {
    const { tocList, toc } = getPlanElements();
    if (!tocList || !toc || !activeLink || !toc.classList.contains("is-following")) return;
    const anchor = activeLink.dataset.anchor;
    if (anchor === lastActiveAnchor) return;
    lastActiveAnchor = anchor;
    tocList.scrollTop = Math.max(0, activeLink.offsetTop - 52);
  }

  function updateActiveLink() {
    const { tocList } = getPlanElements();
    if (!tocList) return;
    const current = findCurrentHeading();
    const currentId = current?.id;
    let activeLink = null;
    tocList.querySelectorAll("a").forEach((link) => {
      const isActive = currentId && link.dataset.anchor === currentId;
      link.classList.toggle("active", Boolean(isActive));
      if (isActive) activeLink = link;
    });
    jumpListToActiveLink(activeLink);
  }

  function update() {
    updateStickyToc();
    updateActiveLink();
  }

  function recalculateLater() {
    followStartY = null;
    lastActiveAnchor = null;
    resetToc();
    setTimeout(update, 120);
  }

  function install() {
    ensureStyles();
    ensureSpacer();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", recalculateLater, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(recalculateLater, 250), { passive: true });
    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setTimeout(recalculateLater, 150)));
    const observer = new MutationObserver(() => setTimeout(update, 80));
    const plan = document.getElementById("plan");
    if (plan) observer.observe(plan, { childList: true, subtree: true, attributes: true });
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 900));
})();
