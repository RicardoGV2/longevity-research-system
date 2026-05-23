(() => {
  const EDIT_KEY = "longevityResearchSystem.foodLogV2.editingId";
  let editingId = sessionStorage.getItem(EDIT_KEY) || "";

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function num(value) {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function dayIndex(day) {
    const match = String(day || "").match(/day_(\d+)/);
    return match ? Number(match[1]) : 99;
  }

  function timeToMinutes(time) {
    const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function entrySortKey(entry) {
    const t = timeToMinutes(entry.time) ?? 0;
    if (entry.date) return `${entry.date} ${String(t).padStart(4, "0")}`;
    return `${String(dayIndex(entry.day)).padStart(2, "0")} ${String(t).padStart(4, "0")}`;
  }

  function sameFoodDay(a, b) {
    if (a.date && b.date) return a.date === b.date;
    return a.day && b.day && a.day === b.day;
  }

  function sortedFoodLogs() {
    return [...(state.foodLogs || [])].sort((a, b) => entrySortKey(a).localeCompare(entrySortKey(b)));
  }

  function minutesBetween(a, b) {
    if (!sameFoodDay(a, b)) return null;
    const at = timeToMinutes(a.time);
    const bt = timeToMinutes(b.time);
    if (at === null || bt === null || bt <= at) return null;
    return bt - at;
  }

  function hoursLabel(minutes) {
    if (!Number.isFinite(minutes)) return "—";
    const h = minutes / 60;
    return h < 1 ? `${minutes} min` : `${Math.round(h * 10) / 10} h`;
  }

  function satietyClass(minutes) {
    if (!Number.isFinite(minutes)) return "unknown";
    if (minutes < 120) return "short";
    if (minutes <= 240) return "moderate";
    return "long";
  }

  function satietyLabel(minutes) {
    const cls = satietyClass(minutes);
    if (cls === "short") return "short window";
    if (cls === "moderate") return "moderate window";
    if (cls === "long") return "long window";
    return "pending next entry";
  }

  function yesNoUnknown(value) {
    return [
      ["unknown", "Unknown"],
      ["yes", "Yes"],
      ["no", "No"]
    ].map(([v, l]) => `<option value="${v}" ${value === v ? "selected" : ""}>${l}</option>`).join("");
  }

  function option(value, label, selected) {
    return `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
  }

  function checkbox(name, value, label, selectedValues = []) {
    const checked = selectedValues.includes(value) ? "checked" : "";
    return `<label class="food-check"><input type="checkbox" name="${esc(name)}" value="${esc(value)}" ${checked}> ${esc(label)}</label>`;
  }

  function ensureStyles() {
    if (document.getElementById("foodLogV2Styles")) return;
    const style = document.createElement("style");
    style.id = "foodLogV2Styles";
    style.textContent = `
      .food-section-title { grid-column: 1 / -1; margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--line); color: #111827; font-size: 1.05rem; font-weight: 850; }
      .food-help { grid-column: 1 / -1; color: var(--muted); margin: -2px 0 4px; font-size: 0.92rem; }
      .food-check-grid { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; border: 1px solid var(--line); border-radius: 14px; padding: 12px; background: #fbfcff; }
      .food-check { color: #374151; font-weight: 650; display: flex; align-items: center; gap: 6px; }
      .food-form-actions { grid-column: 1 / -1; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      #cancelFoodEditBtn.hidden { display: none; }
      .food-log-list { margin-top: 20px; display: grid; gap: 12px; }
      .food-entry-card { border: 1px solid var(--line); border-radius: 18px; background: #ffffff; padding: 14px; display: grid; gap: 10px; box-shadow: 0 12px 30px rgba(17, 24, 39, 0.04); }
      .food-entry-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .food-entry-title { min-width: 0; }
      .food-entry-title strong { display: block; color: #111827; font-size: 1.02rem; }
      .food-entry-title span { color: var(--muted); font-size: 0.88rem; }
      .food-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .food-metric { border: 1px solid var(--line); border-radius: 12px; padding: 9px 10px; background: #fbfcff; }
      .food-metric span { display: block; color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
      .food-metric strong { color: #111827; font-size: 0.95rem; }
      .satiety-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 0.78rem; font-weight: 800; }
      .satiety-chip.short { background: #fff1f2; color: #be123c; }
      .satiety-chip.moderate { background: #eff6ff; color: #1d4ed8; }
      .satiety-chip.long { background: #ecfdf5; color: #047857; }
      .satiety-chip.unknown { background: #f3f4f6; color: #4b5563; }
      .food-tags { display: flex; gap: 6px; flex-wrap: wrap; }
      .food-tag { background: #eef2ff; color: #374151; border-radius: 999px; padding: 4px 8px; font-size: 0.78rem; font-weight: 700; }
      .food-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
      .food-empty { border: 1px dashed var(--line); border-radius: 16px; padding: 18px; color: var(--muted); text-align: center; }
      @media (max-width: 680px) {
        .food-check-grid, .food-metric-grid { grid-template-columns: 1fr; }
        .food-entry-head { display: grid; }
        .food-actions { justify-content: flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  function formHtml(entry = {}) {
    const digestive = Array.isArray(entry.digestiveSymptoms) ? entry.digestiveSymptoms : [];
    const context = Array.isArray(entry.contextTags) ? entry.contextTags : [];
    return `
      <input type="hidden" name="editId" value="${esc(entry.id || "")}">
      <label>Date <input name="date" type="date" value="${esc(entry.date || todayIso())}" /></label>
      <label>Day
        <select name="day" required>
          ${[1,2,3,4,5,6,7].map((n) => option(`day_${n}`, `Day ${n}`, entry.day || "day_1")).join("")}
        </select>
      </label>
      <label>Time <input name="time" type="time" value="${esc(entry.time || "")}" required /></label>
      <label>Entry type
        <select name="entryType">
          ${option("meal", "Meal", entry.entryType || "meal")}
          ${option("snack", "Snack", entry.entryType)}
          ${option("drink", "Drink with calories", entry.entryType)}
          ${option("taste", "Small taste / bite", entry.entryType)}
        </select>
      </label>
      <label>Place
        <select name="place">
          ${option("home", "Home", entry.place || "home")}
          ${option("work", "Work/office", entry.place)}
          ${option("restaurant", "Restaurant", entry.place)}
          ${option("delivery", "Delivery/takeaway", entry.place)}
          ${option("social", "Social/family/friends", entry.place)}
          ${option("street", "Transport/street", entry.place)}
          ${option("other", "Other", entry.place)}
        </select>
      </label>
      <label class="full">Food or drink <textarea name="description" rows="3" required>${esc(entry.description || "")}</textarea></label>
      <label>Approx. quantity <input name="quantity" type="text" value="${esc(entry.quantity || "")}" placeholder="grams, pieces, plate, cup..." /></label>

      <h3 class="food-section-title">Measurable pre-meal context</h3>
      <p class="food-help">This replaces the old hunger 1–10 score. The goal is to capture observable context instead of a vague feeling.</p>
      <label>Hours since last calories <input name="hoursSinceLastCalories" type="number" inputmode="decimal" step="0.25" min="0" value="${esc(entry.hoursSinceLastCalories ?? "")}" placeholder="optional; auto if previous entry exists" /></label>
      <label>Eating trigger
        <select name="eatingTrigger">
          ${option("planned_meal", "Planned meal", entry.eatingTrigger || "planned_meal")}
          ${option("physical_empty", "Physical empty-stomach signs", entry.eatingTrigger)}
          ${option("post_workout", "After training / activity", entry.eatingTrigger)}
          ${option("craving", "Craving / specific food desire", entry.eatingTrigger)}
          ${option("stress", "Stress / emotion", entry.eatingTrigger)}
          ${option("social", "Social situation", entry.eatingTrigger)}
          ${option("convenience", "Convenience / available food", entry.eatingTrigger)}
          ${option("schedule", "Because of schedule", entry.eatingTrigger)}
          ${option("other", "Other", entry.eatingTrigger)}
        </select>
      </label>
      <label>Pre-meal body state
        <select name="preMealBodyState">
          ${option("normal", "Normal / neutral", entry.preMealBodyState || "normal")}
          ${option("empty_stomach", "Empty stomach / stomach noise", entry.preMealBodyState)}
          ${option("low_energy", "Low energy / shaky", entry.preMealBodyState)}
          ${option("craving_without_empty", "Craving without empty stomach", entry.preMealBodyState)}
          ${option("already_full", "Already full", entry.preMealBodyState)}
          ${option("bloated", "Bloated / heavy", entry.preMealBodyState)}
          ${option("unknown", "Not sure", entry.preMealBodyState)}
        </select>
      </label>
      <label>Meal completion
        <select name="mealCompletion">
          ${option("comfortable", "Stopped comfortable", entry.mealCompletion || "comfortable")}
          ${option("still_wanted_more", "Still wanted more", entry.mealCompletion)}
          ${option("too_full", "Too full", entry.mealCompletion)}
          ${option("left_food", "Left food / stopped early", entry.mealCompletion)}
          ${option("unknown", "Not sure", entry.mealCompletion)}
        </select>
      </label>

      <h3 class="food-section-title">Observable composition flags</h3>
      <label>Protein source present?
        <select name="proteinPresent">${yesNoUnknown(entry.proteinPresent || "unknown")}</select>
      </label>
      <label>Fiber-rich plant present?
        <select name="fiberPresent">${yesNoUnknown(entry.fiberPresent || "unknown")}</select>
      </label>
      <label>Refined carbs / added sugar?
        <select name="refinedCarbSugarPresent">${yesNoUnknown(entry.refinedCarbSugarPresent || "unknown")}</select>
      </label>
      <label>Mostly ultra-processed?
        <select name="ultraProcessed">${yesNoUnknown(entry.ultraProcessed || "unknown")}</select>
      </label>

      <h3 class="food-section-title">60–90 min observable response</h3>
      <label>Energy change
        <select name="energyChange">
          ${option("unknown", "Not checked yet", entry.energyChange || "unknown")}
          ${option("higher", "Higher / more stable", entry.energyChange)}
          ${option("same", "Same", entry.energyChange)}
          ${option("lower", "Lower", entry.energyChange)}
          ${option("crash", "Clear crash", entry.energyChange)}
        </select>
      </label>
      <label>Sleepiness 0–3 <input name="sleepiness" type="number" inputmode="numeric" min="0" max="3" step="1" value="${esc(entry.sleepiness ?? "")}" placeholder="0 none, 3 strong" /></label>

      <div class="food-check-grid">
        ${checkbox("digestiveSymptoms", "normal", "Normal digestion", digestive)}
        ${checkbox("digestiveSymptoms", "heavy", "Heavy stomach", digestive)}
        ${checkbox("digestiveSymptoms", "bloating", "Bloating", digestive)}
        ${checkbox("digestiveSymptoms", "gas", "Gas", digestive)}
        ${checkbox("digestiveSymptoms", "reflux", "Reflux", digestive)}
        ${checkbox("digestiveSymptoms", "pain", "Abdominal pain", digestive)}
        ${checkbox("digestiveSymptoms", "nausea", "Nausea", digestive)}
        ${checkbox("digestiveSymptoms", "diarrhea", "Diarrhea", digestive)}
      </div>

      <h3 class="food-section-title">Context tags</h3>
      <div class="food-check-grid">
        ${checkbox("contextTags", "stress", "High stress", context)}
        ${checkbox("contextTags", "rush", "In a rush", context)}
        ${checkbox("contextTags", "post_training", "After training", context)}
        ${checkbox("contextTags", "pre_training", "Before training", context)}
        ${checkbox("contextTags", "bad_sleep", "Bad previous sleep", context)}
        ${checkbox("contextTags", "alcohol", "Alcohol that day", context)}
        ${checkbox("contextTags", "high_caffeine", "High caffeine", context)}
        ${checkbox("contextTags", "social", "Social meal", context)}
      </div>
      <label class="full">Notes <textarea name="notes" rows="2" placeholder="Only add details that help interpretation.">${esc(entry.notes || entry.context || "")}</textarea></label>
      <div class="food-form-actions">
        <button id="saveFoodEntryBtn" type="submit">${entry.id ? "Update food entry" : "Save food entry"}</button>
        <button id="cancelFoodEditBtn" class="secondary-dark ${entry.id ? "" : "hidden"}" type="button">Cancel edit</button>
      </div>
    `;
  }

  function readForm(form) {
    const fd = new FormData(form);
    return {
      schemaVersion: "foodLog.v2",
      date: fd.get("date") || "",
      day: fd.get("day") || "day_1",
      time: fd.get("time") || "",
      entryType: fd.get("entryType") || "meal",
      place: fd.get("place") || "home",
      description: fd.get("description") || "",
      quantity: fd.get("quantity") || "",
      hoursSinceLastCalories: num(fd.get("hoursSinceLastCalories")),
      eatingTrigger: fd.get("eatingTrigger") || "planned_meal",
      preMealBodyState: fd.get("preMealBodyState") || "normal",
      mealCompletion: fd.get("mealCompletion") || "comfortable",
      proteinPresent: fd.get("proteinPresent") || "unknown",
      fiberPresent: fd.get("fiberPresent") || "unknown",
      refinedCarbSugarPresent: fd.get("refinedCarbSugarPresent") || "unknown",
      ultraProcessed: fd.get("ultraProcessed") || "unknown",
      energyChange: fd.get("energyChange") || "unknown",
      sleepiness: num(fd.get("sleepiness")),
      digestiveSymptoms: fd.getAll("digestiveSymptoms"),
      contextTags: fd.getAll("contextTags"),
      notes: fd.get("notes") || ""
    };
  }

  function resetFoodForm(entry = null) {
    const old = document.getElementById("foodForm");
    if (!old) return;
    const fresh = old.cloneNode(false);
    fresh.id = "foodForm";
    fresh.className = old.className || "form-grid";
    fresh.innerHTML = formHtml(entry || {});
    old.replaceWith(fresh);

    fresh.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = readForm(fresh);
      if (editingId) {
        const idx = state.foodLogs.findIndex((x) => x.id === editingId);
        if (idx >= 0) {
          state.foodLogs[idx] = { ...state.foodLogs[idx], ...payload, updatedAt: new Date().toISOString() };
        }
        editingId = "";
        sessionStorage.removeItem(EDIT_KEY);
      } else {
        state.foodLogs.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
          ...payload
        });
      }
      saveState();
      resetFoodForm();
      renderFoodEntries();
    });

    fresh.querySelector("#cancelFoodEditBtn")?.addEventListener("click", () => {
      editingId = "";
      sessionStorage.removeItem(EDIT_KEY);
      resetFoodForm();
    });
  }

  function labelMap(value) {
    const labels = {
      planned_meal: "planned meal",
      physical_empty: "physical signs",
      post_workout: "post-workout",
      craving: "craving",
      stress: "stress/emotion",
      social: "social",
      convenience: "convenience",
      schedule: "schedule",
      normal: "normal",
      empty_stomach: "empty stomach",
      low_energy: "low energy",
      craving_without_empty: "craving/no empty stomach",
      already_full: "already full",
      bloated: "bloated",
      comfortable: "comfortable stop",
      still_wanted_more: "wanted more",
      too_full: "too full",
      left_food: "left food",
      higher: "higher energy",
      same: "same energy",
      lower: "lower energy",
      crash: "crash",
      unknown: "unknown",
      meal: "meal",
      snack: "snack",
      drink: "calorie drink",
      taste: "taste/bite"
    };
    return labels[value] || String(value || "—").replaceAll("_", " ");
  }

  function compositionTags(entry) {
    const tags = [];
    if (entry.proteinPresent === "yes") tags.push("protein");
    if (entry.fiberPresent === "yes") tags.push("fiber");
    if (entry.refinedCarbSugarPresent === "yes") tags.push("refined/sugar");
    if (entry.ultraProcessed === "yes") tags.push("ultra-processed");
    if (Array.isArray(entry.digestiveSymptoms) && entry.digestiveSymptoms.length) tags.push(...entry.digestiveSymptoms.filter((x) => x !== "normal").map(labelMap));
    if (Array.isArray(entry.contextTags) && entry.contextTags.length) tags.push(...entry.contextTags.map(labelMap));
    return tags;
  }

  function renderFoodEntries() {
    const foodPanel = document.getElementById("food");
    if (!foodPanel) return;
    let list = document.getElementById("foodLogEntriesV2");
    if (!list) {
      list = document.createElement("div");
      list.id = "foodLogEntriesV2";
      list.className = "food-log-list";
      foodPanel.appendChild(list);
    }

    const logs = sortedFoodLogs();
    if (!logs.length) {
      list.innerHTML = `<div class="food-empty">No food entries yet. Start with real intake, without changing the diet.</div>`;
      return;
    }

    list.innerHTML = logs.map((entry, idx) => {
      const prev = idx > 0 ? logs[idx - 1] : null;
      const next = idx < logs.length - 1 ? logs[idx + 1] : null;
      const autoSincePrev = prev ? minutesBetween(prev, entry) : null;
      const untilNext = next ? minutesBetween(entry, next) : null;
      const sincePrev = Number.isFinite(entry.hoursSinceLastCalories) ? `${entry.hoursSinceLastCalories} h manual` : hoursLabel(autoSincePrev);
      const satClass = satietyClass(untilNext);
      const tags = compositionTags(entry);
      const legacy = entry.schemaVersion === "foodLog.v2" ? "" : `<span class="food-tag">legacy entry</span>`;

      return `
        <article class="food-entry-card" data-food-id="${esc(entry.id)}">
          <div class="food-entry-head">
            <div class="food-entry-title">
              <strong>${esc(entry.description || "Untitled intake")}</strong>
              <span>${esc(entry.date || entry.day || "day")} · ${esc(entry.time || "no time")} · ${esc(labelMap(entry.entryType || "meal"))} · ${esc(entry.quantity || "no quantity")}</span>
            </div>
            <span class="satiety-chip ${satClass}">${esc(satietyLabel(untilNext))}</span>
          </div>
          <div class="food-metric-grid">
            <div class="food-metric"><span>Since previous calories</span><strong>${esc(sincePrev)}</strong></div>
            <div class="food-metric"><span>Until next calories</span><strong>${esc(hoursLabel(untilNext))}</strong></div>
            <div class="food-metric"><span>Trigger</span><strong>${esc(labelMap(entry.eatingTrigger || "unknown"))}</strong></div>
            <div class="food-metric"><span>Pre-meal state</span><strong>${esc(labelMap(entry.preMealBodyState || "unknown"))}</strong></div>
            <div class="food-metric"><span>Energy response</span><strong>${esc(labelMap(entry.energyChange || (entry.energyAfter ? `legacy ${entry.energyAfter}/10` : "unknown")))}</strong></div>
            <div class="food-metric"><span>Sleepiness</span><strong>${entry.sleepiness ?? "—"}/3</strong></div>
          </div>
          <div class="food-tags">${legacy}${tags.map((t) => `<span class="food-tag">${esc(t)}</span>`).join("")}</div>
          ${entry.notes || entry.context ? `<p class="muted">${esc(entry.notes || entry.context)}</p>` : ""}
          <div class="food-actions">
            <button type="button" class="secondary-dark" data-food-action="edit">Edit</button>
            <button type="button" class="danger" data-food-action="delete">Delete</button>
          </div>
        </article>`;
    }).join("");
  }

  function installFoodActions() {
    document.addEventListener("click", (event) => {
      const action = event.target?.dataset?.foodAction;
      if (!action) return;
      const card = event.target.closest(".food-entry-card");
      const id = card?.dataset?.foodId;
      const entry = (state.foodLogs || []).find((x) => x.id === id);
      if (!entry) return;

      if (action === "edit") {
        editingId = id;
        sessionStorage.setItem(EDIT_KEY, id);
        resetFoodForm({
          ...entry,
          digestiveSymptoms: Array.isArray(entry.digestiveSymptoms) ? entry.digestiveSymptoms : [],
          contextTags: Array.isArray(entry.contextTags) ? entry.contextTags : []
        });
        document.getElementById("foodForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (action === "delete") {
        if (!confirm("Delete this food entry?")) return;
        state.foodLogs = (state.foodLogs || []).filter((x) => x.id !== id);
        saveState();
        renderFoodEntries();
      }
    });
  }

  function patchRender() {
    try {
      if (typeof render !== "function" || render.__foodLogV2Guarded) return;
      const originalRender = render;
      render = function renderWithFoodLogV2() {
        originalRender();
        renderFoodEntries();
      };
      render.__foodLogV2Guarded = true;
    } catch (error) {
      console.warn("Could not patch food log renderer", error);
    }
  }

  function install() {
    ensureStyles();
    patchRender();
    resetFoodForm();
    installFoodActions();
    renderFoodEntries();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 250));
})();
