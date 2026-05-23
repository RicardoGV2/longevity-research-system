(() => {
  const DESKTOP_BREAKPOINT = 781;
  const TOP_OFFSET = 14;

  function getPlanElements() {
    return {
      plan: document.getElementById("plan"),
      shell: document.querySelector("#plan .plan-shell"),
      toc: document.querySelector("#plan .plan-toc"),
      tocList: document.getElementById("planTocList"),
      preview: document.getElementById("planPreview")
    };
  }

  function ensureStyles() {
    if (document.getElementById("planTocFollowStyles")) return;
    const style = document.createElement("style");
    style.id = "planTocFollowStyles";
    style.textContent = `
      .plan-toc.is-following {
        position: fixed !important;
        top: ${TOP_OFFSET}px !important;
        left: var(--plan-toc-left) !important;
        width: var(--plan-toc-width) !important;
        max-height: calc(100vh - ${TOP_OFFSET * 2}px) !important;
        z-index: 40;
        box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
      }

      .plan-toc a.active {
        background: #e8efff;
        color: #1d4ed8;
        font-weight: 850;
        border-radius: 10px;
        padding-left: 8px;
        padding-right: 8px;
      }

      @media (max-width: 780px) {
        .plan-toc.is-following {
          position: relative !important;
          top: 0 !important;
          left: auto !important;
          width: auto !important;
          max-height: 290px !important;
          box-shadow: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function resetToc(toc) {
    if (!toc) return;
    toc.classList.remove("is-following");
    toc.style.removeProperty("--plan-toc-left");
    toc.style.removeProperty("--plan-toc-width");
  }

  function updateStickyToc() {
    const { plan, shell, toc } = getPlanElements();
    if (!plan || !shell || !toc) return;

    const planIsActive = plan.classList.contains("active");
    if (!planIsActive || window.innerWidth < DESKTOP_BREAKPOINT) {
      resetToc(toc);
      return;
    }

    const planRect = plan.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const shouldFloat = planRect.top < TOP_OFFSET && planRect.bottom > TOP_OFFSET + 180;

    if (!shouldFloat) {
      resetToc(toc);
      return;
    }

    const normalWidth = toc.classList.contains("is-following")
      ? parseFloat(toc.style.getPropertyValue("--plan-toc-width")) || 260
      : toc.getBoundingClientRect().width;

    toc.style.setProperty("--plan-toc-left", `${Math.max(8, shellRect.left)}px`);
    toc.style.setProperty("--plan-toc-width", `${Math.max(190, Math.min(normalWidth, 280))}px`);
    toc.classList.add("is-following");
  }

  function findCurrentHeading() {
    const { preview } = getPlanElements();
    if (!preview || preview.classList.contains("is-hidden")) return null;

    const headings = [...preview.querySelectorAll("h1, h2, h3, h4")];
    if (!headings.length) return null;

    const current = headings
      .filter((heading) => heading.getBoundingClientRect().top <= 150)
      .pop();

    return current || headings[0];
  }

  function updateActiveLink() {
    const { tocList } = getPlanElements();
    if (!tocList) return;

    const current = findCurrentHeading();
    const currentId = current?.id;

    tocList.querySelectorAll("a").forEach((link) => {
      const isActive = currentId && link.dataset.anchor === currentId;
      link.classList.toggle("active", Boolean(isActive));
    });

    const active = tocList.querySelector("a.active");
    if (active) {
      const toc = active.closest(".plan-toc");
      const activeRect = active.getBoundingClientRect();
      const tocRect = toc.getBoundingClientRect();
      const isOutside = activeRect.top < tocRect.top + 20 || activeRect.bottom > tocRect.bottom - 20;
      if (isOutside) {
        active.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }

  function update() {
    updateStickyToc();
    updateActiveLink();
  }

  function install() {
    ensureStyles();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(update, 250), { passive: true });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => setTimeout(update, 150));
    });

    const observer = new MutationObserver(() => setTimeout(update, 80));
    const plan = document.getElementById("plan");
    if (plan) observer.observe(plan, { childList: true, subtree: true, attributes: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(install, 900);
  });
})();
