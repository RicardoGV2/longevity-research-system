(() => {
  const PLAN_TAB_SELECTOR = ".tab[data-tab='plan']";
  const PLAN_PANEL_SELECTOR = "#plan";
  const DASHBOARD_TAB_SELECTOR = ".tab[data-tab='dashboard']";
  const DASHBOARD_PANEL_SELECTOR = "#dashboard";
  const ALLOWED_PROFILE_NAMES = new Set(["ricardo"]);

  function activeProfileName() {
    try {
      const multiUser = window.state?.multiUser || state?.multiUser;
      if (!multiUser) return "";
      const activeId = multiUser.activeProfileId;
      const profile = (multiUser.profiles || []).find((p) => p.id === activeId);
      return String(profile?.name || "").trim().toLowerCase();
    } catch {
      return "";
    }
  }

  function canSeePlan() {
    return ALLOWED_PROFILE_NAMES.has(activeProfileName());
  }

  function activateDashboardIfPlanIsActive() {
    const planTab = document.querySelector(PLAN_TAB_SELECTOR);
    const planPanel = document.querySelector(PLAN_PANEL_SELECTOR);
    const dashboardTab = document.querySelector(DASHBOARD_TAB_SELECTOR);
    const dashboardPanel = document.querySelector(DASHBOARD_PANEL_SELECTOR);

    const planIsActive = planTab?.classList.contains("active") || planPanel?.classList.contains("active");
    if (!planIsActive) return;

    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    dashboardTab?.classList.add("active");
    dashboardPanel?.classList.add("active");

    try { localStorage.setItem("longevityResearchSystem.activeTab.v0.1", "dashboard"); } catch {}
  }

  function applyPlanVisibility() {
    const allowed = canSeePlan();
    const planTab = document.querySelector(PLAN_TAB_SELECTOR);
    const planPanel = document.querySelector(PLAN_PANEL_SELECTOR);

    if (planTab) {
      planTab.hidden = !allowed;
      planTab.style.display = allowed ? "" : "none";
      planTab.setAttribute("aria-hidden", allowed ? "false" : "true");
      planTab.disabled = !allowed;
    }

    if (planPanel) {
      planPanel.hidden = !allowed;
      planPanel.style.display = allowed ? "" : "none";
      planPanel.setAttribute("aria-hidden", allowed ? "false" : "true");
    }

    if (!allowed) activateDashboardIfPlanIsActive();
  }

  function installStyleGuard() {
    if (document.getElementById("planVisibilityStyles")) return;
    const style = document.createElement("style");
    style.id = "planVisibilityStyles";
    style.textContent = `
      .tab[data-tab="plan"][hidden],
      #plan[hidden] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function installRenderWrapper() {
    if (typeof render !== "function" || render.__planVisibilityWrapped) return;
    const originalRender = render;
    render = function renderWithPlanVisibility(...args) {
      const result = originalRender.apply(this, args);
      window.setTimeout(applyPlanVisibility, 0);
      return result;
    };
    render.__planVisibilityWrapped = true;
  }

  function init() {
    installStyleGuard();
    installRenderWrapper();
    applyPlanVisibility();
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".profile-list-button, #addProfileBtn, #renameProfileBtn, #deleteProfileBtn, #profileMenuButton")) {
      window.setTimeout(applyPlanVisibility, 0);
      window.setTimeout(applyPlanVisibility, 150);
      window.setTimeout(applyPlanVisibility, 600);
    }
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    [0, 100, 400, 1000, 1800].forEach((delay) => window.setTimeout(init, delay));
  });

  init();
})();
