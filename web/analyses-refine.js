(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";
  const MIGRATION_KEY = "longevityResearchSystem.analysesRefine.v0.5";
  const RELOAD_KEY = "longevityResearchSystem.analysesRefineReload.v0.5";
  const PRIORITY_KIND_LABELS = new Set(["lab test", "clinical study", "functional test"]);

  const BASIC_DATA_RULES = new Map([
    ["age", { renameTo: "Birth date", kindLabel: "Birth date", valueType: "date", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }],
    ["birth date", { renameTo: "Birth date", kindLabel: "Birth date", valueType: "date", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }],
    ["height", { hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }],
    ["actual weight (scale)", { renameTo: "Weight", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }],
    ["weight", { renameTo: "Weight", hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }],
    ["waist circumference", { hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }],
    ["hip circumference", { hidePriority: true, hideNotes: true, hideActionability: true, hideTargetDate: true, clearNotes: true }]
  ]);

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function calculateAge(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDelta = today.getMonth() - date.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age--;
    return age >= 0 && age < 130 ? age : null;
  }

  function replacePlanQSection(markdown) {
    const current = String(markdown || "");
    if (!current.includes("### Q.")) return current;

    const replacement = `### Q. Sistema de medición y Measurement Map\n\nQ ya no se tratará como una categoría de análisis principal. Funciona como puente entre el plan científico y la página independiente **Measurement Map**.\n\nEl Plan conserva el criterio general: por qué medir, qué pregunta responde cada medición, con qué frecuencia repetirla y qué decisión podría cambiar.\n\nLa página **Measurement Map** contendrá el catálogo operativo detallado de:\n\n- aparatos de casa,\n- estudios clínicos,\n- análisis de sangre,\n- pruebas funcionales,\n- pruebas cardiovasculares,\n- oxigenación,\n- sueño,\n- composición corporal,\n- ambiente,\n- fotos de dispositivos,\n- instrucciones de uso,\n- comparaciones,\n- prioridad,\n- costo,\n- frecuencia,\n- riesgo de mala interpretación y acción posible.\n\n**Regla:** A–P son categorías de análisis. Q es infraestructura de medición y debe gestionarse en la pestaña Measurement Map.`;

    return current.replace(/### Q\. Mapa ideal de mediciones, pruebas, aparatos y estudios[\s\S]*?(?=\n---\n\n## 5\.|\n## 5\.|$)/, replacement);
  }

  function replaceAgeTextInPlan(markdown) {
    return String(markdown || "")
      .replace(/\bEdad, estatura, peso real/g, "Fecha de nacimiento / edad calculada, estatura, peso real")
      .replace(/\bedad, estatura, peso real/g, "fecha de nacimiento / edad calculada, estatura, peso real")
      .replace(/\bEdad\./g, "Fecha de nacimiento.")
      .replace(/\bEdad\b/g, "Fecha de nacimiento / edad calculada")
      .replace(/\bedad\b/g, "fecha de nacimiento / edad calculada");
  }

  function ruleForItemName(name) {
    return BASIC_DATA_RULES.get(normalize(name)) || null;
  }

  function cleanItemFields(item, rule) {
    let touched = false;
    if (!rule) return false;

    if (rule.renameTo && item.name !== rule.renameTo) {
      item.name = rule.renameTo;
      touched = true;
    }
    if (rule.hidePriority && item.priority !== "none") {
      item.priority = "none";
      touched = true;
    }
    if (rule.hideNotes && item.notes) {
      item.notes = "";
      touched = true;
    }
    if (rule.hideActionability && item.actionability) {
      item.actionability = "";
      touched = true;
    }
    if (rule.hideTargetDate && item.targetDate) {
      item.targetDate = "";
      touched = true;
    }
    if (normalize(item.name) === "birth date" && item.kind !== "personal_fact") {
      item.kind = "personal_fact";
      touched = true;
    }
    return touched;
  }

  function migrateAppStateObject(appState) {
    if (!appState) return false;
    let touched = false;

    if (appState?.analyses?.categories && appState?.analyses?.items) {
      const qCategory = appState.analyses.categories.find((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom);
      if (qCategory) {
        appState.analyses.categories = appState.analyses.categories.filter((cat) => cat.id !== qCategory.id);
        appState.analyses.items = appState.analyses.items.filter((item) => item.categoryId !== qCategory.id);
        touched = true;
      }

      appState.analyses.items.forEach((item) => {
        const rule = ruleForItemName(item.name);
        if (cleanItemFields(item, rule)) touched = true;
      });
    }

    if (appState?.planMarkdown) {
      const migratedPlan = replaceAgeTextInPlan(replacePlanQSection(appState.planMarkdown));
      if (migratedPlan !== appState.planMarkdown) {
        appState.planMarkdown = migratedPlan;
        touched = true;
      }
    }

    if (touched) appState.updatedAt = new Date().toISOString();
    return touched;
  }

  function migrateLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const appState = JSON.parse(raw);
      const touched = migrateAppStateObject(appState);
      if (touched) localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
      return touched;
    } catch (error) {
      console.warn("Analyses refinement migration failed", error);
      return false;
    }
  }

  function migrateRuntimeState() {
    try {
      if (typeof state === "undefined" || !state) return false;
      const touched = migrateAppStateObject(state);
      if (touched) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return touched;
    } catch {
      return false;
    }
  }

  function maybeReloadAfterMigration() {
    const touched = migrateLocalState();
    if (!touched) return;
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  }

  function itemNameFromRow(row) {
    return normalize(row?.querySelector(".item-name")?.textContent || "");
  }

  function itemKindFromRow(row) {
    return normalize(row?.querySelector(".kind-chip")?.textContent || "");
  }

  function shouldShowPriority(row) {
    const rule = ruleForItemName(itemNameFromRow(row));
    if (rule?.hidePriority) return false;
    return PRIORITY_KIND_LABELS.has(itemKindFromRow(row));
  }

  function isBirthDateRow(row) {
    return itemNameFromRow(row) === "age" || itemNameFromRow(row) === "birth date";
  }

  function hideLabelByText(row, pattern) {
    row.querySelectorAll("label").forEach((label) => {
      if (pattern.test(label.textContent || "")) label.classList.add("hidden");
    });
  }

  function patchBasicDataRow(row) {
    const title = row.querySelector(".item-name");
    const rule = ruleForItemName(title?.textContent);
    if (!rule) return;

    if (rule.renameTo && title) title.textContent = rule.renameTo;

    const kind = row.querySelector(".kind-chip");
    if (rule.kindLabel && kind) kind.textContent = rule.kindLabel;

    if (rule.hidePriority) row.querySelector(".priority")?.classList.add("hidden");
    if (rule.hideActionability) hideLabelByText(row, /Actionability/i);
    if (rule.hideTargetDate) hideLabelByText(row, /Target date/i);
    if (rule.hideNotes) hideLabelByText(row, /^\s*Notes\s*/i);

    const valueInput = row.querySelector(".add-update-form input[name='value']");
    if (valueInput && rule.valueType) {
      valueInput.type = rule.valueType;
      valueInput.placeholder = rule.renameTo || title?.textContent || "Value";
    }

    const updateNotes = row.querySelector(".add-update-form input[name='notes']");
    if (updateNotes && rule.hideNotes) updateNotes.classList.add("hidden");
  }

  function patchBirthDateRow(row) {
    patchBasicDataRow(row);

    row.querySelectorAll(".computed-age").forEach((el) => el.remove());
    const latest = row.querySelector(".latest-update");
    const latestText = latest?.textContent || "";
    const birthDateMatch = latestText.match(/:\s*(\d{4}-\d{2}-\d{2})/);
    const age = birthDateMatch ? calculateAge(birthDateMatch[1]) : null;
    if (latest && age !== null) {
      const badge = document.createElement("span");
      badge.className = "computed-age latest-update";
      badge.textContent = `Age: ${age}`;
      latest.insertAdjacentElement("afterend", badge);
    }
  }

  function hideUnneededPriority(row) {
    const priority = row.querySelector(".priority");
    if (!priority) return;
    if (shouldShowPriority(row)) priority.classList.remove("hidden");
    else priority.classList.add("hidden");
  }

  function hideLegacyQCategory() {
    document.querySelectorAll(".category-card").forEach((card) => {
      const code = card.querySelector(".category-code")?.textContent?.trim().toUpperCase();
      const title = normalize(card.querySelector(".category-title")?.textContent || "");
      if (code === "Q" || title.includes("ideal map of measurements")) {
        card.classList.add("analysis-retired-q");
        card.style.display = "none";
      }
    });

    document.querySelectorAll("#filterCategory option").forEach((option) => {
      const text = option.textContent.trim();
      if (/^Q\./i.test(text) || /ideal map of measurements/i.test(text)) option.remove();
    });
  }

  function patchSuggestionBar() {
    const box = document.getElementById("planSyncSuggestion");
    if (!box || box.classList.contains("hidden")) return;
    box.querySelectorAll("[data-code='Q']").forEach((chip) => chip.remove());
    if (!box.querySelector(".chip")) {
      box.classList.add("hidden");
      box.innerHTML = "";
    }
  }

  function patchPlanQBadge() {
    document.querySelectorAll("#planPreview h3").forEach((heading) => {
      if (/^Q\.\s+/i.test(heading.textContent || "")) {
        heading.querySelectorAll(".cat-progress-badge").forEach((badge) => badge.remove());
      }
    });
  }

  function patchRows() {
    document.querySelectorAll(".analysis-item").forEach((row) => {
      if (isBirthDateRow(row)) patchBirthDateRow(row);
      else patchBasicDataRow(row);
      hideUnneededPriority(row);
    });
  }

  function patchSummaryExcludingRetired() {
    const visibleRows = [...document.querySelectorAll(".category-card:not(.analysis-retired-q) .analysis-item")];
    if (!visibleRows.length) return;

    const counts = { pending: 0, in_progress: 0, done: 0, discarded: 0, total: 0 };
    visibleRows.forEach((row) => {
      const status = row.querySelector(".status")?.value || "pending";
      if (counts[status] !== undefined) counts[status]++;
      counts.total++;
    });

    const denominator = Math.max(0, counts.total - counts.discarded);
    const progress = denominator ? Math.round((counts.done / denominator) * 100) : 0;

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    };

    set("sumPending", counts.pending);
    set("sumInProgress", counts.in_progress);
    set("sumDone", counts.done);
    set("sumDiscarded", counts.discarded);
    set("analysesDoneCount", `${counts.done} / ${denominator}`);

    const bar = document.getElementById("analysesProgressBar");
    const label = document.getElementById("analysesProgressLabel");
    if (bar) bar.style.width = `${progress}%`;
    if (label) label.textContent = `${progress}%  (${counts.done} / ${denominator})`;
  }

  function patchUi() {
    hideLegacyQCategory();
    patchSuggestionBar();
    patchRows();
    patchPlanQBadge();
    patchSummaryExcludingRetired();
  }

  function ensureStyles() {
    if (document.getElementById("analysesRefineStyles")) return;
    const style = document.createElement("style");
    style.id = "analysesRefineStyles";
    style.textContent = `
      .analysis-item .inline-select.priority.hidden,
      .analysis-item label.hidden,
      .analysis-item input.hidden,
      .analysis-item textarea.hidden { display: none !important; }
      .computed-age { background: #effaf3; color: #047a44; }

      .analysis-item {
        padding: 0 !important;
        overflow: hidden;
        background: #ffffff;
      }

      .analysis-item > .item-row {
        position: relative;
        align-items: flex-start;
        padding: 12px 12px 10px 16px !important;
        border-bottom: 1px solid rgba(223, 228, 238, 0.9);
        background: linear-gradient(90deg, #f8fbff 0%, #ffffff 58%);
      }

      .analysis-item > .item-row::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: var(--accent);
        opacity: 0.72;
      }

      .analysis-item .status-dot {
        margin-top: 8px;
      }

      .analysis-item .item-name {
        flex-basis: 100%;
        min-width: 0;
        padding: 0 0 4px !important;
        margin-bottom: 2px;
        font-size: clamp(1.04rem, 1.7vw, 1.24rem) !important;
        line-height: 1.25;
        font-weight: 850 !important;
        color: #111827;
        letter-spacing: -0.015em;
      }

      .analysis-item .item-name:hover {
        color: var(--accent);
        text-decoration: none;
      }

      .analysis-item .kind-chip,
      .analysis-item .latest-update,
      .analysis-item .computed-age,
      .analysis-item .inline-select,
      .analysis-item .icon-btn {
        margin-top: 2px;
      }

      .analysis-item .item-details {
        margin-top: 0;
        padding: 12px;
        border-top: 0;
        background: #ffffff;
      }

      .analysis-item .updates-block {
        margin-top: 2px;
        padding-top: 12px;
      }

      @media (max-width: 560px) {
        .analysis-item > .item-row {
          padding: 12px 10px 10px 14px !important;
        }

        .analysis-item .item-name {
          font-size: 1.08rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  migrateLocalState();
  ensureStyles();
  patchUi();

  const earlyObserver = new MutationObserver(() => {
    migrateRuntimeState();
    patchUi();
  });
  earlyObserver.observe(document.documentElement, { childList: true, subtree: true });

  const fastGuard = setInterval(() => {
    migrateLocalState();
    migrateRuntimeState();
    patchUi();
  }, 60);
  setTimeout(() => clearInterval(fastGuard), 5000);

  maybeReloadAfterMigration();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      maybeReloadAfterMigration();
      ensureStyles();
      migrateRuntimeState();
      patchUi();
      setInterval(() => {
        migrateLocalState();
        migrateRuntimeState();
        patchUi();
      }, 1000);
      const root = document.body;
      const observer = new MutationObserver(() => requestAnimationFrame(() => {
        migrateRuntimeState();
        patchUi();
      }));
      observer.observe(root, { childList: true, subtree: true });
    }, 700);
  });
})();
