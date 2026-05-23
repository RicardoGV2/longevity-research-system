(() => {
  function getElements() {
    return {
      plan: document.getElementById("plan"),
      editor: document.getElementById("planEditor"),
      preview: document.getElementById("planPreview"),
      toggleBtn: document.getElementById("planModeToggleBtn"),
      saveBtn: document.getElementById("savePlanBtn"),
      label: document.querySelector("#plan .editor-label"),
      previewTitle: document.getElementById("planPreviewTitle"),
      tocList: document.getElementById("planTocList")
    };
  }

  function isPlanActive() {
    const { plan } = getElements();
    return Boolean(plan?.classList.contains("active"));
  }

  function isMarkdownMode() {
    const { editor, preview } = getElements();
    return Boolean(editor && preview && !editor.classList.contains("is-hidden") && preview.classList.contains("is-hidden"));
  }

  function slugify(text) {
    return String(text || "section")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 90) || "section";
  }

  function getMarkdownHeadings(markdown) {
    const used = new Map();
    return String(markdown || "")
      .split("\n")
      .map((line, lineIndex) => ({ line, lineIndex }))
      .filter(({ line }) => /^(#{1,4})\s+(.+)$/.test(line.trim()))
      .map(({ line, lineIndex }) => {
        const match = line.trim().match(/^(#{1,4})\s+(.+)$/);
        const text = match[2].trim().replace(/\*\*/g, "");
        const base = slugify(text);
        const count = used.get(base) || 0;
        used.set(base, count + 1);
        return {
          id: count === 0 ? base : `${base}-${count + 1}`,
          text,
          lineIndex
        };
      });
  }

  function getPreviewAnchor() {
    const { preview, tocList } = getElements();
    const active = tocList?.querySelector("a.active")?.dataset?.anchor;
    if (active) return active;

    const headings = [...(preview?.querySelectorAll("h1,h2,h3,h4") || [])];
    if (!headings.length) return null;

    const targetY = Math.min(window.innerHeight * 0.34, 220);
    const beforeTarget = headings
      .filter((heading) => heading.getBoundingClientRect().top <= targetY)
      .pop();

    return beforeTarget?.id || headings[0]?.id || null;
  }

  function getEditorAnchor() {
    const { editor, tocList } = getElements();
    if (!editor) return tocList?.querySelector("a.active")?.dataset?.anchor || null;

    const headings = getMarkdownHeadings(editor.value);
    const before = editor.value.slice(0, editor.selectionStart || 0);
    const line = before.split("\n").length - 1;
    return headings.filter((heading) => heading.lineIndex <= line).pop()?.id || headings[0]?.id || null;
  }

  function scrollEditorToAnchor(anchor) {
    const { editor } = getElements();
    if (!editor || !anchor) return;

    const headings = getMarkdownHeadings(editor.value);
    const heading = headings.find((item) => item.id === anchor) || headings[0];
    if (!heading) return;

    const lines = editor.value.split("\n");
    const position = lines.slice(0, heading.lineIndex).join("\n").length + (heading.lineIndex > 0 ? 1 : 0);
    const lineHeight = 22;

    editor.focus({ preventScroll: true });
    editor.setSelectionRange(position, position);
    editor.scrollTop = Math.max(0, heading.lineIndex * lineHeight - 90);

    const desiredTop = Math.max(0, window.scrollY + editor.getBoundingClientRect().top - 145);
    window.scrollTo({ top: desiredTop, behavior: "auto" });

    window.setTimeout(() => {
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(position, position);
      editor.scrollTop = Math.max(0, heading.lineIndex * lineHeight - 90);
    }, 40);
  }

  function scrollPreviewToAnchor(anchor) {
    if (!anchor) return;
    const element = document.getElementById(anchor);
    if (!element) return;
    element.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function showMarkdown(anchor) {
    const { editor, preview, toggleBtn, saveBtn, label, previewTitle } = getElements();
    if (!editor || !preview) return;

    if (typeof window.enhancedPlanRender === "function") window.enhancedPlanRender();

    editor.classList.remove("is-hidden");
    editor.classList.add("full-editor");
    preview.classList.add("is-hidden");
    label?.classList.remove("is-hidden");
    previewTitle?.classList.add("is-hidden");
    if (saveBtn) saveBtn.style.display = "inline-flex";
    if (toggleBtn) toggleBtn.textContent = "Show preview";

    window.setTimeout(() => scrollEditorToAnchor(anchor), 50);
  }

  function showPreview(anchor) {
    const { editor, preview, toggleBtn, saveBtn, label, previewTitle } = getElements();
    if (!editor || !preview) return;

    if (typeof window.enhancedPlanRender === "function") window.enhancedPlanRender();

    editor.classList.add("is-hidden");
    preview.classList.remove("is-hidden");
    label?.classList.add("is-hidden");
    previewTitle?.classList.remove("is-hidden");
    if (saveBtn) saveBtn.style.display = "none";
    if (toggleBtn) toggleBtn.textContent = "Edit Markdown";

    window.setTimeout(() => scrollPreviewToAnchor(anchor), 50);
  }

  function install() {
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#planModeToggleBtn");
      if (!button || !isPlanActive()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (isMarkdownMode()) {
        showPreview(getEditorAnchor());
      } else {
        showMarkdown(getPreviewAnchor());
      }
    }, true);

    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.("#planTocList a");
      if (!link || !isPlanActive()) return;

      if (isMarkdownMode()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const anchor = link.dataset.anchor;
        history.replaceState(null, "", `#${anchor}`);
        scrollEditorToAnchor(anchor);
      }
    }, true);

    document.addEventListener("click", (event) => {
      const save = event.target?.closest?.("#savePlanBtn");
      if (!save || !isPlanActive() || !isMarkdownMode()) return;
      const anchor = getEditorAnchor();
      window.setTimeout(() => showPreview(anchor), 140);
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(install, 800);
  });
})();
