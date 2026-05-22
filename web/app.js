const STORAGE_KEY = "longevityResearchSystem.v0.1";
const SYNC_SETTINGS_KEY = "longevityResearchSystem.syncSettings.v0.1";
const SEED_PLAN_PATH = "plans/longevity_base.md";

const emptyState = {
  dailyLogs: [],
  foodLogs: [],
  measurements: [],
  recipeExperiments: [],
  planMarkdown: ""
};

let state = loadState();
let syncSettings = loadSyncSettings();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : { ...emptyState };
  } catch (error) {
    console.error("Failed to load state", error);
    return { ...emptyState };
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
      state = { ...emptyState, ...imported };
      saveState();
      syncPlanEditorFromState();
      event.target.value = "";
      alert("Data imported successfully.");
    } catch (error) {
      alert("Import failed. Please select a valid JSON export.");
    }
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    const ok = confirm("Clear all local data in this browser? Export or push to GitHub first if you want a backup.");
    if (!ok) return;
    state = { ...emptyState };
    saveState();
    syncPlanEditorFromState();
  });
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
    if (line.startsWith("### ")) {
      closeList();
      html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
    } else if (line.startsWith("## ")) {
      closeList();
      html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
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
    state = { ...emptyState, ...payload.appState };
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

  const raw = document.getElementById("rawData");
  if (raw) raw.textContent = JSON.stringify(state, null, 2);
}

window.addEventListener("resize", () => requestAnimationFrame(render));
window.addEventListener("orientationchange", () => setTimeout(render, 250));

setupTabs();
setupForms();
setupImportExport();
setupPlanEditor();
setupSyncSettings();
initializePlan().then(() => requestAnimationFrame(render));
