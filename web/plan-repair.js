(() => {
  const STORAGE_KEY = "longevityResearchSystem.v0.1";
  const DRAFT_KEY = "longevityResearchSystem.planDraft.v0.1";

  const cleanFactorsA = "**Factores a considerar:** fecha de nacimiento / edad calculada, estatura, peso real, cintura, cadera, composición corporal, actividad física, historial de carga física, lesiones, dolor, medicamentos, suplementos, sueño, estrés, horario laboral y exposición sedentaria.";

  function hasRepeatedBirthDate(text) {
    const matches = String(text || "").match(/fecha de nacimiento/gi) || [];
    return matches.length >= 4;
  }

  function repairSectionA(markdown) {
    const text = String(markdown || "");
    const sectionMatch = text.match(/(### A\. Punto de partida físico y biológico[\s\S]*?)(\n---\n\n### B\.|\n### B\.|$)/);
    if (!sectionMatch || !hasRepeatedBirthDate(sectionMatch[1])) return text;

    const repairedA = `### A. Punto de partida físico y biológico\n\nAntes de diseñar cualquier rutina o alimentación, necesitamos conocer el estado inicial.\n\n${cleanFactorsA}\n\n**Riesgos si no se mide:** crear un plan demasiado agresivo, sobreestimar el estado físico, subestimar lesiones, diseñar algo que no encaje con la vida real o crear expectativas incorrectas.\n\n**Cómo medirlo:** peso promedio, cinta métrica, fotos, registro simple, evaluación de movilidad y análisis clínicos si aplica.\n`;

    return text.replace(sectionMatch[0], `${repairedA}${sectionMatch[2]}`);
  }

  function repairRepeatedBirthDateText(markdown) {
    let text = String(markdown || "");
    text = repairSectionA(text);

    // Safety net for any repeated text produced by older migration scripts.
    text = text.replace(/(?:fecha de nacimiento\s*\/\s*){3,}(?:fecha de nacimiento\s*\/?\s*)?/gi, "fecha de nacimiento / edad calculada");
    text = text.replace(/(?:Fecha de nacimiento\s*\/\s*){3,}(?:fecha de nacimiento\s*\/?\s*)?/g, "Fecha de nacimiento / edad calculada");
    text = text.replace(/edad calculada\s+calculada/gi, "edad calculada");
    return text;
  }

  function repairStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const appState = JSON.parse(raw);
      if (!appState || typeof appState.planMarkdown !== "string") return false;
      const repaired = repairRepeatedBirthDateText(appState.planMarkdown);
      if (repaired === appState.planMarkdown) return false;
      appState.planMarkdown = repaired;
      appState.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      return true;
    } catch (error) {
      console.warn("Plan repair skipped", error);
      return false;
    }
  }

  function repairDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft.text !== "string") return false;
      const repaired = repairRepeatedBirthDateText(draft.text);
      if (repaired === draft.text) return false;
      draft.text = repaired;
      draft.updatedAt = new Date().toISOString();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      return true;
    } catch {
      return false;
    }
  }

  repairStoredState();
  repairDraft();

  window.repairLongevityPlanText = repairRepeatedBirthDateText;

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(() => {
      const editor = document.getElementById("planEditor");
      if (!editor) return;
      const repaired = repairRepeatedBirthDateText(editor.value || "");
      if (repaired === editor.value) return;
      editor.value = repaired;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      repairStoredState();
      const status = document.getElementById("syncStatus");
      if (status) status.textContent = "Plan text repaired locally. Push to GitHub to update other devices.";
    }, 600);
  });
})();
