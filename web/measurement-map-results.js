(() => {
  const METRICS = {
    "scale": [
      { key: "weight_kg", label: "Weight", unit: "kg", placeholder: "e.g. 90.8", dailyLogField: "weight" },
      { key: "body_fat_pct", label: "Body fat", unit: "%", placeholder: "e.g. 24.4" },
      { key: "muscle_mass_kg", label: "Muscle mass", unit: "kg", placeholder: "optional" }
    ],
    "tape-measure": [
      { key: "waist_cm", label: "Waist", unit: "cm", placeholder: "e.g. 92" },
      { key: "hip_cm", label: "Hip", unit: "cm", placeholder: "e.g. 104" },
      { key: "neck_cm", label: "Neck", unit: "cm", placeholder: "e.g. 39" },
      { key: "chest_cm", label: "Chest", unit: "cm", placeholder: "optional" },
      { key: "abdomen_cm", label: "Abdomen", unit: "cm", placeholder: "optional" },
      { key: "arm_cm", label: "Arm", unit: "cm", placeholder: "optional" },
      { key: "thigh_cm", label: "Thigh", unit: "cm", placeholder: "optional" }
    ],
    "bp-monitor": [
      { key: "blood_pressure_systolic", label: "Systolic", unit: "mmHg", placeholder: "e.g. 118" },
      { key: "blood_pressure_diastolic", label: "Diastolic", unit: "mmHg", placeholder: "e.g. 76" },
      { key: "pulse_bpm", label: "Pulse", unit: "bpm", placeholder: "e.g. 62" }
    ],
    "pulse-oximeter": [
      { key: "spo2", label: "SpO₂", unit: "%", placeholder: "e.g. 98" },
      { key: "pulse_bpm", label: "Pulse", unit: "bpm", placeholder: "e.g. 64" }
    ],
    "wearable": [
      { key: "steps", label: "Steps", unit: "steps", placeholder: "e.g. 8500", dailyLogField: "steps" },
      { key: "sleep_hours", label: "Sleep hours", unit: "h", placeholder: "e.g. 7.5", dailyLogField: "sleepHours" },
      { key: "resting_hr", label: "Resting HR", unit: "bpm", placeholder: "e.g. 58" },
      { key: "hrv", label: "HRV", unit: "ms", placeholder: "e.g. 48" },
      { key: "vo2max_estimated", label: "Estimated VO₂ max", unit: "ml/kg/min", placeholder: "e.g. 42" }
    ],
    "chest-strap": [
      { key: "exercise_hr_avg", label: "Average HR", unit: "bpm", placeholder: "e.g. 135" },
      { key: "exercise_hr_max", label: "Max HR", unit: "bpm", placeholder: "e.g. 172" },
      { key: "hr_recovery_1min", label: "1-min HR recovery", unit: "bpm drop", placeholder: "e.g. 28" }
    ],
    "glucometer": [
      { key: "glucose_mmol_l", label: "Glucose", unit: "mmol/L", placeholder: "e.g. 5.4" },
      { key: "glucose_mg_dl", label: "Glucose", unit: "mg/dL", placeholder: "e.g. 97" }
    ],
    "cgm": [
      { key: "glucose_avg", label: "Average glucose", unit: "mmol/L", placeholder: "e.g. 5.7" },
      { key: "glucose_peak", label: "Meal glucose peak", unit: "mmol/L", placeholder: "e.g. 7.8" },
      { key: "time_in_range", label: "Time in range", unit: "%", placeholder: "e.g. 96" }
    ],
    "ecg": [
      { key: "ecg_result", label: "ECG result", unit: "text", placeholder: "e.g. normal sinus rhythm", text: true },
      { key: "resting_hr", label: "Resting HR", unit: "bpm", placeholder: "e.g. 62" }
    ],
    "stress-test": [
      { key: "stress_test_result", label: "Main result", unit: "text", placeholder: "summary", text: true },
      { key: "exercise_duration", label: "Exercise duration", unit: "min", placeholder: "e.g. 12" },
      { key: "max_hr", label: "Max HR", unit: "bpm", placeholder: "e.g. 180" }
    ],
    "cpet": [
      { key: "vo2max", label: "VO₂ max", unit: "ml/kg/min", placeholder: "e.g. 45" },
      { key: "vt1", label: "VT1", unit: "bpm or watts", placeholder: "e.g. 132" },
      { key: "vt2", label: "VT2", unit: "bpm or watts", placeholder: "e.g. 164" }
    ],
    "dexa": [
      { key: "body_fat_pct", label: "Body fat", unit: "%", placeholder: "e.g. 22.5" },
      { key: "lean_mass_kg", label: "Lean mass", unit: "kg", placeholder: "e.g. 62" },
      { key: "bone_density", label: "Bone density / T-score", unit: "score", placeholder: "e.g. -0.2" },
      { key: "visceral_fat", label: "Visceral fat", unit: "value", placeholder: "optional" }
    ],
    "sleep-study": [
      { key: "ahi", label: "AHI", unit: "events/h", placeholder: "e.g. 4.2" },
      { key: "oxygen_nadir", label: "Oxygen nadir", unit: "%", placeholder: "e.g. 91" },
      { key: "sleep_study_result", label: "Main result", unit: "text", placeholder: "summary", text: true }
    ],
    "blood-panel": [
      { key: "fasting_glucose", label: "Fasting glucose", unit: "mmol/L", placeholder: "e.g. 5.1" },
      { key: "hba1c", label: "HbA1c", unit: "%", placeholder: "e.g. 5.3" },
      { key: "apob", label: "ApoB", unit: "g/L", placeholder: "e.g. 0.80" },
      { key: "ldl_c", label: "LDL-C", unit: "mmol/L", placeholder: "e.g. 2.7" },
      { key: "hscrp", label: "hs-CRP", unit: "mg/L", placeholder: "e.g. 0.8" },
      { key: "vitamin_d", label: "Vitamin D", unit: "nmol/L", placeholder: "e.g. 75" },
      { key: "ferritin", label: "Ferritin", unit: "µg/L", placeholder: "e.g. 90" },
      { key: "b12", label: "B12", unit: "pmol/L", placeholder: "e.g. 350" },
      { key: "free_text_lab", label: "Other lab marker", unit: "text", placeholder: "marker + result", text: true }
    ],
    "air-monitor": [
      { key: "co2", label: "CO₂", unit: "ppm", placeholder: "e.g. 850" },
      { key: "pm25", label: "PM2.5", unit: "µg/m³", placeholder: "e.g. 6" },
      { key: "humidity", label: "Humidity", unit: "%", placeholder: "e.g. 55" },
      { key: "temperature", label: "Temperature", unit: "°C", placeholder: "e.g. 19" },
      { key: "voc", label: "VOC", unit: "index", placeholder: "optional" }
    ]
  };

  const GENERIC_METRICS = [
    { key: "generic_result", label: "Result", unit: "", placeholder: "value or short result", text: true }
  ];

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function metricsFor(itemId) {
    return METRICS[itemId] || GENERIC_METRICS;
  }

  function metricByKey(itemId, key) {
    return metricsFor(itemId).find((m) => m.key === key) || metricsFor(itemId)[0];
  }

  function deviceName(card) {
    return card.querySelector(".map-title h3")?.textContent?.trim() || "Measurement item";
  }

  function resultEntriesFor(itemId) {
    return (state?.measurements || [])
      .filter((entry) => entry?.source === "measurementMap" && entry?.mapItemId === itemId)
      .sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")));
  }

  function ensureStateArrays() {
    if (!state) return;
    if (!Array.isArray(state.measurements)) state.measurements = [];
    if (!Array.isArray(state.dailyLogs)) state.dailyLogs = [];
  }

  function upsertDailyLog(date, field, value) {
    if (!field || value === null || value === undefined) return;
    ensureStateArrays();
    let log = state.dailyLogs.find((entry) => entry.date === date);
    if (!log) {
      log = { id: uid(), createdAt: new Date().toISOString(), date };
      state.dailyLogs.push(log);
    }
    log[field] = value;
    log.updatedAt = new Date().toISOString();
  }

  function saveAppState() {
    if (typeof saveState === "function") saveState();
    else if (typeof STORAGE_KEY === "string") localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function latestHtml(itemId) {
    const results = resultEntriesFor(itemId).slice(0, 5);
    if (!results.length) return `<div class="map-result-empty">No results logged yet.</div>`;
    return `<ul class="map-result-list">${results.map((r) => {
      const raw = r.rawValue ?? (r.value ?? "");
      const value = raw === "" || raw === null || raw === undefined ? "—" : raw;
      return `<li>
        <span class="result-date">${escapeHtml(r.date || "")}</span>
        <span class="result-metric">${escapeHtml(r.metricLabel || r.type || "Result")}</span>
        <strong>${escapeHtml(value)}${r.unit ? ` ${escapeHtml(r.unit)}` : ""}</strong>
      </li>`;
    }).join("")}</ul>`;
  }

  function updateUnitFromMetric(form) {
    const itemId = form.closest(".map-card")?.dataset?.mapId || "";
    const metricKey = form.querySelector("[name='metric']")?.value || "";
    const metric = metricByKey(itemId, metricKey);
    const valueInput = form.querySelector("[name='value']");
    const unitInput = form.querySelector("[name='unit']");
    if (unitInput) unitInput.value = metric.unit || "";
    if (valueInput) {
      valueInput.placeholder = metric.placeholder || "value";
      valueInput.inputMode = metric.text ? "text" : "decimal";
    }
  }

  function renderResultBox(card) {
    if (!card) return;
    const itemId = card.dataset.mapId;
    const box = card.querySelector(".map-result-box");
    if (!box) return;
    const metricOptions = metricsFor(itemId).map((metric) => `<option value="${escapeHtml(metric.key)}">${escapeHtml(metric.label)}</option>`).join("");
    box.innerHTML = `
      <div class="map-result-head">
        <div>
          <span>Log result</span>
          <strong>${escapeHtml(deviceName(card))}</strong>
        </div>
        <small>Saved to the active user's Measurements. Weight/steps/sleep also update Daily Log trends.</small>
      </div>
      <form class="map-result-form">
        <input name="date" type="date" value="${today()}" required />
        <select name="metric">${metricOptions}</select>
        <input name="value" type="text" placeholder="value" />
        <input name="unit" type="text" placeholder="unit" />
        <input name="notes" type="text" placeholder="Optional context" />
        <button type="submit">+ Save result</button>
      </form>
      <div class="map-result-history" aria-live="polite">
        <div class="map-result-history-title">Latest results</div>
        ${latestHtml(itemId)}
      </div>
    `;
    updateUnitFromMetric(box.querySelector("form"));
  }

  function enhanceCard(card) {
    if (!card || card.dataset.resultUiEnhanced === "1") return;
    card.dataset.resultUiEnhanced = "1";
    const body = card.querySelector(".map-body");
    if (!body) return;

    const edit = card.querySelector(".map-edit");
    if (edit) edit.hidden = true;

    const box = document.createElement("section");
    box.className = "map-result-box";
    const insertBefore = card.querySelector(".map-edit");
    body.insertBefore(box, insertBefore || null);
    renderResultBox(card);
  }

  function enhanceAllCards() {
    document.querySelectorAll("#measurementMap .map-card").forEach(enhanceCard);
    document.querySelectorAll("#measurementMap .map-edit").forEach((edit) => { edit.hidden = true; });
  }

  function handleSubmit(event) {
    const form = event.target.closest?.(".map-result-form");
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();

    const card = form.closest(".map-card");
    const itemId = card?.dataset?.mapId;
    if (!card || !itemId) return;

    ensureStateArrays();
    const date = form.querySelector("[name='date']")?.value || today();
    const metricKey = form.querySelector("[name='metric']")?.value || "generic_result";
    const metric = metricByKey(itemId, metricKey);
    const rawValue = form.querySelector("[name='value']")?.value?.trim() || "";
    const unit = form.querySelector("[name='unit']")?.value?.trim() || metric.unit || "";
    const notes = form.querySelector("[name='notes']")?.value?.trim() || "";

    if (!rawValue && !notes) {
      alert("Add a value or a note before saving the result.");
      return;
    }

    const numericValue = metric.text ? null : toNumber(rawValue);
    if (!metric.text && rawValue && numericValue === null) {
      alert("Please enter a numeric value for this result.");
      return;
    }

    state.measurements.push({
      id: uid(),
      createdAt: new Date().toISOString(),
      date,
      type: metric.key,
      metricLabel: metric.label,
      value: numericValue,
      rawValue,
      unit,
      notes,
      source: "measurementMap",
      mapItemId: itemId,
      deviceName: deviceName(card)
    });

    if (metric.dailyLogField && numericValue !== null) upsertDailyLog(date, metric.dailyLogField, numericValue);

    saveAppState();
    renderResultBox(card);
  }

  function installStyles() {
    if (document.getElementById("measurementMapResultsStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapResultsStyles";
    style.textContent = `
      #measurementMap .map-edit {
        display: none !important;
      }

      #measurementMap .map-result-box {
        border: 1px solid #dbe5f3;
        border-radius: 18px;
        background: #ffffff;
        padding: 13px;
        display: grid;
        gap: 11px;
      }

      #measurementMap .map-result-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      #measurementMap .map-result-head span,
      #measurementMap .map-result-history-title {
        display: block;
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #measurementMap .map-result-head strong {
        display: block;
        margin-top: 2px;
        color: #1f2937;
        font-size: 0.98rem;
      }

      #measurementMap .map-result-head small {
        color: #64748b;
        max-width: 360px;
        line-height: 1.3;
        text-align: right;
      }

      #measurementMap .map-result-form {
        display: grid;
        grid-template-columns: 135px minmax(150px, 1.2fr) minmax(110px, 0.8fr) 90px minmax(150px, 1fr) auto;
        gap: 8px;
        align-items: center;
      }

      #measurementMap .map-result-form input,
      #measurementMap .map-result-form select {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 9px 10px;
        background: #ffffff;
        color: var(--ink);
        font: inherit;
        font-size: 0.9rem;
      }

      #measurementMap .map-result-form button {
        min-height: 40px;
        padding: 9px 13px;
        white-space: nowrap;
      }

      #measurementMap .map-result-history {
        border-top: 1px dashed #dbe5f3;
        padding-top: 10px;
      }

      #measurementMap .map-result-empty {
        color: #64748b;
        font-size: 0.9rem;
        padding-top: 5px;
      }

      #measurementMap .map-result-list {
        list-style: none;
        padding: 0;
        margin: 7px 0 0;
        display: grid;
        gap: 6px;
      }

      #measurementMap .map-result-list li {
        display: grid;
        grid-template-columns: 90px minmax(120px, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: 12px;
        background: #f8fafc;
        padding: 8px 10px;
      }

      #measurementMap .result-date {
        color: #2563eb;
        font-weight: 850;
        font-size: 0.86rem;
      }

      #measurementMap .result-metric {
        color: #536078;
        font-size: 0.88rem;
      }

      #measurementMap .map-result-list strong {
        color: #111827;
        font-size: 0.9rem;
        text-align: right;
      }

      @media (max-width: 940px) {
        #measurementMap .map-result-form {
          grid-template-columns: 1fr 1fr;
        }
        #measurementMap .map-result-form button {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 560px) {
        #measurementMap .map-result-head {
          display: grid;
        }
        #measurementMap .map-result-head small {
          text-align: left;
          max-width: none;
        }
        #measurementMap .map-result-form,
        #measurementMap .map-result-list li {
          grid-template-columns: 1fr;
        }
        #measurementMap .map-result-list strong {
          text-align: left;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installEvents() {
    if (window.__measurementMapResultsInstalled) return;
    window.__measurementMapResultsInstalled = true;
    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("change", (event) => {
      const select = event.target.closest?.(".map-result-form [name='metric']");
      if (select) updateUnitFromMetric(select.closest("form"));
    }, true);
  }

  function installObserver() {
    if (window.__measurementMapResultsObserverInstalled) return;
    window.__measurementMapResultsObserverInstalled = true;
    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapResultsTimer);
      window.__measurementMapResultsTimer = setTimeout(enhanceAllCards, 35);
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    installEvents();
    installObserver();
    [0, 120, 500, 1200].forEach((delay) => setTimeout(enhanceAllCards, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
