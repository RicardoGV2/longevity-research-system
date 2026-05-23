(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";
  const MIGRATION_KEY = "longevityResearchSystem.analysesRefine.v0.2";
  const PRIORITY_KIND_LABELS = new Set(["body measurement", "lab test", "clinical study", "functional test"]);

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

  function migrateLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw);
      let touched = false;

      if (state?.analyses?.categories && state?.analyses?.items) {
        const qCategory = state.analyses.categories.find((cat) => String(cat.code || "").toUpperCase() === "Q" && !cat.custom);
        if (qCategory) {
          state.analyses.categories = state.analyses.categories.filter((cat) => cat.id !== qCategory.id);
          state.analyses.items = state.analyses.items.filter((item) => item.categoryId !== qCategory.id);
          touched = true;
        }

        state.analyses.items.forEach((item) => {
          if (normalize(item.name) === "age") {
            item.name = "Birth date";
            item.kind = "personal_fact";
            item.priority = "none";
            item.notes = "";
            item.actionability = "";
            item.targetDate = "";
            touched = true;
          }
          if (normalize(item.name) === "height" && item.priority !== "none") {
            item.priority = "none";
            touched = true;
          }
        });
      }

      if (state?.planMarkdown) {
        const migratedPlan = replaceAgeTextInPlan(replacePlanQSection(state.planMarkdown));
        if (migratedPlan !== state.planMarkdown) {
          state.planMarkdown = migratedPlan;
          touched = true;
        }
      }

      if (touched) {
        state.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
    } catch (error) {
      console.warn("Analyses refinement migration failed", error);
    }
  }

  function itemNameFromRow(row) {
    return normalize(row?.querySelector(".item-name")?.textContent || "");
  }

  function itemKindFromRow(row) {
    return normalize(row?.querySelector(".kind-chip")?.textContent || "");
  }

  function shouldShowPriority(row) {
    return PRIORITY_KIND_LABELS.has(itemKindFromRow(row));
  }

  function isBirthDateRow(row) {
    return itemNameFromRow(row) === "age" || itemNameFromRow(row) === "birth date";
  }

  function patchBirthDateRow(row) {
    const nameButton = row.querySelector(".item-name");
    if (nameButton) nameButton.textContent = "Birth date";

    const kind = row.querySelector(".kind-chip");
    if (kind) kind.textContent = "Birth date";

    row.querySelector(".priority")?.classList.add("hidden");

    row.querySelectorAll("label.full-width").forEach((label) => {
      if (/notes/i.test(label.textContent || "")) label.classList.add("hidden");
    });
    row.querySelectorAll("textarea[data-field='notes']").forEach((textarea) => {
      textarea.closest("label")?.classList.add("hidden");
    });

    const valueInput = row.querySelector(".add-update-form input[name='value']");
    if (valueInput) {
      valueInput.type = "date";
      valueInput.placeholder = "Birth date";
    }

    const updateNotes = row.querySelector(".add-update-form input[name='notes']");
    if (updateNotes) updateNotes.classList.add("hidden");

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
    `;
    document.head.appendChild(style);
  }

  migrateLocalState();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      ensureStyles();
      patchUi();
      setInterval(patchUi, 1000);
      const root = document.body;
      const observer = new MutationObserver(() => requestAnimationFrame(patchUi));
      observer.observe(root, { childList: true, subtree: true });
    }, 1200);
  });
})();
