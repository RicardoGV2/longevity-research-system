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
        profiles: [{ id, name: "Me", createdAt: new Date().toISOString() }],
        profileData: { [id]: extractUserData(state) }
      };
    }

    if (!Array.isArray(state.multiUser.profiles) || !state.multiUser.profiles.length) {
      const id = uid("profile");
      state.multiUser.profiles = [{ id, name: "Me", createdAt: new Date().toISOString() }];
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

  function persistAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderUserSwitcher();
    if (typeof syncPlanEditorFromState === "function") syncPlanEditorFromState();
    if (typeof render === "function") render();
  }

  function switchProfile(profileId) {
    ensureProfiles();
    if (!state.multiUser.profiles.some((p) => p.id === profileId)) return;
    captureActiveProfile();
    state.multiUser.activeProfileId = profileId;
    applyProfileData(profileId);
    persistAndRender();
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
    persistAndRender();
  }

  function renameActiveProfile(name) {
    const profile = activeProfile();
    profile.name = name.trim();
    profile.updatedAt = new Date().toISOString();
    captureActiveProfile();
    persistAndRender();
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
    persistAndRender();
  }

  function installSaveStateWrapper() {
    if (typeof saveState !== "function" || saveState.__multiUserWrapped) return;
    saveState = function saveStateWithProfiles() {
      ensureProfiles();
      captureActiveProfile();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderUserSwitcher();
      render();
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
        renderUserSwitcher();
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
      .user-switcher-card {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) auto auto auto;
        gap: 10px;
        align-items: end;
        margin: 14px 0 14px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 14px 35px rgba(17, 24, 39, 0.04);
      }
      .user-switcher-card label {
        display: grid;
        gap: 5px;
        font-weight: 800;
        color: #647084;
      }
      .user-switcher-card select {
        min-height: 42px;
      }
      .user-switcher-card .active-user-pill {
        justify-self: start;
        align-self: center;
        background: #eef6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 0.86rem;
        font-weight: 850;
      }
      .user-switcher-card button {
        white-space: nowrap;
      }
      @media (max-width: 780px) {
        .user-switcher-card {
          grid-template-columns: 1fr 1fr;
          align-items: stretch;
        }
        .user-switcher-card label,
        .user-switcher-card .active-user-pill {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 460px) {
        .user-switcher-card { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureUserSwitcherElement() {
    let card = document.getElementById("userSwitcherCard");
    if (card) return card;
    const main = document.querySelector("main");
    const tabs = document.querySelector(".tabs");
    if (!main || !tabs) return null;
    card = document.createElement("section");
    card.id = "userSwitcherCard";
    card.className = "user-switcher-card";
    tabs.parentNode.insertBefore(card, tabs);
    return card;
  }

  function renderUserSwitcher() {
    ensureProfiles();
    installStyles();
    const card = ensureUserSwitcherElement();
    if (!card) return;
    const active = activeProfile();
    card.innerHTML = `
      <label>
        Active user
        <select id="profileSelect" aria-label="Active user profile">
          ${state.multiUser.profiles.map((profile) => `<option value="${safeText(profile.id)}" ${profile.id === active.id ? "selected" : ""}>${safeText(profile.name)}</option>`).join("")}
        </select>
      </label>
      <span class="active-user-pill">Editing: ${safeText(active.name)}</span>
      <button type="button" id="addProfileBtn" class="secondary-dark">+ Add user</button>
      <button type="button" id="renameProfileBtn" class="secondary-dark">Rename</button>
      <button type="button" id="deleteProfileBtn" class="danger">Delete</button>
    `;

    card.querySelector("#profileSelect")?.addEventListener("change", (event) => switchProfile(event.target.value));
    card.querySelector("#addProfileBtn")?.addEventListener("click", () => {
      const name = prompt("Name for the new user profile:", "Wife");
      if (!name || !name.trim()) return;
      addProfile(name);
    });
    card.querySelector("#renameProfileBtn")?.addEventListener("click", () => {
      const current = activeProfile();
      const name = prompt("Rename active user profile:", current.name);
      if (!name || !name.trim()) return;
      renameActiveProfile(name);
    });
    card.querySelector("#deleteProfileBtn")?.addEventListener("click", deleteActiveProfile);
  }

  function init() {
    ensureProfiles();
    applyProfileData(state.multiUser.activeProfileId);
    installSaveStateWrapper();
    installSyncWrappers();
    renderUserSwitcher();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  init();
  document.addEventListener("DOMContentLoaded", () => setTimeout(init, 100));
})();
