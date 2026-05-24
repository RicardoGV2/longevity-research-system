(() => {
  const PROFILE_SCHEMA = "profiles.v1";
  const USER_KEYS = ["dailyLogs", "foodLogs", "measurements", "recipeExperiments", "analyses"];

  function makeId(prefix = "profile") {
    const raw = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}_${raw}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function initials(name) {
    const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function defaultUserData() {
    return {
      dailyLogs: [],
      foodLogs: [],
      measurements: [],
      recipeExperiments: [],
      analyses: typeof defaultAnalyses === "function" ? defaultAnalyses() : { categories: [], items: [] }
    };
  }

  function currentUserData() {
    const empty = defaultUserData();
    return {
      dailyLogs: Array.isArray(state.dailyLogs) ? clone(state.dailyLogs) : [],
      foodLogs: Array.isArray(state.foodLogs) ? clone(state.foodLogs) : [],
      measurements: Array.isArray(state.measurements) ? clone(state.measurements) : [],
      recipeExperiments: Array.isArray(state.recipeExperiments) ? clone(state.recipeExperiments) : [],
      analyses: state.analyses ? clone(state.analyses) : empty.analyses
    };
  }

  function blankDataFromCurrentTemplate() {
    const data = defaultUserData();
    const analyses = state?.analyses;
    if (analyses?.categories?.length) {
      data.analyses.categories = clone(analyses.categories);
      data.analyses.items = (analyses.items || []).map((item) => ({
        ...clone(item),
        status: "pending",
        priority: item.kind === "personal_fact" ? "none" : (item.priority || "none"),
        notes: "",
        cost: "",
        invasiveness: "",
        actionability: "",
        targetDate: "",
        updates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    }
    return data;
  }

  function ensureProfileState() {
    if (!state.multiUser || state.multiUser.schemaVersion !== PROFILE_SCHEMA) {
      const id = makeId();
      state.multiUser = {
        schemaVersion: PROFILE_SCHEMA,
        activeProfileId: id,
        profiles: [{ id, name: "Ricardo", createdAt: new Date().toISOString() }],
        profileData: { [id]: currentUserData() }
      };
    }
    if (!Array.isArray(state.multiUser.profiles)) state.multiUser.profiles = [];
    if (!state.multiUser.profiles.length) {
      const id = makeId();
      state.multiUser.profiles.push({ id, name: "Ricardo", createdAt: new Date().toISOString() });
      state.multiUser.activeProfileId = id;
    }
    if (!state.multiUser.profileData || typeof state.multiUser.profileData !== "object") {
      state.multiUser.profileData = {};
    }
    if (!state.multiUser.activeProfileId || !state.multiUser.profiles.some((p) => p.id === state.multiUser.activeProfileId)) {
      state.multiUser.activeProfileId = state.multiUser.profiles[0].id;
    }
    for (const profile of state.multiUser.profiles) {
      if (!state.multiUser.profileData[profile.id]) state.multiUser.profileData[profile.id] = blankDataFromCurrentTemplate();
    }
  }

  function applyUserData(data) {
    const empty = defaultUserData();
    for (const key of USER_KEYS) state[key] = clone(data[key] ?? empty[key]);
    if (!state.analyses || typeof state.analyses !== "object") state.analyses = empty.analyses;
    state.analyses.categories = Array.isArray(state.analyses.categories) ? state.analyses.categories : [];
    state.analyses.items = Array.isArray(state.analyses.items) ? state.analyses.items : [];
  }

  function quickUpdateButton(profile) {
    document.querySelectorAll("#profileMenuButton .profile-avatar").forEach((el) => { el.textContent = initials(profile.name); });
    document.querySelectorAll("#profileMenuButton .profile-button-name").forEach((el) => { el.textContent = profile.name; });
    const btn = document.getElementById("profileMenuButton");
    if (btn) btn.title = `Editing: ${profile.name}`;
  }

  function saveAndRefreshProfileUI(profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    quickUpdateButton(profile);
    if (typeof saveState === "function") saveState();
    else if (typeof render === "function") render();
    if (typeof markUnsyncedLocalChange === "function") markUnsyncedLocalChange("profile added");
    if (typeof scheduleAutoPush === "function") scheduleAutoPush("profile added", 3000);
  }

  function robustAddProfile(name) {
    const clean = String(name || "").trim();
    if (!clean) return false;

    ensureProfileState();
    const previousId = state.multiUser.activeProfileId;
    state.multiUser.profileData[previousId] = currentUserData();

    const id = makeId();
    const profile = {
      id,
      name: clean,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.multiUser.profiles.push(profile);
    state.multiUser.profileData[id] = blankDataFromCurrentTemplate();
    state.multiUser.activeProfileId = id;
    applyUserData(state.multiUser.profileData[id]);
    state.multiUser.updatedAt = new Date().toISOString();

    saveAndRefreshProfileUI(profile);
    return true;
  }

  function installAddUserCapture() {
    if (window.__multiUserAddFixInstalled) return;
    window.__multiUserAddFixInstalled = true;

    document.addEventListener("click", (event) => {
      const addButton = event.target.closest?.("#addProfileBtn");
      if (!addButton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const name = prompt("Name for the new user profile:", "Janet");
      if (!name || !name.trim()) return;

      try {
        const ok = robustAddProfile(name);
        if (!ok) return;
        const profilePopover = document.getElementById("profilePopover");
        if (profilePopover) profilePopover.hidden = true;
        const backdrop = document.getElementById("profileMenuBackdrop");
        if (backdrop) backdrop.hidden = true;
        const profileButton = document.getElementById("profileMenuButton");
        if (profileButton) profileButton.setAttribute("aria-expanded", "false");
      } catch (error) {
        console.error("Could not add user profile", error);
        alert(`Could not add the user profile: ${error.message}`);
      }
    }, true);
  }

  installAddUserCapture();
})();
