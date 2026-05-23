const STORAGE_KEY = "longevityResearchSystem.v0.1";
const SYNC_SETTINGS_KEY = "longevityResearchSystem.syncSettings.v0.1";
const SEED_PLAN_PATH = "plans/longevity_base.md";

function defaultAnalyses() {
  return { categories: [], items: [] };
}

function freshEmptyState() {
  return {
    dailyLogs: [],
    foodLogs: [],
    measurements: [],
    recipeExperiments: [],
    planMarkdown: "",
    analyses: defaultAnalyses()
  };
}

const emptyState = freshEmptyState();

const analysisFilters = { search: "", category: "all", status: "all", priority: "all" };
const expandedCategories = new Set();
const expandedItems = new Set();

let state = loadState();
let syncSettings = loadSyncSettings();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = freshEmptyState();
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const merged = { ...base, ...parsed };
    if (!merged.analyses || typeof merged.analyses !== "object") {
      merged.analyses = defaultAnalyses();
    } else {
      merged.analyses = {
        categories: Array.isArray(merged.analyses.categories) ? merged.analyses.categories : [],
        items: Array.isArray(merged.analyses.items) ? merged.analyses.items : []
      };
    }
    return merged;
  } catch (error) {
    console.error("Failed to load state", error);
    return freshEmptyState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadSyncSettings() {
  try {
    const raw = localStorage.getItem(SYNC_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      token: "",
      owner: "RicardoGV2",
      repo: "longevity-research-system",
      branch: "main",
      path: "sync/personal-sync.json"
    };
  } catch (error) {
    return {
      token: "",
      owner: "RicardoGV2",
      repo: "longevity-research-system",
      branch: "main",
      path: "sync/personal-sync.json"
    };
  }
}

function saveSyncSettings() {
  localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(syncSettings));
}

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function addTimestamp(record) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    ...record
  };
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
      requestAnimationFrame(render);
    });
  });
}

function setupForms() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });

  document.getElementById("dailyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = getFormData(form);
    state.dailyLogs.push(addTimestamp({
      date: data.date,
      weight: parseNumber(data.weight),
      sleepHours: parseNumber(data.sleepHours),
      sleepQuality: parseNumber(data.sleepQuality),
      energy: parseNumber(data.energy),
      stress: parseNumber(data.stress),
      steps: parseNumber(data.steps),
      pain: parseNumber(data.pain),
      physicalLoad: data.physicalLoad,
      notes: data.notes || ""
    }));
    form.reset();
    form.querySelector('input[name="date"]').value = today;
    saveState();
  });

  document.getElementById("foodForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = getFormData(form);
    state.foodLogs.push(addTimestamp({
      day: data.day,
      time: data.time,
      place: data.place,
      description: data.description,
      quantity: data.quantity,
      hungerBefore: parseNumber(data.hungerBefore),
      energyAfter: parseNumber(data.energyAfter),
      hungerLater: parseNumber(data.hungerLater),
      context: data.context || ""
    }));
    form.reset();
    saveState();
  });

  document.getElementById("measurementForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = getFormData(form);
    state.measurements.push(addTimestamp({
      date: data.date,
      type: data.type,
      value: parseNumber(data.value),
      unit: data.unit,
      notes: data.notes || ""
    }));
    form.reset();
    form.querySelector('input[name="date"]').value = today;
    saveState();
  });

  document.getElementById("recipeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = getFormData(form);
    state.recipeExperiments.push(addTimestamp({
      name: data.name,
      expectedFunction: data.function,
      ingredients: data.ingredients || "",
      protein: parseNumber(data.protein),
      carbs: parseNumber(data.carbs),
      fiber: parseNumber(data.fiber),
      sugar: parseNumber(data.sugar),
      fat: parseNumber(data.fat),
      result: data.result || ""
    }));
    form.reset();
    saveState();
  });
}

function setupImportExport() {
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `longevity-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importFile").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      state = { ...freshEmptyState(), ...imported };
      if (!state.analyses || typeof state.analyses !== "object") {
        state.analyses = defaultAnalyses();
      } else {
        state.analyses = {
          categories: Array.isArray(state.analyses.categories) ? state.analyses.categories : [],
          items: Array.isArray(state.analyses.items) ? state.analyses.items : []
        };
      }
      saveState();
      syncPlanEditorFromState();
      event.target.value = "";
      alert("Data imported successfully.");
    } catch (error) {
      alert("Import failed. Please select a valid JSON export.");
    }
  });

  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      const ok = confirm("Clear all local data in this browser? Export or push to GitHub first if you want a backup.");
      if (!ok) return;
      state = freshEmptyState();
      saveState();
      syncPlanEditorFromState();
    });
  }
}

async function initializePlan() {
  if (state.planMarkdown && state.planMarkdown.trim()) {
    syncPlanEditorFromState();
    return;
  }
  await loadSeedPlan(false);
}

async function loadSeedPlan(confirmOverwrite = true) {
  if (confirmOverwrite && state.planMarkdown && !confirm("Reload the seed plan? This will replace the local plan text unless you pushed/exported it.")) {
    return;
  }
  try {
    const response = await fetch(`${SEED_PLAN_PATH}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`Seed plan fetch failed: ${response.status}`);
    state.planMarkdown = await response.text();
    saveState();
    syncPlanEditorFromState();
  } catch (error) {
    console.error(error);
    setSyncStatus("Could not load seed plan. Check that web/plans/longevity_base.md exists.", true);
  }
}

function setupPlanEditor() {
  const editor = document.getElementById("planEditor");
  const saveBtn = document.getElementById("savePlanBtn");
  const seedBtn = document.getElementById("loadSeedPlanBtn");
  if (!editor || !saveBtn || !seedBtn) return;

  editor.addEventListener("input", () => {
    renderMarkdownPreview(editor.value);
  });

  saveBtn.addEventListener("click", () => {
    state.planMarkdown = editor.value;
    saveState();
    setSyncStatus("Plan saved locally. Push to GitHub to update other devices.");
  });

  seedBtn.addEventListener("click", () => loadSeedPlan(true));
}

function syncPlanEditorFromState() {
  const editor = document.getElementById("planEditor");
  if (!editor) return;
  editor.value = state.planMarkdown || "";
  renderMarkdownPreview(editor.value);
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMarkdownPreview(markdown) {
  const preview = document.getElementById("planPreview");
  if (!preview) return;
  const lines = String(markdown || "").split("\n");
  let html = "";
  let inList = false;
  let inAnalysesSection = false;

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      const heading = line.slice(3);
      inAnalysesSection = /^4\.\s/.test(heading);
      html += `<h2>${escapeHtml(heading)}</h2>`;
    } else if (line.startsWith("### ")) {
      closeList();
      const heading = line.slice(4);
      if (inAnalysesSection) {
        const match = heading.match(/^([A-Za-z])\.\s+(.+)$/);
        if (match) {
          const code = match[1].toUpperCase();
          const badge = renderCategoryProgressBadge(code);
          html += `<h3 id="plan-analysis-${escapeHtml(code)}" class="plan-analysis-heading">${escapeHtml(heading)}${badge}</h3>`;
        } else {
          html += `<h3>${escapeHtml(heading)}</h3>`;
        }
      } else {
        html += `<h3>${escapeHtml(heading)}</h3>`;
      }
    } else if (line.startsWith("# ")) {
      closeList();
      html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineMarkdown(escapeHtml(line.slice(2)))}</li>`;
    } else if (/^\d+\.\s/.test(line)) {
      closeList();
      html += `<p>${inlineMarkdown(escapeHtml(line))}</p>`;
    } else if (line === "---") {
      closeList();
      html += "<hr>";
    } else {
      closeList();
      html += `<p>${inlineMarkdown(escapeHtml(line))}</p>`;
    }
  }
  closeList();
  preview.innerHTML = html || "<p>No plan content yet.</p>";
}

function renderCategoryProgressBadge(code) {
  const category = (state.analyses?.categories || []).find((c) => c.code === code);
  if (!category) return ` <span class="cat-progress-badge missing" data-no-category="${escapeHtml(code)}" title="Sin categoría en la pestaña Análisis">sin categoría</span>`;
  const stats = categoryStats(category.id);
  return ` <button type="button" class="cat-progress-badge" data-cat-id="${escapeHtml(category.id)}" title="Ver en la pestaña Análisis">${stats.done}/${stats.total} hechos</button>`;
}

function inlineMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function setupSyncSettings() {
  const form = document.getElementById("syncSettingsForm");
  if (!form) return;
  form.token.value = syncSettings.token || "";
  form.owner.value = syncSettings.owner || "RicardoGV2";
  form.repo.value = syncSettings.repo || "longevity-research-system";
  form.branch.value = syncSettings.branch || "main";
  form.path.value = syncSettings.path || "sync/personal-sync.json";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = getFormData(form);
    syncSettings = {
      token: data.token.trim(),
      owner: data.owner.trim(),
      repo: data.repo.trim(),
      branch: data.branch.trim() || "main",
      path: data.path.trim() || "sync/personal-sync.json"
    };
    saveSyncSettings();
    setSyncStatus("Sync settings saved locally on this device.");
  });

  document.getElementById("pullGithubBtn")?.addEventListener("click", pullFromGitHub);
  document.getElementById("pushGithubBtn")?.addEventListener("click", pushToGitHub);
}

function setSyncStatus(message, isError = false) {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#b91c1c" : "#647084";
}

function validateSyncSettings() {
  if (!syncSettings.token || !syncSettings.owner || !syncSettings.repo || !syncSettings.path) {
    throw new Error("Missing GitHub sync settings. Add token, owner, repo, branch and file path.");
  }
}

function githubFileUrl() {
  const encodedPath = syncSettings.path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${encodeURIComponent(syncSettings.owner)}/${encodeURIComponent(syncSettings.repo)}/contents/${encodedPath}`;
}

function authHeaders() {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${syncSettings.token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function encodeBase64Unicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64Unicode(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ""))));
}

function buildSyncPayload() {
  return {
    schemaVersion: "0.1",
    updatedAt: new Date().toISOString(),
    appState: state
  };
}

async function getGitHubFileMetadata() {
  const url = `${githubFileUrl()}?ref=${encodeURIComponent(syncSettings.branch || "main")}`;
  const response = await fetch(url, { headers: authHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub fetch failed: ${response.status} ${text}`);
  }
  return response.json();
}

async function pullFromGitHub() {
  try {
    validateSyncSettings();
    setSyncStatus("Pulling from GitHub...");
    const metadata = await getGitHubFileMetadata();
    if (!metadata) {
      setSyncStatus("No sync file found yet. Push from one device first.", true);
      return;
    }
    const payload = JSON.parse(decodeBase64Unicode(metadata.content));
    if (!payload.appState) throw new Error("Sync file does not contain appState.");
    state = { ...freshEmptyState(), ...payload.appState };
    if (!state.analyses || typeof state.analyses !== "object") {
      state.analyses = defaultAnalyses();
    } else {
      state.analyses = {
        categories: Array.isArray(state.analyses.categories) ? state.analyses.categories : [],
        items: Array.isArray(state.analyses.items) ? state.analyses.items : []
      };
    }
    saveState();
    syncPlanEditorFromState();
    setSyncStatus(`Pulled from GitHub. Last remote update: ${payload.updatedAt || "unknown"}`);
  } catch (error) {
    console.error(error);
    setSyncStatus(error.message, true);
  }
}

async function pushToGitHub() {
  try {
    validateSyncSettings();
    const editor = document.getElementById("planEditor");
    if (editor) state.planMarkdown = editor.value;
    saveState();
    setSyncStatus("Pushing to GitHub...");

    const metadata = await getGitHubFileMetadata();
    const payload = buildSyncPayload();
    const body = {
      message: `Sync longevity app data ${new Date().toISOString()}`,
      content: encodeBase64Unicode(JSON.stringify(payload, null, 2)),
      branch: syncSettings.branch || "main"
    };
    if (metadata?.sha) body.sha = metadata.sha;

    const response = await fetch(githubFileUrl(), {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub push failed: ${response.status} ${text}`);
    }
    setSyncStatus("Pushed to GitHub. Other devices can now Pull from GitHub.");
  } catch (error) {
    console.error(error);
    setSyncStatus(error.message, true);
  }
}

function sortByDate(items) {
  return [...items].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

function prepareCanvas(canvas, preferredHeight = 180) {
  const card = canvas.closest(".chart-card") || canvas.parentElement || canvas;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const cardStyle = getComputedStyle(card);
  const paddingX = parseFloat(cardStyle.paddingLeft || 0) + parseFloat(cardStyle.paddingRight || 0);
  const safeViewportWidth = Math.max(260, window.innerWidth - 36);
  const cardWidth = Math.max(260, Math.floor(card.clientWidth - paddingX));
  const cssWidth = Math.min(cardWidth, safeViewportWidth);
  const cssHeight = preferredHeight;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.maxWidth = "100%";
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return { ctx, width: cssWidth, height: cssHeight };
}

function drawEmpty(ctx, text = "No data yet") {
  ctx.fillStyle = "#647084";
  ctx.font = "14px system-ui";
  ctx.fillText(text, 18, 34);
}

function drawLineChart(canvasId, points, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = prepareCanvas(canvas, 180);

  const valid = points.filter((p) => Number.isFinite(p.value));
  if (!valid.length) {
    drawEmpty(ctx);
    return;
  }

  const pad = 28;
  const values = valid.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }

  ctx.strokeStyle = "#dfe4ee";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  const x = (i) => valid.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (valid.length - 1);
  const y = (v) => height - pad - ((v - min) * (height - pad * 2)) / (max - min);

  ctx.strokeStyle = options.color || "#2563eb";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  valid.forEach((p, i) => {
    if (i === 0) ctx.moveTo(x(i), y(p.value));
    else ctx.lineTo(x(i), y(p.value));
  });
  ctx.stroke();

  ctx.fillStyle = options.color || "#2563eb";
  valid.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(p.value), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#647084";
  ctx.font = "12px system-ui";
  ctx.fillText(String(Math.round(max * 10) / 10), 4, pad + 4);
  ctx.fillText(String(Math.round(min * 10) / 10), 4, height - pad + 4);
}

function drawDualChart(canvasId, seriesA, seriesB) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height } = prepareCanvas(canvas, 180);

  const a = seriesA.filter((p) => Number.isFinite(p.value));
  const b = seriesB.filter((p) => Number.isFinite(p.value));
  if (![...a, ...b].length) {
    drawEmpty(ctx);
    return;
  }

  const pad = 28;
  const min = 1;
  const max = 10;
  const len = Math.max(a.length, b.length, 1);
  const x = (i) => len === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (len - 1);
  const y = (v) => height - pad - ((v - min) * (height - pad * 2)) / (max - min);

  ctx.strokeStyle = "#dfe4ee";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.stroke();

  function draw(series, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    series.forEach((p, i) => {
      if (i === 0) ctx.moveTo(x(i), y(p.value));
      else ctx.lineTo(x(i), y(p.value));
    });
    ctx.stroke();
  }

  draw(a, "#2563eb");
  draw(b, "#b91c1c");
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#2563eb";
  ctx.fillText("Energy", pad, 16);
  ctx.fillStyle = "#b91c1c";
  ctx.fillText("Stress", pad + 72, 16);
}

function render() {
  document.getElementById("dailyCount").textContent = state.dailyLogs.length;
  document.getElementById("foodCount").textContent = state.foodLogs.length;
  document.getElementById("measurementCount").textContent = state.measurements.length;
  document.getElementById("recipeCount").textContent = state.recipeExperiments.length;

  const daily = sortByDate(state.dailyLogs);
  drawLineChart("weightChart", daily.map((d) => ({ label: d.date, value: d.weight })));
  drawLineChart("sleepChart", daily.map((d) => ({ label: d.date, value: d.sleepHours })));
  drawDualChart(
    "energyStressChart",
    daily.map((d) => ({ label: d.date, value: d.energy })),
    daily.map((d) => ({ label: d.date, value: d.stress }))
  );
  drawLineChart("painChart", daily.map((d) => ({ label: d.date, value: d.pain })));

  renderAnalyses();

  const editor = document.getElementById("planEditor");
  if (editor) renderMarkdownPreview(editor.value);

  if (typeof schedulePlanBadgeInject === "function") schedulePlanBadgeInject();

  const raw = document.getElementById("rawData");
  if (raw) raw.textContent = JSON.stringify(state, null, 2);
}

window.addEventListener("resize", () => requestAnimationFrame(render));
window.addEventListener("orientationchange", () => setTimeout(render, 250));

// ============================================================
// Analyses module
// ============================================================

const STATUS_META = {
  pending:     { label: "Pending",     className: "status-pending" },
  in_progress: { label: "In progress", className: "status-in-progress" },
  done:        { label: "Done",        className: "status-done" },
  discarded:   { label: "Discarded",   className: "status-discarded" }
};

const PRIORITY_META = {
  none:   { label: "No priority", className: "priority-none" },
  low:    { label: "Low",         className: "priority-low" },
  medium: { label: "Medium",      className: "priority-medium" },
  high:   { label: "High",        className: "priority-high" }
};

const KIND_META = {
  personal_fact:     { label: "Personal fact",     cost: false, invasiveness: false, targetDate: false, actionability: false, valueHint: "value" },
  body_measurement:  { label: "Body measurement",  cost: false, invasiveness: false, targetDate: true,  actionability: true,  valueHint: "e.g. 72.4 kg" },
  lab_test:          { label: "Lab test",          cost: true,  invasiveness: true,  targetDate: true,  actionability: true,  valueHint: "result and units" },
  clinical_study:    { label: "Clinical study",    cost: true,  invasiveness: true,  targetDate: true,  actionability: true,  valueHint: "main finding" },
  functional_test:   { label: "Functional test",   cost: false, invasiveness: false, targetDate: true,  actionability: true,  valueHint: "score / reps / time" },
  wearable_metric:   { label: "Wearable metric",   cost: false, invasiveness: false, targetDate: false, actionability: true,  valueHint: "wearable reading" },
  subjective_log:    { label: "Subjective log",    cost: false, invasiveness: false, targetDate: false, actionability: true,  valueHint: "1-10 or short text" },
  nutrition_log:     { label: "Nutrition log",     cost: false, invasiveness: false, targetDate: false, actionability: true,  valueHint: "quantity / units" },
  lifestyle_factor:  { label: "Lifestyle factor",  cost: false, invasiveness: false, targetDate: false, actionability: true,  valueHint: "current value" },
  equipment:         { label: "Equipment",         cost: true,  invasiveness: false, targetDate: true,  actionability: false, valueHint: "model / source" },
  questionnaire:     { label: "Self-assessment",   cost: false, invasiveness: false, targetDate: false, actionability: true,  valueHint: "short answer" }
};

function kindMeta(kind) {
  return KIND_META[kind] || KIND_META.questionnaire;
}

const COST_OPTIONS = [
  { value: "",        label: "—" },
  { value: "low",     label: "Low" },
  { value: "medium",  label: "Medium" },
  { value: "high",    label: "High" }
];

const INVASIVENESS_OPTIONS = [
  { value: "",            label: "—" },
  { value: "none",        label: "None" },
  { value: "minimal",     label: "Minimal" },
  { value: "invasive",    label: "Invasive" }
];

const ANALYSES_SEED_CATALOG = [
  { code: "A", name: "Physical and biological baseline", description: "Age, height, real weight, waist, hip, body composition, activity, load history, injuries, pain, meds, supplements, sleep, stress, work schedule and sedentary exposure.", items: [
    { name: "Age", kind: "personal_fact" },
    { name: "Height", kind: "personal_fact" },
    { name: "Actual weight (scale)", kind: "body_measurement" },
    { name: "Waist circumference", kind: "body_measurement" },
    { name: "Hip circumference", kind: "body_measurement" },
    { name: "Body composition (DEXA or BIA)", kind: "clinical_study" },
    { name: "Weekly physical activity", kind: "lifestyle_factor" },
    { name: "Physical load history", kind: "questionnaire" },
    { name: "Past and current injuries", kind: "questionnaire" },
    { name: "Current pain", kind: "subjective_log" },
    { name: "Medications", kind: "personal_fact" },
    { name: "Supplements", kind: "personal_fact" },
    { name: "Baseline sleep hours and quality", kind: "subjective_log" },
    { name: "Perceived stress", kind: "subjective_log" },
    { name: "Work schedule and sedentary exposure", kind: "lifestyle_factor" },
  ]},
  { code: "B", name: "Metabolic health", description: "Glucose, HbA1c, insulin, lipids, ApoB, blood pressure, visceral fat, waist, fatty liver, inflammation, fiber, alcohol, sugar, ultra-processed foods and carb quality.", items: [
    { name: "Fasting glucose", kind: "lab_test" },
    { name: "HbA1c", kind: "lab_test" },
    { name: "Fasting insulin", kind: "lab_test" },
    { name: "HOMA-IR (calculated)", kind: "lab_test" },
    { name: "Full lipid panel", kind: "lab_test" },
    { name: "ApoB", kind: "lab_test" },
    { name: "Home blood pressure (7 days AM/PM)", kind: "body_measurement" },
    { name: "Visceral fat (DEXA or estimate)", kind: "clinical_study" },
    { name: "Fatty liver (ultrasound or FibroScan)", kind: "clinical_study" },
    { name: "hs-CRP (inflammation)", kind: "lab_test" },
    { name: "Daily fiber log", kind: "nutrition_log" },
    { name: "Alcohol log", kind: "nutrition_log" },
    { name: "Added sugar log", kind: "nutrition_log" },
    { name: "% ultra-processed foods", kind: "nutrition_log" },
    { name: "Carb quality", kind: "nutrition_log" },
  ]},
  { code: "C", name: "Cardiovascular health", description: "Resting heart rate, recovery, aerobic capacity, zone 2, HIIT, walks, running, cycling, technique, footwear, joint impact.", items: [
    { name: "Resting heart rate", kind: "body_measurement" },
    { name: "Post-effort heart rate recovery", kind: "functional_test" },
    { name: "Estimated VO2 max (wearable or test)", kind: "functional_test" },
    { name: "Weekly time in zone 2", kind: "lifestyle_factor" },
    { name: "Weekly HIIT sessions", kind: "lifestyle_factor" },
    { name: "Daily walks", kind: "lifestyle_factor" },
    { name: "Running: pace, distance, technique", kind: "functional_test" },
    { name: "Cycling: time and intensity", kind: "lifestyle_factor" },
    { name: "Footwear evaluation", kind: "questionnaire" },
    { name: "Subjective joint impact", kind: "subjective_log" },
  ]},
  { code: "D", name: "Strength, muscle mass and bone health", description: "Upper/lower/back strength, grip, muscle mass, bone density, progression, technique, symmetry, pain, recovery, weekly volume.", items: [
    { name: "Upper body strength (bench / push-up test)", kind: "functional_test" },
    { name: "Lower body strength (squat / deadlift)", kind: "functional_test" },
    { name: "Back strength (row / pull-ups)", kind: "functional_test" },
    { name: "Grip strength (dynamometer)", kind: "functional_test" },
    { name: "Muscle mass (DEXA or BIA)", kind: "clinical_study" },
    { name: "Bone density (DEXA)", kind: "clinical_study" },
    { name: "Weekly load progression", kind: "lifestyle_factor" },
    { name: "Technique in key lifts", kind: "questionnaire" },
    { name: "Left/right symmetry", kind: "functional_test" },
    { name: "Post-training pain", kind: "subjective_log" },
    { name: "Recovery between sessions", kind: "subjective_log" },
    { name: "Weekly volume per muscle group", kind: "lifestyle_factor" },
  ]},
  { code: "E", name: "Mobility, joints and mechanical longevity", description: "Ankles, hips, thoracic spine, shoulders, wrists, hamstrings, knees, scapulae, feet, posture, loading and running technique.", items: [
    { name: "Ankle mobility", kind: "functional_test" },
    { name: "Hip mobility", kind: "functional_test" },
    { name: "Thoracic spine mobility", kind: "functional_test" },
    { name: "Shoulder mobility", kind: "functional_test" },
    { name: "Wrist mobility", kind: "functional_test" },
    { name: "Hamstring flexibility", kind: "functional_test" },
    { name: "Knee stability", kind: "functional_test" },
    { name: "Scapular control", kind: "functional_test" },
    { name: "Foot health (arch, posture)", kind: "functional_test" },
    { name: "General posture", kind: "questionnaire" },
    { name: "Loading technique (squat, deadlift)", kind: "questionnaire" },
    { name: "Running technique", kind: "questionnaire" },
  ]},
  { code: "F", name: "Sleep and recovery", description: "Hours, quality, schedule, awakenings, caffeine, alcohol, dinner, late training, artificial light, temperature, stress, nighttime HR and HRV.", items: [
    { name: "Hours of sleep", kind: "wearable_metric" },
    { name: "Subjective quality 1-10", kind: "subjective_log" },
    { name: "Schedule consistency", kind: "lifestyle_factor" },
    { name: "Night awakenings", kind: "wearable_metric" },
    { name: "Caffeine: amount and time of last coffee", kind: "nutrition_log" },
    { name: "Alcohol and sleep", kind: "nutrition_log" },
    { name: "Dinner: timing and composition", kind: "nutrition_log" },
    { name: "Late-night training: impact", kind: "lifestyle_factor" },
    { name: "Artificial light and screen exposure", kind: "lifestyle_factor" },
    { name: "Bedroom temperature", kind: "lifestyle_factor" },
    { name: "Stress before bed", kind: "subjective_log" },
    { name: "Nighttime heart rate", kind: "wearable_metric" },
    { name: "Nighttime HRV", kind: "wearable_metric" },
    { name: "Sleep latency", kind: "wearable_metric" },
  ]},
  { code: "G", name: "Long-term diet and nutrition", description: "Calories, protein, carbs, fats, fiber, micronutrients, hydration, sodium, potassium, magnesium, calcium, vitamin D, omega-3, iron, B12, folate, ultra-processed, alcohol, timing, satiety, digestion and food availability in Ireland.", items: [
    { name: "Estimated daily calories", kind: "nutrition_log" },
    { name: "Protein g/day", kind: "nutrition_log" },
    { name: "Carbs g/day", kind: "nutrition_log" },
    { name: "Fats g/day", kind: "nutrition_log" },
    { name: "Fiber g/day", kind: "nutrition_log" },
    { name: "Hydration (liters/day)", kind: "nutrition_log" },
    { name: "Sodium", kind: "nutrition_log" },
    { name: "Potassium", kind: "nutrition_log" },
    { name: "Magnesium intake", kind: "nutrition_log" },
    { name: "Calcium intake", kind: "nutrition_log" },
    { name: "Vitamin D (lab)", kind: "lab_test" },
    { name: "Omega-3 (diet + omega-3 index)", kind: "lab_test" },
    { name: "Iron (lab)", kind: "lab_test" },
    { name: "B12 (lab)", kind: "lab_test" },
    { name: "Folate (lab)", kind: "lab_test" },
    { name: "% ultra-processed foods", kind: "nutrition_log" },
    { name: "Weekly alcohol", kind: "nutrition_log" },
    { name: "Meal timing", kind: "lifestyle_factor" },
    { name: "Post-meal satiety and digestion", kind: "subjective_log" },
    { name: "Actual food availability in Ireland", kind: "questionnaire" },
  ]},
  { code: "H", name: "Digestion, microbiome and gut health", description: "Fiber, vegetables, fruit, legumes, fermented foods, water, regularity, bloating, gas, reflux, intolerances and trigger foods.", items: [
    { name: "Fiber g/day", kind: "nutrition_log" },
    { name: "Weekly vegetable variety", kind: "nutrition_log" },
    { name: "Fruit variety", kind: "nutrition_log" },
    { name: "Legumes per week", kind: "nutrition_log" },
    { name: "Fermented foods per week", kind: "nutrition_log" },
    { name: "Hydration", kind: "nutrition_log" },
    { name: "Bowel regularity", kind: "subjective_log" },
    { name: "Bloating", kind: "subjective_log" },
    { name: "Gas", kind: "subjective_log" },
    { name: "Reflux", kind: "subjective_log" },
    { name: "Known intolerances", kind: "questionnaire" },
    { name: "Trigger foods", kind: "questionnaire" },
  ]},
  { code: "I", name: "Stress, mental health and purpose", description: "Work/financial stress, goal pressure, anxiety, motivation, relationship with food and body, family, social life, rest, screen-free time, purpose and meaning.", items: [
    { name: "Work stress level", kind: "subjective_log" },
    { name: "Financial stress", kind: "subjective_log" },
    { name: "Goal pressure", kind: "subjective_log" },
    { name: "Anxiety", kind: "subjective_log" },
    { name: "Motivation", kind: "subjective_log" },
    { name: "Relationship with food and body", kind: "questionnaire" },
    { name: "Family connection", kind: "subjective_log" },
    { name: "Social life", kind: "subjective_log" },
    { name: "Mental rest", kind: "subjective_log" },
    { name: "Screen-free time", kind: "lifestyle_factor" },
    { name: "Sense of purpose", kind: "questionnaire" },
  ]},
  { code: "J", name: "Environment: Ireland, climate, light and lifestyle", description: "Low winter light, rain, cold, short days, vitamin D, walks, transport, exercise environments, safety, supermarkets, costs, indoor routines and seasonal mood.", items: [
    { name: "Daily natural light exposure", kind: "lifestyle_factor" },
    { name: "Vitamin D (sun and supplementation)", kind: "lab_test" },
    { name: "Walks with natural light", kind: "lifestyle_factor" },
    { name: "Transport and walking minutes", kind: "lifestyle_factor" },
    { name: "Available exercise environments", kind: "questionnaire" },
    { name: "Safety for running/walking", kind: "questionnaire" },
    { name: "Supermarket access", kind: "questionnaire" },
    { name: "Cost of key foods", kind: "questionnaire" },
    { name: "Indoor winter routines", kind: "questionnaire" },
    { name: "Seasonal mood (SAD)", kind: "subjective_log" },
  ]},
  { code: "K", name: "Work, sedentary behavior and ergonomics", description: "Hours sitting, breaks, posture, neck, lower back, eye fatigue, coffee, snacks, work meals, walks and deadline stress.", items: [
    { name: "Hours sitting per day", kind: "lifestyle_factor" },
    { name: "Active breaks (count and frequency)", kind: "lifestyle_factor" },
    { name: "Desk posture", kind: "questionnaire" },
    { name: "Neck pain", kind: "subjective_log" },
    { name: "Lower back pain", kind: "subjective_log" },
    { name: "Visual fatigue", kind: "subjective_log" },
    { name: "Coffee intake at work", kind: "nutrition_log" },
    { name: "Work snacks", kind: "nutrition_log" },
    { name: "Work meals (composition)", kind: "nutrition_log" },
    { name: "Walks during the workday", kind: "lifestyle_factor" },
    { name: "Deadline stress", kind: "subjective_log" },
  ]},
  { code: "L", name: "Injury prevention and cumulative damage", description: "Volume, intensity, frequency, repetition, technique, rest, warm-up, mobility, pain, sleep, stress, footwear, surface, progression.", items: [
    { name: "Weekly training volume", kind: "lifestyle_factor" },
    { name: "Relative intensity", kind: "lifestyle_factor" },
    { name: "Frequency of repetitive movements", kind: "lifestyle_factor" },
    { name: "Technique in key exercises", kind: "questionnaire" },
    { name: "Rest between sessions", kind: "lifestyle_factor" },
    { name: "Structured warm-up", kind: "questionnaire" },
    { name: "Preventive mobility", kind: "lifestyle_factor" },
    { name: "Recurring pain", kind: "subjective_log" },
    { name: "Adequate sleep for recovery", kind: "subjective_log" },
    { name: "Stress management", kind: "subjective_log" },
    { name: "Adequate footwear", kind: "questionnaire" },
    { name: "Training surface", kind: "questionnaire" },
    { name: "Load progression", kind: "lifestyle_factor" },
  ]},
  { code: "M", name: "Biomarkers and preventive medicine", description: "Complete blood count, glucose, HbA1c, insulin, lipids, ApoB, blood pressure, vitamin D, B12, folate, ferritin, iron, TSH, liver/kidney function, hs-CRP, testosterone if applies, magnesium, omega-3 index.", items: [
    { name: "Complete blood count", kind: "lab_test" },
    { name: "Fasting glucose (M)", kind: "lab_test" },
    { name: "HbA1c (M)", kind: "lab_test" },
    { name: "Insulin (M)", kind: "lab_test" },
    { name: "Lipid panel (M)", kind: "lab_test" },
    { name: "ApoB (M)", kind: "lab_test" },
    { name: "Blood pressure (M)", kind: "body_measurement" },
    { name: "Vitamin D (25-OH)", kind: "lab_test" },
    { name: "B12", kind: "lab_test" },
    { name: "Folate", kind: "lab_test" },
    { name: "Ferritin", kind: "lab_test" },
    { name: "Serum iron", kind: "lab_test" },
    { name: "TSH", kind: "lab_test" },
    { name: "Liver function (ALT, AST, GGT)", kind: "lab_test" },
    { name: "Kidney function (creatinine, eGFR)", kind: "lab_test" },
    { name: "hs-CRP", kind: "lab_test" },
    { name: "Testosterone (if applies)", kind: "lab_test" },
    { name: "Magnesium", kind: "lab_test" },
    { name: "Omega-3 index", kind: "lab_test" },
  ]},
  { code: "N", name: "Supplements and advanced protocols", description: "Supplements are not the foundation. Sleep, food, training, light, stress and lab work come first.", items: [
    { name: "Vitamin D3 (dose per labs)", kind: "personal_fact" },
    { name: "Omega-3 (EPA+DHA)", kind: "personal_fact" },
    { name: "Magnesium (supplement)", kind: "personal_fact" },
    { name: "Creatine monohydrate", kind: "personal_fact" },
    { name: "Protein powder (if deficit)", kind: "personal_fact" },
    { name: "Multivitamin (if deficit)", kind: "personal_fact" },
    { name: "Others (only after lab review)", kind: "personal_fact" },
  ]},
  { code: "O", name: "Sugar, refined carbs and glycemic response", description: "Added sugar, free sugars, sugary drinks, juices, desserts, white flours, fiber, protein/fat in the meal, glycemic response, cravings, energy, hunger, dental health and context.", items: [
    { name: "Daily added sugar", kind: "nutrition_log" },
    { name: "Free sugars (juices, honey, etc.)", kind: "nutrition_log" },
    { name: "Weekly sugary drinks", kind: "nutrition_log" },
    { name: "Weekly desserts", kind: "nutrition_log" },
    { name: "Weekly white flours", kind: "nutrition_log" },
    { name: "Fiber accompanying carbs", kind: "nutrition_log" },
    { name: "Protein/fat accompanying carbs", kind: "nutrition_log" },
    { name: "Glycemic response (CGM if available)", kind: "wearable_metric" },
    { name: "Cravings", kind: "subjective_log" },
    { name: "Post-meal energy", kind: "subjective_log" },
    { name: "Hunger 2-3 h post-meal", kind: "subjective_log" },
    { name: "Dental health", kind: "clinical_study" },
    { name: "Emotional context of intake", kind: "questionnaire" },
  ]},
  { code: "P", name: "Progressive food research system", description: "Individual food → simple combination → full recipe → timing → eating order → personal response → adjustment.", items: [
    { name: "Individual foods under evaluation", kind: "questionnaire" },
    { name: "Simple combinations tested", kind: "questionnaire" },
    { name: "Full recipes tested", kind: "questionnaire" },
    { name: "Optimal timing per meal", kind: "questionnaire" },
    { name: "Eating order (veg → protein → carbs)", kind: "questionnaire" },
    { name: "Personal response per food", kind: "subjective_log" },
    { name: "Recorded adjustments", kind: "questionnaire" },
  ]},
  { code: "Q", name: "Ideal map of measurements, tests, devices and studies", description: "Scale, tape measure, blood pressure monitor, oximeter, wearable, chest strap, glucometer, CGM, ECG, stress test, CPET/VO2 max, DEXA, sleep study, blood panel, functional tests and environmental measurements.", items: [
    { name: "Scale", kind: "equipment" },
    { name: "Tape measure", kind: "equipment" },
    { name: "Blood pressure monitor (Omron or similar)", kind: "equipment" },
    { name: "Pulse oximeter", kind: "equipment" },
    { name: "Wearable (watch with HR, sleep, HRV)", kind: "equipment" },
    { name: "Chest HR strap", kind: "equipment" },
    { name: "Glucometer", kind: "equipment" },
    { name: "CGM (Libre or Dexcom)", kind: "equipment" },
    { name: "ECG (in clinic)", kind: "clinical_study" },
    { name: "Stress test", kind: "functional_test" },
    { name: "CPET / VO2 max", kind: "functional_test" },
    { name: "DEXA (composition + bone density)", kind: "clinical_study" },
    { name: "Sleep study", kind: "clinical_study" },
    { name: "Longevity blood panel", kind: "lab_test" },
    { name: "Functional tests (deep squat, dorsiflexion, plank)", kind: "functional_test" },
    { name: "Environmental measurements (light, temp, CO₂ in bedroom)", kind: "equipment" },
  ]},
];

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function categoryStats(catId) {
  const items = state.analyses.items.filter((i) => i.categoryId === catId);
  return {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    done: items.filter((i) => i.status === "done").length,
    discarded: items.filter((i) => i.status === "discarded").length
  };
}

function globalStats() {
  const items = state.analyses.items;
  const stats = {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    done: items.filter((i) => i.status === "done").length,
    discarded: items.filter((i) => i.status === "discarded").length
  };
  const denominator = stats.total - stats.discarded;
  stats.progress = denominator > 0 ? stats.done / denominator : 0;
  return stats;
}

function ensureAutoSeed() {
  if (!state.analyses) state.analyses = { categories: [], items: [] };
  if (state.analyses.categories.length > 0) {
    // Backfill: ensure every existing item has a kind matching the seed
    const seedByCatName = new Map();
    for (const s of ANALYSES_SEED_CATALOG) seedByCatName.set(s.name, new Map(s.items.map((it) => [it.name.toLowerCase(), it.kind])));
    let backfilled = 0;
    for (const cat of state.analyses.categories) {
      const seedMap = seedByCatName.get(cat.name);
      if (!seedMap) continue;
      for (const item of state.analyses.items.filter((i) => i.categoryId === cat.id)) {
        const k = seedMap.get(item.name.toLowerCase());
        if (k && item.kind !== k) { item.kind = k; backfilled++; }
        if (!item.kind) { item.kind = "questionnaire"; backfilled++; }
        if (!Array.isArray(item.updates)) { item.updates = []; backfilled++; }
      }
    }
    if (backfilled > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  loadAnalysesSeed();
}

function setupAnalyses() {
  ensureAutoSeed();

  const search = document.getElementById("analysisSearch");
  if (search) {
    search.addEventListener("input", (e) => {
      analysisFilters.search = e.target.value.toLowerCase();
      renderAnalyses();
    });
  }
  const filterCategory = document.getElementById("filterCategory");
  if (filterCategory) {
    filterCategory.addEventListener("change", (e) => {
      analysisFilters.category = e.target.value;
      renderAnalyses();
    });
  }
  const filterStatus = document.getElementById("filterStatus");
  if (filterStatus) {
    filterStatus.addEventListener("change", (e) => {
      analysisFilters.status = e.target.value;
      renderAnalyses();
    });
  }
  const filterPriority = document.getElementById("filterPriority");
  if (filterPriority) {
    filterPriority.addEventListener("change", (e) => {
      analysisFilters.priority = e.target.value;
      renderAnalyses();
    });
  }

  // Delegated handlers for dynamic content
  const container = document.getElementById("analysesCategories");
  if (container) {
    container.addEventListener("click", handleAnalysesClick);
    container.addEventListener("change", handleAnalysesChange);
    container.addEventListener("input", handleAnalysesInput);
    container.addEventListener("submit", handleAnalysesSubmit);
  }

  // Delegated handlers in plan preview (badges)
  const planPreview = document.getElementById("planPreview");
  if (planPreview) {
    planPreview.addEventListener("click", (event) => {
      const badge = event.target.closest(".cat-progress-badge");
      if (!badge) return;
      const catId = badge.dataset.catId;
      const missing = badge.dataset.noCategory;
      if (catId) {
        switchTab("analyses");
        analysisFilters.category = catId;
        const select = document.getElementById("filterCategory");
        if (select) select.value = catId;
        renderAnalyses();
        scrollToCategoryCard(catId);
      } else if (missing) {
        switchTab("analyses");
        offerSeedForCode(missing);
      }
    });
  }

  // Suggestion bar click handlers
  const suggestion = document.getElementById("planSyncSuggestion");
  if (suggestion) suggestion.addEventListener("click", handleSuggestionClick);

  installPlanBadgeObserver();
  setTimeout(installPlanBadgeObserver, 800);
  setTimeout(schedulePlanBadgeInject, 1000);
}

function switchTab(tabId) {
  const button = document.querySelector(`.tab[data-tab="${tabId}"]`);
  if (button) button.click();
}

function scrollToCategoryCard(catId) {
  setTimeout(() => {
    const card = document.querySelector(`.category-card[data-cat-id="${catId}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

function scrollToPlanCategory(code) {
  switchTab("plan");
  setTimeout(() => {
    const heading = document.getElementById(`plan-analysis-${code}`);
    if (heading) heading.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function loadAnalysesSeed() {
  const existingByCode = new Map(state.analyses.categories.map((c) => [c.code, c]));
  let addedCats = 0;
  let addedItems = 0;
  for (const seed of ANALYSES_SEED_CATALOG) {
    let cat = existingByCode.get(seed.code);
    if (!cat) {
      cat = { id: uid(), code: seed.code, name: seed.name, description: seed.description, custom: false };
      state.analyses.categories.push(cat);
      existingByCode.set(seed.code, cat);
      addedCats++;
    }
    const existing = state.analyses.items.filter((i) => i.categoryId === cat.id);
    const existingItemNames = new Set(existing.map((i) => i.name.toLowerCase()));
    for (const seedItem of seed.items) {
      const itemName = typeof seedItem === "string" ? seedItem : seedItem.name;
      const kind = typeof seedItem === "string" ? "questionnaire" : (seedItem.kind || "questionnaire");
      if (existingItemNames.has(itemName.toLowerCase())) {
        // Backfill kind for items added before kinds existed
        const match = existing.find((i) => i.name.toLowerCase() === itemName.toLowerCase());
        if (match && !match.kind) match.kind = kind;
        continue;
      }
      state.analyses.items.push(createItem(cat.id, itemName, kind));
      addedItems++;
    }
  }
  sortCategoriesByCode();
  saveState();
}

function offerSeedForCode(code) {
  const seed = ANALYSES_SEED_CATALOG.find((s) => s.code === code.toUpperCase());
  if (!seed) return;
  const cat = { id: uid(), code: seed.code, name: seed.name, description: seed.description, custom: false };
  state.analyses.categories.push(cat);
  for (const seedItem of seed.items) {
    const itemName = typeof seedItem === "string" ? seedItem : seedItem.name;
    const kind = typeof seedItem === "string" ? "questionnaire" : (seedItem.kind || "questionnaire");
    state.analyses.items.push(createItem(cat.id, itemName, kind));
  }
  sortCategoriesByCode();
  saveState();
  scrollToCategoryCard(cat.id);
}

function sortCategoriesByCode() {
  state.analyses.categories.sort((a, b) => {
    const ac = (a.code || "ZZ").toUpperCase();
    const bc = (b.code || "ZZ").toUpperCase();
    return ac.localeCompare(bc);
  });
}

function createItem(categoryId, name, kind = "questionnaire") {
  const now = new Date().toISOString();
  return {
    id: uid(),
    categoryId,
    name,
    kind,
    description: "",
    priority: "none",
    status: "pending",
    cost: "",
    invasiveness: "",
    actionability: "",
    notes: "",
    targetDate: "",
    updates: [],
    createdAt: now,
    updatedAt: now
  };
}

function addCustomCategoryPrompt() {
  const name = prompt("Nombre de la categoría personalizada");
  if (!name || !name.trim()) return;
  const code = prompt("Letra o código corto (ej. R, S, X1). Déjalo vacío para auto-asignar.", autoNextCode()) || autoNextCode();
  const description = prompt("Descripción breve (opcional)") || "";
  const cat = { id: uid(), code: (code || "").trim().toUpperCase(), name: name.trim(), description: description.trim(), custom: true };
  state.analyses.categories.push(cat);
  sortCategoriesByCode();
  expandedCategories.add(cat.id);
  saveState();
  scrollToCategoryCard(cat.id);
}

function autoNextCode() {
  const used = new Set(state.analyses.categories.map((c) => (c.code || "").toUpperCase()));
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(82 + i); // start from "R" since A-Q are seeds
    if (!used.has(c)) return c;
  }
  return `X${state.analyses.categories.length + 1}`;
}

function renderAnalyses() {
  populateCategoryFilter();
  renderSummary();
  renderPlanSyncSuggestion();
  renderCategoryGrid();
  const doneCount = document.getElementById("analysesDoneCount");
  if (doneCount) {
    const s = globalStats();
    const denominator = s.total - s.discarded;
    doneCount.textContent = `${s.done} / ${denominator}`;
  }
}

function populateCategoryFilter() {
  const select = document.getElementById("filterCategory");
  if (!select) return;
  const current = analysisFilters.category;
  const opts = [`<option value="all">Todas</option>`].concat(
    state.analyses.categories.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.code ? `${c.code}. ${c.name}` : c.name)}</option>`)
  );
  select.innerHTML = opts.join("");
  if (current === "all" || state.analyses.categories.some((c) => c.id === current)) {
    select.value = current;
  } else {
    select.value = "all";
    analysisFilters.category = "all";
  }
}

function renderSummary() {
  const s = globalStats();
  setText("sumPending", s.pending);
  setText("sumInProgress", s.in_progress);
  setText("sumDone", s.done);
  setText("sumDiscarded", s.discarded);
  const bar = document.getElementById("analysesProgressBar");
  const label = document.getElementById("analysesProgressLabel");
  const pct = Math.round(s.progress * 100);
  const denominator = s.total - s.discarded;
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%  (${s.done} / ${denominator})`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function renderPlanSyncSuggestion() {
  const box = document.getElementById("planSyncSuggestion");
  if (!box) return;
  const planCodes = detectPlanCategoryCodes(state.planMarkdown || "");
  const existingCodes = new Set(state.analyses.categories.map((c) => (c.code || "").toUpperCase()));
  const missing = planCodes.filter((code) => !existingCodes.has(code));
  if (!missing.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }
  box.classList.remove("hidden");
  const chips = missing.map((code) => `<button type="button" class="chip" data-action="seed-code" data-code="${escapeHtml(code)}">+ ${escapeHtml(code)}</button>`).join(" ");
  box.innerHTML = `<strong>Found in plan §4 but missing here:</strong> ${chips} <span class="muted">(click to create)</span>`;
}

function detectPlanCategoryCodes(markdown) {
  const lines = String(markdown || "").split("\n");
  const codes = [];
  let inSection = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      inSection = /^##\s+4\.\s/.test(line);
      continue;
    }
    if (inSection && line.startsWith("### ")) {
      const m = line.slice(4).match(/^([A-Za-z])\.\s+/);
      if (m) codes.push(m[1].toUpperCase());
    }
  }
  return codes;
}

function handleSuggestionClick(event) {
  const target = event.target.closest("[data-action='seed-code']");
  if (!target) return;
  offerSeedForCode(target.dataset.code);
}

function renderCategoryGrid() {
  const grid = document.getElementById("analysesCategories");
  const emptyMsg = document.getElementById("analysesEmpty");
  if (!grid) return;

  if (!state.analyses.categories.length) {
    grid.innerHTML = "";
    if (emptyMsg) emptyMsg.classList.remove("hidden");
    return;
  }
  if (emptyMsg) emptyMsg.classList.add("hidden");

  const search = analysisFilters.search;
  const filterCategory = analysisFilters.category;
  const filterStatus = analysisFilters.status;
  const filterPriority = analysisFilters.priority;

  const categories = (filterCategory === "all"
    ? state.analyses.categories
    : state.analyses.categories.filter((c) => c.id === filterCategory)
  );

  const html = categories.map((cat) => {
    const items = state.analyses.items.filter((i) => i.categoryId === cat.id).filter((item) => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterPriority !== "all" && (item.priority || "none") !== filterPriority) return false;
      if (search) {
        const hay = `${item.name} ${item.notes || ""} ${item.description || ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
    return renderCategoryCard(cat, items);
  }).join("");

  grid.innerHTML = html;
}

function renderCategoryCard(cat, items) {
  const stats = categoryStats(cat.id);
  const isOpen = expandedCategories.has(cat.id);
  const codeChip = cat.code ? `<span class="category-code">${escapeHtml(cat.code)}</span>` : "";
  const itemsHtml = items.length
    ? items.map(renderItemRow).join("")
    : `<p class="muted small-pad">No analyses visible with current filters.</p>`;
  return `
    <article class="category-card ${isOpen ? "open" : ""}" data-cat-id="${escapeHtml(cat.id)}">
      <header class="category-head" data-action="toggle-category">
        <div class="category-head-left">
          ${codeChip}
          <div>
            <div class="category-title">${escapeHtml(cat.name)}</div>
            <div class="category-desc">${escapeHtml(cat.description || "")}</div>
          </div>
        </div>
        <div class="category-head-right">
          <span class="category-counter">${stats.done} / ${stats.total} done</span>
          <span class="caret">${isOpen ? "▴" : "▾"}</span>
        </div>
      </header>
      <div class="category-body" ${isOpen ? "" : "hidden"}>
        ${cat.code ? `<div class="category-actions"><button type="button" class="link-btn" data-action="goto-plan" data-code="${escapeHtml(cat.code)}">View §4.${escapeHtml(cat.code)} in the plan →</button></div>` : ""}
        <ul class="analysis-list">${itemsHtml}</ul>
      </div>
    </article>
  `;
}

function renderItemRow(item) {
  const isOpen = expandedItems.has(item.id);
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  const priorityMeta = PRIORITY_META[item.priority || "none"];
  const meta = kindMeta(item.kind);
  const updates = Array.isArray(item.updates) ? item.updates : [];
  const latest = updates.length ? updates[updates.length - 1] : null;
  const latestLine = latest
    ? `<span class="latest-update" title="${escapeHtml(latest.notes || "")}">${escapeHtml(latest.date || latest.createdAt.slice(0, 10))}: ${escapeHtml(latest.value || "(no value)")}</span>`
    : "";

  const detailFields = [];
  if (meta.cost) {
    detailFields.push(`<label>Cost
      <select data-action="update" data-field="cost">
        ${COST_OPTIONS.map((o) => `<option value="${o.value}" ${item.cost === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>
    </label>`);
  }
  if (meta.invasiveness) {
    detailFields.push(`<label>Invasiveness
      <select data-action="update" data-field="invasiveness">
        ${INVASIVENESS_OPTIONS.map((o) => `<option value="${o.value}" ${item.invasiveness === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>
    </label>`);
  }
  if (meta.actionability) {
    detailFields.push(`<label>Actionability 1-5
      <input type="number" min="1" max="5" step="1" value="${escapeHtml(item.actionability || "")}" data-action="update" data-field="actionability" />
    </label>`);
  }
  if (meta.targetDate) {
    detailFields.push(`<label>Target date
      <input type="date" value="${escapeHtml(item.targetDate || "")}" data-action="update" data-field="targetDate" />
    </label>`);
  }

  const detailsGrid = detailFields.length
    ? `<div class="item-details-grid">${detailFields.join("")}</div>`
    : "";

  const updatesList = updates.length
    ? `<ul class="updates-list">${updates.slice().reverse().map((u) => `
        <li class="update-row">
          <span class="update-date">${escapeHtml(u.date || (u.createdAt || "").slice(0, 10))}</span>
          <span class="update-value">${escapeHtml(u.value || "")}</span>
          ${u.notes ? `<span class="update-notes">${escapeHtml(u.notes)}</span>` : ""}
        </li>`).join("")}</ul>`
    : `<p class="muted small-pad updates-empty">No updates logged yet.</p>`;

  const today = new Date().toISOString().slice(0, 10);
  const valueHint = escapeHtml(meta.valueHint || "value");

  return `
    <li class="analysis-item ${isOpen ? "open" : ""}" data-item-id="${escapeHtml(item.id)}">
      <div class="item-row">
        <span class="status-dot ${statusMeta.className}" aria-hidden="true"></span>
        <button type="button" class="item-name" data-action="toggle-item">${escapeHtml(item.name)}</button>
        <span class="kind-chip" title="Field type">${escapeHtml(meta.label)}</span>
        <select class="inline-select priority ${priorityMeta.className}" data-action="update" data-field="priority">
          ${Object.entries(PRIORITY_META).map(([v, m]) => `<option value="${v}" ${item.priority === v || (!item.priority && v === "none") ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("")}
        </select>
        <select class="inline-select status ${statusMeta.className}" data-action="update" data-field="status">
          ${Object.entries(STATUS_META).map(([v, m]) => `<option value="${v}" ${item.status === v ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("")}
        </select>
        ${latestLine}
        <button type="button" class="icon-btn" data-action="toggle-item" title="Details">${isOpen ? "▴" : "▾"}</button>
      </div>
      <div class="item-details" ${isOpen ? "" : "hidden"}>
        ${detailsGrid}
        <label class="full-width">Notes
          <textarea rows="2" data-action="update" data-field="notes" placeholder="Context, where to do it, real cost, observations...">${escapeHtml(item.notes || "")}</textarea>
        </label>
        <div class="updates-block">
          <div class="updates-head">Updates <span class="muted">(${updates.length})</span></div>
          ${updatesList}
          <form class="add-update-form" data-action="add-update" data-item-id="${escapeHtml(item.id)}">
            <input name="date" type="date" value="${today}" required />
            <input name="value" type="text" placeholder="${valueHint}" />
            <input name="notes" type="text" placeholder="Optional notes" />
            <button type="submit">+ Add update</button>
          </form>
        </div>
      </div>
    </li>
  `;
}

function handleAnalysesClick(event) {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === "toggle-category") {
    const card = actionEl.closest(".category-card");
    if (!card) return;
    const catId = card.dataset.catId;
    if (expandedCategories.has(catId)) expandedCategories.delete(catId);
    else expandedCategories.add(catId);
    renderAnalyses();
  } else if (action === "toggle-item") {
    const li = actionEl.closest(".analysis-item");
    if (!li) return;
    const itemId = li.dataset.itemId;
    if (expandedItems.has(itemId)) expandedItems.delete(itemId);
    else expandedItems.add(itemId);
    renderAnalyses();
  } else if (action === "goto-plan") {
    scrollToPlanCategory(actionEl.dataset.code);
  }
}

function handleAnalysesChange(event) {
  const target = event.target.closest("[data-action='update']");
  if (!target) return;
  const li = target.closest(".analysis-item");
  if (!li) return;
  applyItemUpdate(li.dataset.itemId, target.dataset.field, target.value);
}

function handleAnalysesInput(event) {
  const target = event.target.closest("textarea[data-action='update']");
  if (!target) return;
  const li = target.closest(".analysis-item");
  if (!li) return;
  // Debounce textarea updates lightly via setTimeout chain on dataset
  clearTimeout(target._saveTimer);
  target._saveTimer = setTimeout(() => {
    applyItemUpdate(li.dataset.itemId, target.dataset.field, target.value, { silent: true });
  }, 400);
}

function applyItemUpdate(itemId, field, value, options = {}) {
  const item = state.analyses.items.find((i) => i.id === itemId);
  if (!item) return;
  if (item[field] === value) return;
  item[field] = value;
  item.updatedAt = new Date().toISOString();
  if (options.silent) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderSummary();
    const doneCount = document.getElementById("analysesDoneCount");
    if (doneCount) {
      const s = globalStats();
      const denominator = s.total - s.discarded;
      doneCount.textContent = `${s.done} / ${denominator}`;
    }
  } else {
    saveState();
  }
}

function handleAnalysesSubmit(event) {
  const form = event.target.closest("form[data-action='add-update']");
  if (!form) return;
  event.preventDefault();
  const itemId = form.dataset.itemId;
  const item = state.analyses.items.find((i) => i.id === itemId);
  if (!item) return;
  const data = new FormData(form);
  const date = String(data.get("date") || "").trim();
  const value = String(data.get("value") || "").trim();
  const notes = String(data.get("notes") || "").trim();
  if (!date && !value && !notes) return;
  if (!Array.isArray(item.updates)) item.updates = [];
  item.updates.push({
    id: uid(),
    date: date || new Date().toISOString().slice(0, 10),
    value,
    notes,
    createdAt: new Date().toISOString()
  });
  item.updatedAt = new Date().toISOString();
  expandedItems.add(itemId);
  saveState();
}

function injectPlanCategoryBadges() {
  const preview = document.getElementById("planPreview");
  if (!preview) return;
  preview.querySelectorAll(".cat-progress-badge").forEach((el) => el.remove());

  const headings = preview.querySelectorAll("h2, h3");
  let inAnalyses = false;
  for (const el of headings) {
    if (el.tagName === "H2") {
      const text = el.textContent.trim();
      inAnalyses = /^4\.\s/.test(text);
      if (inAnalyses) el.id = el.id || "plan-section-4";
      continue;
    }
    if (!inAnalyses) continue;
    const text = el.textContent.trim();
    const match = text.match(/^([A-Za-z])\.\s+/);
    if (!match) continue;
    const code = match[1].toUpperCase();
    el.dataset.analysisCode = code;
    if (!el.id || !el.id.startsWith("plan-analysis-")) {
      el.id = `plan-analysis-${code}`;
    }
    el.appendChild(makePlanCategoryBadge(code));
  }
}

function makePlanCategoryBadge(code) {
  const category = (state.analyses?.categories || []).find((c) => c.code === code);
  if (!category) {
    const span = document.createElement("span");
    span.className = "cat-progress-badge missing";
    span.dataset.noCategory = code;
    span.title = "Sin categoría en la pestaña Análisis";
    span.textContent = "sin categoría";
    return span;
  }
  const stats = categoryStats(category.id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cat-progress-badge";
  btn.dataset.catId = category.id;
  btn.title = "Ver en la pestaña Análisis";
  btn.textContent = `${stats.done}/${stats.total} hechos`;
  return btn;
}

let planBadgeObserverInstalled = false;
let planBadgeInjectScheduled = false;
function schedulePlanBadgeInject() {
  if (planBadgeInjectScheduled) return;
  planBadgeInjectScheduled = true;
  requestAnimationFrame(() => {
    planBadgeInjectScheduled = false;
    injectPlanCategoryBadges();
  });
}

function installPlanBadgeObserver() {
  if (planBadgeObserverInstalled) return;
  const preview = document.getElementById("planPreview");
  if (!preview) return;
  planBadgeObserverInstalled = true;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.classList && node.classList.contains("cat-progress-badge")) return;
      }
    }
    schedulePlanBadgeInject();
  });
  observer.observe(preview, { childList: true, subtree: true });
  schedulePlanBadgeInject();
}


setupTabs();
setupForms();
setupImportExport();
setupPlanEditor();
setupSyncSettings();
setupAnalyses();
initializePlan().then(() => requestAnimationFrame(render));
