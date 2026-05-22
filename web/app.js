const STORAGE_KEY = "longevityResearchSystem.v0.1";

const emptyState = {
  dailyLogs: [],
  foodLogs: [],
  measurements: [],
  recipeExperiments: []
};

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

let state = loadState();

function parseNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getFormData(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
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
      render();
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
      const text = await file.text();
      const imported = JSON.parse(text);
      state = { ...emptyState, ...imported };
      saveState();
      event.target.value = "";
      alert("Data imported successfully.");
    } catch (error) {
      alert("Import failed. Please select a valid JSON export.");
    }
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    const ok = confirm("Clear all local data in this browser? Export first if you want a backup.");
    if (!ok) return;
    state = { ...emptyState };
    saveState();
  });
}

function sortByDate(items) {
  return [...items].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

function drawLineChart(canvasId, points, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = canvas.height || 180;
  const cssHeight = Number(canvas.getAttribute("height")) || 180;
  canvas.height = cssHeight * ratio;
  ctx.scale(ratio, ratio);

  const width = rect.width;
  const height = cssHeight;
  ctx.clearRect(0, 0, width, height);

  const valid = points.filter((p) => p.value !== null && p.value !== undefined && Number.isFinite(p.value));
  if (valid.length === 0) {
    ctx.fillStyle = "#647084";
    ctx.font = "14px system-ui";
    ctx.fillText("No data yet", 18, 34);
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

  function x(i) {
    return valid.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (valid.length - 1);
  }
  function y(v) {
    return height - pad - ((v - min) * (height - pad * 2)) / (max - min);
  }

  ctx.strokeStyle = options.color || "#2563eb";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  valid.forEach((p, i) => {
    const px = x(i);
    const py = y(p.value);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
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
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const cssHeight = Number(canvas.getAttribute("height")) || 180;
  canvas.width = rect.width * ratio;
  canvas.height = cssHeight * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, rect.width, cssHeight);

  const a = seriesA.filter((p) => Number.isFinite(p.value));
  const b = seriesB.filter((p) => Number.isFinite(p.value));
  const all = [...a, ...b];
  if (!all.length) {
    ctx.fillStyle = "#647084";
    ctx.font = "14px system-ui";
    ctx.fillText("No data yet", 18, 34);
    return;
  }

  const pad = 28;
  const min = 1;
  const max = 10;
  const len = Math.max(a.length, b.length, 1);
  const x = (i) => len === 1 ? rect.width / 2 : pad + (i * (rect.width - pad * 2)) / (len - 1);
  const y = (v) => cssHeight - pad - ((v - min) * (cssHeight - pad * 2)) / (max - min);

  ctx.strokeStyle = "#dfe4ee";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, cssHeight - pad);
  ctx.lineTo(rect.width - pad, cssHeight - pad);
  ctx.stroke();

  function draw(series, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    series.forEach((p, i) => {
      if (!Number.isFinite(p.value)) return;
      if (i === 0) ctx.moveTo(x(i), y(p.value));
      else ctx.lineTo(x(i), y(p.value));
    });
    ctx.stroke();
  }

  draw(a, "#2563eb");
  draw(b, "#b91c1c");
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

window.addEventListener("resize", render);

setupTabs();
setupForms();
setupImportExport();
render();
