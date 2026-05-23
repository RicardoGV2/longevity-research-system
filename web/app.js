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

  renderAnalyses();

  const editor = document.getElementById("planEditor");
  if (editor) renderMarkdownPreview(editor.value);

  const raw = document.getElementById("rawData");
  if (raw) raw.textContent = JSON.stringify(state, null, 2);
}

window.addEventListener("resize", () => requestAnimationFrame(render));
window.addEventListener("orientationchange", () => setTimeout(render, 250));

// ============================================================
// Analyses module
// ============================================================

const STATUS_META = {
  pending:     { label: "Pendiente",   className: "status-pending" },
  in_progress: { label: "En progreso", className: "status-in-progress" },
  done:        { label: "Hecho",       className: "status-done" },
  discarded:   { label: "Descartado",  className: "status-discarded" }
};

const PRIORITY_META = {
  none:   { label: "Sin prioridad", className: "priority-none" },
  low:    { label: "Baja",          className: "priority-low" },
  medium: { label: "Media",         className: "priority-medium" },
  high:   { label: "Alta",          className: "priority-high" }
};

const COST_OPTIONS = [
  { value: "",        label: "—" },
  { value: "low",     label: "Bajo" },
  { value: "medium",  label: "Medio" },
  { value: "high",    label: "Alto" }
];

const INVASIVENESS_OPTIONS = [
  { value: "",            label: "—" },
  { value: "none",        label: "Ninguna" },
  { value: "minimal",     label: "Mínima" },
  { value: "invasive",    label: "Invasivo" }
];

const ANALYSES_SEED_CATALOG = [
  { code: "A", name: "Punto de partida físico y biológico", description: "Edad, estatura, peso real, cintura, cadera, composición corporal, actividad física, historial de carga física, lesiones, dolor, medicamentos, suplementos, sueño, estrés, horario laboral y exposición sedentaria.", items: [
    "Edad", "Estatura", "Peso real (báscula)", "Cintura", "Cadera",
    "Composición corporal (DEXA o bioimpedancia)",
    "Actividad física semanal", "Historial de carga física",
    "Lesiones pasadas y actuales", "Dolor actual",
    "Medicamentos", "Suplementos",
    "Calidad y horas de sueño (baseline)", "Estrés percibido",
    "Horario laboral y exposición sedentaria"
  ]},
  { code: "B", name: "Salud metabólica", description: "Glucosa, HbA1c, insulina, lípidos, ApoB, presión arterial, grasa visceral, cintura, hígado graso, inflamación, fibra, alcohol, azúcar, ultraprocesados y calidad de carbohidratos.", items: [
    "Glucosa en ayunas", "HbA1c", "Insulina en ayunas", "HOMA-IR (calculado)",
    "Panel lipídico completo", "ApoB",
    "Presión arterial en casa (7 días AM/PM)",
    "Grasa visceral (DEXA o estimación)",
    "Hígado graso (ecografía o FibroScan)",
    "hs-CRP (inflamación)",
    "Registro de fibra diaria", "Registro de alcohol",
    "Registro de azúcar añadida", "% ultraprocesados",
    "Calidad de carbohidratos"
  ]},
  { code: "C", name: "Salud cardiovascular", description: "Frecuencia cardiaca en reposo, recuperación cardiaca, capacidad aeróbica, zona 2, HIIT, caminatas, correr, bicicleta, técnica, calzado e impacto articular.", items: [
    "Frecuencia cardíaca en reposo", "Recuperación cardíaca post-esfuerzo",
    "VO2 max estimado (wearable o test)",
    "Tiempo semanal en zona 2", "Sesiones HIIT por semana",
    "Caminatas diarias",
    "Running: ritmo, distancia, técnica",
    "Bicicleta: tiempo e intensidad",
    "Evaluación de calzado",
    "Impacto articular subjetivo"
  ]},
  { code: "D", name: "Fuerza, masa muscular y salud ósea", description: "Fuerza de tren superior/inferior/espalda, agarre, masa muscular, densidad ósea, progresión, técnica, simetría, dolor, recuperación y volumen semanal.", items: [
    "Fuerza tren superior (press / push-up test)",
    "Fuerza tren inferior (sentadilla / peso muerto)",
    "Fuerza de espalda (remo / dominadas)",
    "Fuerza de agarre (dinamómetro)",
    "Masa muscular (DEXA o bioimpedancia)",
    "Densidad ósea (DEXA)",
    "Progresión semanal de cargas",
    "Técnica en levantamientos clave",
    "Simetría izquierda/derecha",
    "Dolor post-entrenamiento",
    "Recuperación entre sesiones",
    "Volumen semanal por grupo muscular"
  ]},
  { code: "E", name: "Movilidad, articulaciones y longevidad mecánica", description: "Tobillos, caderas, espalda torácica, hombros, muñecas, isquiotibiales, rodillas, escápulas, pies, postura, técnica de carga y técnica de carrera.", items: [
    "Movilidad de tobillos", "Movilidad de caderas",
    "Movilidad de columna torácica", "Movilidad de hombros",
    "Movilidad de muñecas",
    "Flexibilidad de isquiotibiales", "Estabilidad de rodillas",
    "Control escapular", "Salud de los pies (arco, postura)",
    "Postura general",
    "Técnica de carga (sentadilla, peso muerto)",
    "Técnica de carrera"
  ]},
  { code: "F", name: "Sueño y recuperación", description: "Horas, calidad, horarios, despertares, cafeína, alcohol, cena, entrenamiento nocturno, luz artificial, temperatura, estrés, frecuencia cardiaca nocturna y HRV.", items: [
    "Horas de sueño", "Calidad subjetiva 1-10",
    "Consistencia de horarios", "Despertares nocturnos",
    "Cafeína: cantidad y hora del último café",
    "Alcohol y sueño",
    "Cena: horario y composición",
    "Entrenamiento nocturno: impacto",
    "Exposición a luz artificial y pantallas",
    "Temperatura del cuarto",
    "Estrés antes de dormir",
    "Frecuencia cardíaca nocturna",
    "HRV nocturno",
    "Latencia para dormir"
  ]},
  { code: "G", name: "Alimentación y nutrición de largo plazo", description: "Calorías, proteína, carbohidratos, grasas, fibra, micronutrientes, hidratación, sodio, potasio, magnesio, calcio, vitamina D, omega-3, hierro, B12, folato, ultraprocesados, alcohol, horarios, saciedad, digestión y comida disponible en Irlanda.", items: [
    "Calorías diarias estimadas",
    "Proteína g/día", "Carbohidratos g/día", "Grasas g/día", "Fibra g/día",
    "Hidratación (litros/día)",
    "Sodio", "Potasio", "Magnesio", "Calcio",
    "Vitamina D", "Omega-3 (dieta + omega-3 index)",
    "Hierro", "B12", "Folato",
    "% ultraprocesados", "Alcohol semanal",
    "Horarios de comida",
    "Saciedad y digestión post-comida",
    "Disponibilidad real de alimentos en Irlanda"
  ]},
  { code: "H", name: "Digestión, microbiota y salud intestinal", description: "Fibra, verduras, frutas, legumbres, fermentados, agua, regularidad, hinchazón, gases, reflujo, intolerancias y comidas problemáticas.", items: [
    "Fibra g/día",
    "Variedad de verduras semanales", "Variedad de frutas",
    "Legumbres por semana", "Fermentados por semana",
    "Hidratación",
    "Regularidad intestinal", "Hinchazón", "Gases", "Reflujo",
    "Intolerancias conocidas",
    "Comidas que provocan molestias"
  ]},
  { code: "I", name: "Estrés, salud mental y propósito", description: "Estrés laboral/financiero, presión por metas, ansiedad, motivación, relación con comida/cuerpo, familia, vida social, descanso, tiempo sin pantalla, propósito y sentido existencial.", items: [
    "Nivel de estrés laboral", "Estrés financiero",
    "Presión por metas", "Ansiedad", "Motivación",
    "Relación con la comida y el cuerpo",
    "Conexión familiar", "Vida social",
    "Descanso mental", "Tiempo sin pantalla",
    "Sentido de propósito"
  ]},
  { code: "J", name: "Ambiente: Irlanda, clima, luz y estilo de vida", description: "Poca luz en invierno, lluvia, frío, días cortos, vitamina D, caminatas, transporte, entorno de actividad física, seguridad, supermercados, costos, rutinas indoor y ánimo estacional.", items: [
    "Exposición a luz natural diaria",
    "Vitamina D (sol y suplementación)",
    "Caminatas con luz natural",
    "Transporte y minutos caminando",
    "Entornos disponibles para ejercicio",
    "Seguridad para correr/caminar",
    "Acceso a supermercados",
    "Costos de alimentos clave",
    "Rutinas indoor para invierno",
    "Ánimo estacional (SAD)"
  ]},
  { code: "K", name: "Trabajo, sedentarismo y ergonomía", description: "Horas sentado, pausas, postura, cuello, lumbar, fatiga visual, café, snacks, comidas laborales, caminatas y estrés por deadlines.", items: [
    "Horas sentado al día",
    "Pausas activas (cantidad y frecuencia)",
    "Postura en el escritorio",
    "Dolor de cuello", "Dolor lumbar", "Fatiga visual",
    "Consumo de café en el trabajo", "Snacks laborales",
    "Comidas laborales (composición)",
    "Caminatas durante la jornada",
    "Estrés por deadlines"
  ]},
  { code: "L", name: "Prevención de lesiones y daño acumulativo", description: "Volumen, intensidad, frecuencia, repetición, técnica, descanso, calentamiento, movilidad, dolor, sueño, estrés, calzado, superficie y progresión.", items: [
    "Volumen semanal de entrenamiento",
    "Intensidad relativa",
    "Frecuencia de movimientos repetitivos",
    "Técnica en ejercicios clave",
    "Descanso entre sesiones",
    "Calentamiento estructurado",
    "Movilidad preventiva",
    "Dolor recurrente",
    "Sueño suficiente para recuperar",
    "Manejo del estrés",
    "Calzado adecuado",
    "Superficie de entrenamiento",
    "Progresión de cargas"
  ]},
  { code: "M", name: "Biomarcadores y medicina preventiva", description: "Hemograma, glucosa, HbA1c, insulina, lípidos, ApoB, presión arterial, vitamina D, B12, folato, ferritina, hierro, TSH, función hepática, función renal, hs-CRP, testosterona si aplica, magnesio y omega-3 index.", items: [
    "Hemograma completo",
    "Glucosa en ayunas", "HbA1c", "Insulina",
    "Panel lipídico", "ApoB",
    "Presión arterial",
    "Vitamina D (25-OH)", "B12", "Folato",
    "Ferritina", "Hierro sérico",
    "TSH",
    "Función hepática (ALT, AST, GGT)",
    "Función renal (creatinina, eGFR)",
    "hs-CRP",
    "Testosterona (si aplica)",
    "Magnesio",
    "Omega-3 index"
  ]},
  { code: "N", name: "Suplementos y protocolos avanzados", description: "Los suplementos no son la base. Primero van sueño, alimentación, entrenamiento, luz, estrés y análisis.", items: [
    "Vitamina D3 (dosis según análisis)",
    "Omega-3 (EPA+DHA)",
    "Magnesio",
    "Creatina monohidrato",
    "Proteína en polvo (si déficit)",
    "Multivitamínico (si déficit)",
    "Otros (sólo tras evaluar análisis)"
  ]},
  { code: "O", name: "Azúcar, carbohidratos refinados y respuesta glucémica", description: "Azúcar añadida, azúcares libres, bebidas azucaradas, jugos, postres, harinas blancas, fibra, proteína/grasa en la comida, respuesta glucémica, antojos, energía, hambre, salud dental y contexto.", items: [
    "Azúcar añadida diaria",
    "Azúcares libres (jugos, miel, etc.)",
    "Bebidas azucaradas semanales",
    "Postres semanales",
    "Harinas blancas semanales",
    "Fibra acompañando carbohidratos",
    "Proteína/grasa acompañando carbohidratos",
    "Respuesta glucémica (CGM si disponible)",
    "Antojos",
    "Energía post-comida",
    "Hambre 2-3 h post-comida",
    "Salud dental",
    "Contexto emocional del consumo"
  ]},
  { code: "P", name: "Sistema de investigación alimentaria progresiva", description: "Alimento individual → combinación simple → receta completa → horario → orden de consumo → respuesta personal → ajuste.", items: [
    "Alimentos individuales en evaluación",
    "Combinaciones simples probadas",
    "Recetas completas probadas",
    "Horarios óptimos por comida",
    "Orden de consumo (verdura → proteína → carbohidrato)",
    "Respuesta personal por alimento",
    "Ajustes registrados"
  ]},
  { code: "Q", name: "Mapa ideal de mediciones, pruebas, aparatos y estudios", description: "Báscula, cinta métrica, presión arterial, oxímetro, wearable, banda de pecho, glucómetro, CGM, ECG, prueba de esfuerzo, CPET/VO2 max, DEXA, estudio de sueño, análisis de sangre, pruebas funcionales y mediciones ambientales.", items: [
    "Báscula", "Cinta métrica",
    "Tensiómetro (Omron o similar)",
    "Oxímetro de pulso",
    "Wearable (reloj con HR, sueño, HRV)",
    "Banda de pecho HR",
    "Glucómetro", "CGM (Libre o Dexcom)",
    "ECG (en clínica)",
    "Prueba de esfuerzo",
    "CPET / VO2 max",
    "DEXA (composición + densidad ósea)",
    "Estudio de sueño",
    "Panel longevidad de análisis de sangre",
    "Pruebas funcionales (sentadilla profunda, dorsiflexión, plancha)",
    "Mediciones ambientales (luz, temp, CO₂ del dormitorio)"
  ]}
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

function setupAnalyses() {
  const loadSeedBtn = document.getElementById("loadAnalysesSeedBtn");
  if (loadSeedBtn) loadSeedBtn.addEventListener("click", () => loadAnalysesSeed());

  const addCatBtn = document.getElementById("addCategoryBtn");
  if (addCatBtn) addCatBtn.addEventListener("click", addCustomCategoryPrompt);

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
    const existingItemNames = new Set(
      state.analyses.items.filter((i) => i.categoryId === cat.id).map((i) => i.name.toLowerCase())
    );
    for (const itemName of seed.items) {
      if (existingItemNames.has(itemName.toLowerCase())) continue;
      state.analyses.items.push(createItem(cat.id, itemName));
      addedItems++;
    }
  }
  sortCategoriesByCode();
  saveState();
  setSyncStatus(`Catálogo cargado. Añadidas ${addedCats} categorías y ${addedItems} análisis nuevos.`);
}

function offerSeedForCode(code) {
  const seed = ANALYSES_SEED_CATALOG.find((s) => s.code === code.toUpperCase());
  if (!seed) {
    alert(`No hay semilla para la categoría ${code}. Créala como personalizada con el botón "+ Categoría personalizada".`);
    return;
  }
  const ok = confirm(`Crear la categoría ${seed.code}. ${seed.name} con ${seed.items.length} análisis sugeridos?`);
  if (!ok) return;
  const cat = { id: uid(), code: seed.code, name: seed.name, description: seed.description, custom: false };
  state.analyses.categories.push(cat);
  for (const itemName of seed.items) state.analyses.items.push(createItem(cat.id, itemName));
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

function createItem(categoryId, name) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    categoryId,
    name,
    description: "",
    priority: "none",
    status: "pending",
    cost: "",
    invasiveness: "",
    actionability: "",
    notes: "",
    targetDate: "",
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
  box.innerHTML = `<strong>Detectadas en §4 del plan, sin categoría aquí:</strong> ${chips} <span class="muted">(click para crear)</span>`;
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
  const customTag = cat.custom ? `<span class="badge custom-tag">Personalizada</span>` : "";
  const itemsHtml = items.length
    ? items.map(renderItemRow).join("")
    : `<p class="muted small-pad">Sin análisis visibles con los filtros actuales.</p>`;
  return `
    <article class="category-card ${isOpen ? "open" : ""}" data-cat-id="${escapeHtml(cat.id)}">
      <header class="category-head" data-action="toggle-category">
        <div class="category-head-left">
          ${codeChip}
          <div>
            <div class="category-title">${escapeHtml(cat.name)} ${customTag}</div>
            <div class="category-desc">${escapeHtml(cat.description || "")}</div>
          </div>
        </div>
        <div class="category-head-right">
          <span class="category-counter">${stats.done} / ${stats.total} hechos</span>
          <span class="caret">${isOpen ? "▴" : "▾"}</span>
        </div>
      </header>
      <div class="category-body" ${isOpen ? "" : "hidden"}>
        <div class="category-actions">
          ${cat.code ? `<button type="button" class="link-btn" data-action="goto-plan" data-code="${escapeHtml(cat.code)}">Ver §4.${escapeHtml(cat.code)} en el plan →</button>` : ""}
          ${cat.custom ? `<button type="button" class="link-btn danger-link" data-action="delete-category" data-cat-id="${escapeHtml(cat.id)}">Eliminar categoría</button>` : ""}
        </div>
        <ul class="analysis-list">${itemsHtml}</ul>
        <form class="add-item-form" data-action="add-item" data-cat-id="${escapeHtml(cat.id)}">
          <input name="name" type="text" placeholder="Nombre del nuevo análisis" required />
          <button type="submit">+ Agregar análisis</button>
        </form>
      </div>
    </article>
  `;
}

function renderItemRow(item) {
  const isOpen = expandedItems.has(item.id);
  const statusMeta = STATUS_META[item.status] || STATUS_META.pending;
  const priorityMeta = PRIORITY_META[item.priority || "none"];
  return `
    <li class="analysis-item ${isOpen ? "open" : ""}" data-item-id="${escapeHtml(item.id)}">
      <div class="item-row">
        <span class="status-dot ${statusMeta.className}" aria-hidden="true"></span>
        <button type="button" class="item-name" data-action="toggle-item">${escapeHtml(item.name)}</button>
        <select class="inline-select priority ${priorityMeta.className}" data-action="update" data-field="priority">
          ${Object.entries(PRIORITY_META).map(([v, m]) => `<option value="${v}" ${item.priority === v || (!item.priority && v === "none") ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("")}
        </select>
        <select class="inline-select status ${statusMeta.className}" data-action="update" data-field="status">
          ${Object.entries(STATUS_META).map(([v, m]) => `<option value="${v}" ${item.status === v ? "selected" : ""}>${escapeHtml(m.label)}</option>`).join("")}
        </select>
        <button type="button" class="icon-btn" data-action="toggle-item" title="Detalles">${isOpen ? "▴" : "▾"}</button>
      </div>
      <div class="item-details" ${isOpen ? "" : "hidden"}>
        <div class="item-details-grid">
          <label>Costo
            <select data-action="update" data-field="cost">
              ${COST_OPTIONS.map((o) => `<option value="${o.value}" ${item.cost === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
            </select>
          </label>
          <label>Invasividad
            <select data-action="update" data-field="invasiveness">
              ${INVASIVENESS_OPTIONS.map((o) => `<option value="${o.value}" ${item.invasiveness === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
            </select>
          </label>
          <label>Accionabilidad 1-5
            <input type="number" min="1" max="5" step="1" value="${escapeHtml(item.actionability || "")}" data-action="update" data-field="actionability" />
          </label>
          <label>Fecha objetivo
            <input type="date" value="${escapeHtml(item.targetDate || "")}" data-action="update" data-field="targetDate" />
          </label>
        </div>
        <label class="full-width">Notas
          <textarea rows="2" data-action="update" data-field="notes" placeholder="Notas, contexto, dónde hacerlo, costo real, resultado...">${escapeHtml(item.notes || "")}</textarea>
        </label>
        <div class="item-details-actions">
          <button type="button" class="link-btn danger-link" data-action="delete-item">Eliminar análisis</button>
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
  } else if (action === "delete-item") {
    const li = actionEl.closest(".analysis-item");
    if (!li) return;
    const itemId = li.dataset.itemId;
    const item = state.analyses.items.find((i) => i.id === itemId);
    if (!item) return;
    if (!confirm(`¿Eliminar análisis "${item.name}"?`)) return;
    state.analyses.items = state.analyses.items.filter((i) => i.id !== itemId);
    expandedItems.delete(itemId);
    saveState();
  } else if (action === "delete-category") {
    const catId = actionEl.dataset.catId;
    const cat = state.analyses.categories.find((c) => c.id === catId);
    if (!cat) return;
    const count = state.analyses.items.filter((i) => i.categoryId === catId).length;
    if (!confirm(`¿Eliminar categoría "${cat.name}" y sus ${count} análisis?`)) return;
    state.analyses.categories = state.analyses.categories.filter((c) => c.id !== catId);
    state.analyses.items = state.analyses.items.filter((i) => i.categoryId !== catId);
    expandedCategories.delete(catId);
    saveState();
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
  const form = event.target.closest("form[data-action='add-item']");
  if (!form) return;
  event.preventDefault();
  const catId = form.dataset.catId;
  const input = form.querySelector("input[name='name']");
  const name = (input?.value || "").trim();
  if (!name) return;
  state.analyses.items.push(createItem(catId, name));
  expandedCategories.add(catId);
  form.reset();
  saveState();
}

setupTabs();
setupForms();
setupImportExport();
setupPlanEditor();
setupSyncSettings();
setupAnalyses();
initializePlan().then(() => requestAnimationFrame(render));
