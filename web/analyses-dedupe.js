(() => {
  const CANONICAL_ITEM_NAMES = new Map([
    ["age", "Birth date"],
    ["birth date", "Birth date"],
    ["actual weight", "Weight"],
    ["actual weight (scale)", "Weight"],
    ["weight", "Weight"]
  ]);

  const SINGLE_VALUE_NAMES = new Set([
    "birth date",
    "height",
    "weight",
    "waist circumference",
    "hip circumference"
  ]);

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function canonicalName(name) {
    return CANONICAL_ITEM_NAMES.get(norm(name)) || String(name || "").trim();
  }

  function canonicalKey(item) {
    return norm(canonicalName(item?.name));
  }

  function isSingleValue(item) {
    return SINGLE_VALUE_NAMES.has(canonicalKey(item));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function scoreItem(item) {
    const updates = Array.isArray(item?.updates) ? item.updates.length : 0;
    const statusScore = item?.status === "done" ? 50 : item?.status === "in_progress" ? 25 : 0;
    const notesScore = item?.notes ? 10 : 0;
    return updates * 100 + statusScore + notesScore;
  }

  function mergeIntoKeeper(keeper, duplicate) {
    keeper.updates = Array.isArray(keeper.updates) ? keeper.updates : [];
    const duplicateUpdates = Array.isArray(duplicate.updates) ? duplicate.updates : [];
    const seenUpdates = new Set(keeper.updates.map((u) => `${u.id || ""}|${u.date || ""}|${u.value || ""}|${u.createdAt || ""}`));
    for (const update of duplicateUpdates) {
      const key = `${update.id || ""}|${update.date || ""}|${update.value || ""}|${update.createdAt || ""}`;
      if (!seenUpdates.has(key)) {
        keeper.updates.push(clone(update));
        seenUpdates.add(key);
      }
    }

    if (!keeper.notes && duplicate.notes) keeper.notes = duplicate.notes;
    if (!keeper.description && duplicate.description) keeper.description = duplicate.description;
    if (!keeper.targetDate && duplicate.targetDate) keeper.targetDate = duplicate.targetDate;
    if (!keeper.cost && duplicate.cost) keeper.cost = duplicate.cost;
    if (!keeper.invasiveness && duplicate.invasiveness) keeper.invasiveness = duplicate.invasiveness;
    if (!keeper.actionability && duplicate.actionability) keeper.actionability = duplicate.actionability;

    if (keeper.status !== "done" && duplicate.status === "done") keeper.status = "done";
    else if (keeper.status === "pending" && duplicate.status === "in_progress") keeper.status = "in_progress";

    if ((keeper.priority || "none") === "none" && duplicate.priority && duplicate.priority !== "none") {
      keeper.priority = duplicate.priority;
    }

    keeper.updatedAt = new Date().toISOString();
  }

  function normalizeItems(analyses) {
    if (!analyses || !Array.isArray(analyses.items)) return false;
    let changed = false;

    for (const item of analyses.items) {
      const canonical = canonicalName(item.name);
      if (canonical && item.name !== canonical) {
        item.name = canonical;
        changed = true;
      }
      if (isSingleValue(item)) {
        if (item.kind !== "personal_fact") { item.kind = "personal_fact"; changed = true; }
        if (item.priority !== "none") { item.priority = "none"; changed = true; }
        if (item.notes) { item.notes = ""; changed = true; }
        if (item.cost) { item.cost = ""; changed = true; }
        if (item.invasiveness) { item.invasiveness = ""; changed = true; }
        if (item.actionability) { item.actionability = ""; changed = true; }
        if (item.targetDate) { item.targetDate = ""; changed = true; }
      }
      if (!Array.isArray(item.updates)) { item.updates = []; changed = true; }
    }

    const grouped = new Map();
    for (const item of analyses.items) {
      const key = `${item.categoryId || ""}::${canonicalKey(item)}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }

    const duplicateIds = new Set();
    for (const group of grouped.values()) {
      if (group.length <= 1) continue;
      group.sort((a, b) => scoreItem(b) - scoreItem(a));
      const keeper = group[0];
      for (const duplicate of group.slice(1)) {
        mergeIntoKeeper(keeper, duplicate);
        duplicateIds.add(duplicate.id);
        changed = true;
      }
    }

    if (duplicateIds.size) {
      analyses.items = analyses.items.filter((item) => !duplicateIds.has(item.id));
    }

    return changed;
  }

  function normalizeStateAndProfiles() {
    let changed = false;
    try {
      if (state?.analyses) changed = normalizeItems(state.analyses) || changed;
      const profileData = state?.multiUser?.profileData;
      if (profileData && typeof profileData === "object") {
        for (const data of Object.values(profileData)) {
          if (data?.analyses) changed = normalizeItems(data.analyses) || changed;
        }
      }
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Analyses de-duplication skipped", error);
    }
    return changed;
  }

  function installRenderWrapper() {
    if (typeof render !== "function" || render.__analysesDedupeWrapped) return;
    const originalRender = render;
    render = function renderWithAnalysesDedupe(...args) {
      normalizeStateAndProfiles();
      return originalRender.apply(this, args);
    };
    render.__analysesDedupeWrapped = true;
  }

  function run() {
    const changed = normalizeStateAndProfiles();
    installRenderWrapper();
    if (changed && typeof render === "function") requestAnimationFrame(render);
  }

  run();
  document.addEventListener("DOMContentLoaded", () => {
    [0, 150, 600, 1500].forEach((delay) => setTimeout(run, delay));
  });
})();
