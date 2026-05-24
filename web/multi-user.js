(() => {
  const PROFILE_SCHEMA = "profiles.v1";
  const USER_KEYS = ["dailyLogs", "foodLogs", "measurements", "recipeExperiments", "analyses"];

  function uid(prefix = "user") {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}_${id}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function safeText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function initials(name) {
    const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function emptyUserData() {
    return {
      dailyLogs: [],
      foodLogs: [],
      measurements: [],
      recipeExperiments: [],
      analyses: typeof defaultAnalyses === "function" ? defaultAnalyses() : { categories: [], items: [] }
    };
  }

  function extractUserData(sourceState = state) {
    const empty = emptyUserData();
    return {
      dailyLogs: Array.isArray(sourceState.dailyLogs) ? clone(sourceState.dailyLogs) : [],
      foodLogs: Array.isArray(sourceState.foodLogs) ? clone(sourceState.foodLogs) : [],
      measurements: Array.isArray(sourceState.measurements) ? clone(sourceState.measurements) : [],
      recipeExperiments: Array.isArray(sourceState.recipeExperiments) ? clone(sourceState.recipeExperiments) : [],
      analyses: sourceState.analyses ? clone(sourceState.analyses) : empty.analyses
    };
  }

  function createBlankDataFromTemplate(templateState = state) {
    const data = emptyUserData();
    const analyses = templateState?.analyses;
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

  function ensureProfiles() {
    if (!state.multiUser || state.multiUser.schemaVersion !== PROFILE_SCHEMA) {
      const id = uid("profile");
      state.multiUser = {
        schemaVersion: PROFILE_SCHEMA,
        activeProfileId: id,
        profiles: [{ id, name: "Ricardo", createdAt: new Date().toISOString() }],
        profileData: { [id]: extractUserData(state) }
      };
    }

    if (!Array.isArray(state.multiUser.profiles) || !state.multiUser.profiles.length) {
      const id = uid("profile");
      state.multiUser.profiles = [{ id, name: "Ricardo", createdAt: new Date().toISOString() }];
      state.multiUser.activeProfileId = id;
    }

    if (!state.multiUser.profileData || typeof state.multiUser.profileData !== "object") {
      state.multiUser.profileData = {};
    }

    if (!state.multiUser.activeProfileId || !state.multiUser.profiles.some((p) => p.id === state.multiUser.activeProfileId)) {
      state.multiUser.activeProfileId = state.multiUser.profiles[0].id;
    }

    for (const profile of state.multiUser.profiles) {
      if (!state.multiUser.profileData[profile.id]) {
        state.multiUser.profileData[profile.id] = createBlankDataFromTemplate(state);
      }
    }
  }

  function activeProfile() {
    ensureProfiles();
    return state.multiUser.profiles.find((p) => p.id === state.multiUser.activeProfileId) || state.multiUser.profiles[0];
  }

  function captureActiveProfile() {
    ensureProfiles();
    const id = state.multiUser.activeProfileId;
    state.multiUser.profileData[id] = extractUserData(state);
    state.multiUser.updatedAt = new Date().toISOString();
  }

  function applyProfileData(profileId) {
    ensureProfiles();
    const data = state.multiUser.profileData[profileId] || emptyUserData();
    for (const key of USER_KEYS) {
      state[key] = clone(data[key] ?? emptyUserData()[key]);
    }
    if (!state.analyses || typeof state.analyses !== "object") state.analyses = emptyUserData().analyses;
    state.analyses.categories = Array.isArray(state.analyses.categories) ? state.analyses.categories : [];
    state.analyses.items = Array.isArray(state.analyses.items) ? state.analyses.items : [];
  }

  function persistAndRender({ closeMenu = false } = {}) {
    const keepMenuOpen = !closeMenu && isMenuOpen();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderUserMenu({ keepOpen: keepMenuOpen });
    if (typeof syncPlanEditorFromState === "function") syncPlanEditorFromState();
    if (typeof render === "function") render();
  }

  function switchProfile(profileId) {
    ensureProfiles();
    if (!state.multiUser.profiles.some((p) => p.id === profileId)) return;
    captureActiveProfile();
    state.multiUser.activeProfileId = profileId;
    applyProfileData(profileId);
    persistAndRender({ closeMenu: true });
  }

  function addProfile(name) {
    ensureProfiles();
    captureActiveProfile();
    const id = uid("profile");
    state.multiUser.profiles.push({
      id,
      name: name.trim(),
      createdAt: new Date().toISOString()
    });
    state.multiUser.profileData[id] = createBlankDataFromTemplate(state);
    state.multiUser.activeProfileId = id;
    applyProfileData(id);
    persistAndRender({ closeMenu: false });
  }

  function renameActiveProfile(name) {
    const profile = activeProfile();
    profile.name = name.trim();
    profile.updatedAt = new Date().toISOString();
    captureActiveProfile();
    persistAndRender({ closeMenu: false });
  }

  function deleteActiveProfile() {
    ensureProfiles();
    if (state.multiUser.profiles.length <= 1) {
      alert("You need at least one user profile.");
      return;
    }
    const current = activeProfile();
    const ok = confirm(`Delete user profile “${current.name}”? This removes only this profile's local app data from the current sync file.`);
    if (!ok) return;
    delete state.multiUser.profileData[current.id];
    state.multiUser.profiles = state.multiUser.profiles.filter((p) => p.id !== current.id);
    state.multiUser.activeProfileId = state.multiUser.profiles[0].id;
    applyProfileData(state.multiUser.activeProfileId);
    persistAndRender({ closeMenu: true });
  }

  function installSaveStateWrapper() {
    if (typeof saveState !== "function" || saveState.__multiUserWrapped) return;
    const originalRender = typeof render === "function" ? render : null;
    saveState = function saveStateWithProfiles() {
      ensureProfiles();
      captureActiveProfile();
      const keepMenuOpen = isMenuOpen();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderUserMenu({ keepOpen: keepMenuOpen });
      if (originalRender) originalRender();
    };
    saveState.__multiUserWrapped = true;
  }

  function installSyncWrappers() {
    if (typeof buildSyncPayload === "function" && !buildSyncPayload.__multiUserWrapped) {
      const originalBuildSyncPayload = buildSyncPayload;
      buildSyncPayload = function buildSyncPayloadWithProfiles() {
        ensureProfiles();
        captureActiveProfile();
        const payload = originalBuildSyncPayload();
        payload.schemaVersion = "0.2";
        payload.profileSchemaVersion = PROFILE_SCHEMA;
        payload.activeProfileId = state.multiUser.activeProfileId;
        payload.profiles = clone(state.multiUser.profiles);
        payload.profileData = clone(state.multiUser.profileData);
        return payload;
      };
      buildSyncPayload.__multiUserWrapped = true;
    }

    if (typeof pullFromGitHub === "function" && !pullFromGitHub.__multiUserWrapped) {
      const originalPull = pullFromGitHub;
      pullFromGitHub = async function pullFromGitHubWithProfiles() {
        await originalPull();
        ensureProfiles();
        applyProfileData(state.multiUser.activeProfileId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderUserMenu({ keepOpen: false });
        if (typeof render === "function") render();
      };
      pullFromGitHub.__multiUserWrapped = true;
    }
  }

  function installStyles() {
    if (document.getElementById("multiUserStyles")) return;
    const style = document.createElement("style");
    style.id = "multiUserStyles";
    style.textContent = `
      .user-switcher-card { display: none !important; }
      .profile-menu-wrap { position: relative; display: inline-flex; align-items: center; }
      .profile-button {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        min-height: 44px;
        padding: 5px 7px 5px 5px;
        border-radius: 999px;
        color: white;
        background: rgba(255, 255, 255, 0.14);
        border: 1px solid rgba(255, 255, 255, 0.24);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
      }
      .profile-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        font-weight: 900;
        letter-spacing: -0.04em;
        color: #1d4ed8;
        background: linear-gradient(135deg, #eff6ff, #ffffff);
        border: 1px solid rgba(255, 255, 255, 0.75);
        flex: 0 0 auto;
      }
      .profile-button-name {
        max-width: 124px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 800;
      }
      .profile-chevron { opacity: 0.84; font-size: 0.84rem; padding-right: 2px; }
      .profile-popover {
        position: absolute;
        z-index: 80;
        right: 0;
        top: calc(100% + 10px);
        width: min(340px, calc(100vw - 28px));
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.98);
        color: #182033;
        border: 1px solid var(--line);
        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
        padding: 14px;
        transform-origin: top right;
      }
      .profile-popover[hidden] { display: none !important; }
      .profile-popover-head {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr);
        gap: 11px;
        align-items: center;
        padding: 4px 4px 12px;
        border-bottom: 1px solid var(--line);
      }
      .profile-popover .profile-avatar {
        width: 44px;
        height: 44px;
        background: #eef6ff;
        color: #1d4ed8;
        border-color: #bfdbfe;
      }
      .profile-hello {
        margin: 0;
        color: var(--muted);
        font-size: 0.84rem;
        font-weight: 650;
      }
      .profile-active-name {
        margin: 2px 0 0;
        font-size: 1.18rem;
        font-weight: 900;
        color: #111827;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .profile-menu-section {
        padding: 12px 2px 0;
      }
      .profile-menu-section-title {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 0.74rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.09em;
      }
      .profile-list {
        display: grid;
        gap: 7px;
      }
      .profile-list-button {
        width: 100%;
        min-height: 44px;
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) auto;
        align-items: center;
        gap: 9px;
        border-radius: 14px;
        padding: 6px 8px;
        background: #ffffff;
        color: #182033;
        border: 1px solid var(--line);
        text-align: left;
      }
      .profile-list-button.active {
        background: #eef6ff;
        border-color: #bfdbfe;
        color: #1d4ed8;
      }
      .profile-list-button .profile-avatar {
        width: 32px;
        height: 32px;
        background: #f8fafc;
        color: #475569;
        border-color: #dbe3ef;
        box-shadow: none;
      }
      .profile-list-button.active .profile-avatar {
        background: #dbeafe;
        color: #1d4ed8;
        border-color: #bfdbfe;
      }
      .profile-list-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 850;
      }
      .profile-active-mark {
        font-size: 0.8rem;
        font-weight: 850;
        color: #1d4ed8;
      }
      .profile-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .profile-actions-grid button {
        min-height: 42px;
      }
      .profile-actions-grid .danger { grid-column: 1 / -1; }
      .profile-menu-backdrop {
        position: fixed;
        inset: 0;
        z-index: 70;
        background: rgba(15, 23, 42, 0.14);
      }
      .profile-menu-backdrop[hidden] { display: none !important; }
      @media (max-width: 640px) {
        .profile-button {
          padding: 5px;
          min-width: 44px;
          justify-content: center;
        }
        .profile-button-name,
        .profile-chevron { display: none; }
        .profile-popover {
          position: fixed;
          left: 12px;
          right: 12px;
          top: auto;
          bottom: max(12px, env(safe-area-inset-bottom));
          width: auto;
          border-radius: 24px;
          transform-origin: bottom center;
        }
        .profile-actions-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function removeOldCard() {
    document.getElementById("userSwitcherCard")?.remove();
  }

  function ensureProfileMenuElement() {
    removeOldCard();
    let wrap = document.getElementById("profileMenuWrap");
    if (wrap) return wrap;

    const headerActions = document.querySelector(".header-actions");
    if (!headerActions) return null;

    wrap = document.createElement("div");
    wrap.id = "profileMenuWrap";
    wrap.className = "profile-menu-wrap";
    wrap.innerHTML = `
      <button type="button" id="profileMenuButton" class="profile-button" aria-haspopup="dialog" aria-expanded="false" title="Switch user">
        <span class="profile-avatar" aria-hidden="true">U</span>
        <span class="profile-button-name">User</span>
        <span class="profile-chevron" aria-hidden="true">▾</span>
      </button>
      <div id="profilePopover" class="profile-popover" role="dialog" aria-label="User profiles" hidden></div>
    `;
    headerActions.appendChild(wrap);

    let backdrop = document.getElementById("profileMenuBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "profileMenuBackdrop";
      backdrop.className = "profile-menu-backdrop";
      backdrop.hidden = true;
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", () => closeMenu());
    }

    wrap.querySelector("#profileMenuButton")?.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    return wrap;
  }

  function isMenuOpen() {
    const popover = document.getElementById("profilePopover");
    return Boolean(popover && !popover.hidden);
  }

  function openMenu() {
    const popover = document.getElementById("profilePopover");
    const btn = document.getElementById("profileMenuButton");
    const backdrop = document.getElementById("profileMenuBackdrop");
    if (!popover || !btn) return;
    popover.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    if (backdrop) backdrop.hidden = false;
  }

  function closeMenu() {
    const popover = document.getElementById("profilePopover");
    const btn = document.getElementById("profileMenuButton");
    const backdrop = document.getElementById("profileMenuBackdrop");
    if (popover) popover.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.hidden = true;
  }

  function toggleMenu() {
    if (isMenuOpen()) closeMenu();
    else openMenu();
  }

  function renderUserMenu({ keepOpen = false } = {}) {
    ensureProfiles();
    installStyles();
    const wrap = ensureProfileMenuElement();
    if (!wrap) return;

    const shouldOpenAfterRender = Boolean(keepOpen);
    const active = activeProfile();
    const button = wrap.querySelector("#profileMenuButton");
    const buttonAvatar = button.querySelector(".profile-avatar");
    const buttonName = button.querySelector(".profile-button-name");
    const popover = wrap.querySelector("#profilePopover");

    buttonAvatar.textContent = initials(active.name);
    buttonName.textContent = active.name;
    button.title = `Editing: ${active.name}`;

    popover.innerHTML = `
      <div class="profile-popover-head">
        <span class="profile-avatar" aria-hidden="true">${safeText(initials(active.name))}</span>
        <div>
          <p class="profile-hello">Hello</p>
          <p class="profile-active-name">${safeText(active.name)}</p>
        </div>
      </div>
      <div class="profile-menu-section">
        <p class="profile-menu-section-title">Switch user</p>
        <div class="profile-list">
          ${state.multiUser.profiles.map((profile) => `
            <button type="button" class="profile-list-button ${profile.id === active.id ? "active" : ""}" data-profile-id="${safeText(profile.id)}">
              <span class="profile-avatar" aria-hidden="true">${safeText(initials(profile.name))}</span>
              <span class="profile-list-name">${safeText(profile.name)}</span>
              ${profile.id === active.id ? `<span class="profile-active-mark">Active</span>` : ""}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="profile-menu-section">
        <p class="profile-menu-section-title">Profile actions</p>
        <div class="profile-actions-grid">
          <button type="button" id="addProfileBtn" class="secondary-dark">+ Add user</button>
          <button type="button" id="renameProfileBtn" class="secondary-dark">Rename</button>
          <button type="button" id="deleteProfileBtn" class="danger">Delete active user</button>
        </div>
      </div>
    `;

    popover.querySelectorAll(".profile-list-button").forEach((btn) => {
      btn.addEventListener("click", () => switchProfile(btn.dataset.profileId));
    });
    popover.querySelector("#addProfileBtn")?.addEventListener("click", () => {
      const name = prompt("Name for the new user profile:", "Janet");
      if (!name || !name.trim()) return;
      addProfile(name);
    });
    popover.querySelector("#renameProfileBtn")?.addEventListener("click", () => {
      const current = activeProfile();
      const name = prompt("Rename active user profile:", current.name);
      if (!name || !name.trim()) return;
      renameActiveProfile(name);
    });
    popover.querySelector("#deleteProfileBtn")?.addEventListener("click", deleteActiveProfile);

    if (shouldOpenAfterRender) openMenu();
    else closeMenu();
  }

  function init({ keepMenuOpen = false } = {}) {
    ensureProfiles();
    applyProfileData(state.multiUser.activeProfileId);
    installSaveStateWrapper();
    installSyncWrappers();
    renderUserMenu({ keepOpen: keepMenuOpen });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  init({ keepMenuOpen: false });
  document.addEventListener("DOMContentLoaded", () => {
    [100, 600, 1400].forEach((delay) => setTimeout(() => {
      const keepOpen = isMenuOpen();
      installSyncWrappers();
      init({ keepMenuOpen: keepOpen });
    }, delay));
  });
})();
