(() => {
  function getEls() {
    return {
      plan: document.getElementById("plan"),
      editor: document.getElementById("planEditor"),
      preview: document.getElementById("planPreview"),
      toggle: document.getElementById("planModeToggleBtn"),
      save: document.getElementById("savePlanBtn"),
      label: document.querySelector("#plan .editor-label"),
      previewTitle: document.getElementById("planPreviewTitle"),
      tocList: document.getElementById("planTocList")
    };
  }

  function planIsActive() {
    return Boolean(document.getElementById("plan")?.classList.contains("active"));
  }

  function markdownIsVisible() {
    const { editor, preview } = getEls();
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
    const lines = String(markdown || "").split("\n");
    const headings = [];
    let charIndex = 0;

    lines.forEach((line, lineIndex) => {
      const match = line.trim().match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const text = match[2].trim().replace(/\*\*/g, "");
        const base = slugify(text);
        const count = used.get(base) || 0;
        used.set(base, count + 1);
        headings.push({
          id: count === 0 ? base : `${base}-${count + 1}`,
          text,
          lineIndex,
          charIndex
        });
      }
      charIndex += line.length + 1;
    });

    return headings;
  }

  function currentPreviewAnchor() {
    const { preview } = getEls();
    if (!preview) return null;

    const headings = [...preview.querySelectorAll("h1,h2,h3,h4")];
    if (!headings.length) {
      return document.querySelector("#planTocList a.active")?.dataset?.anchor || null;
    }

    const targetY = Math.min(Math.max(window.innerHeight * 0.32, 130), 260);
    const previous = headings
      .filter((heading) => heading.getBoundingClientRect().top <= targetY)
      .pop();

    if (previous?.id) return previous.id;

    const closest = headings
      .map((heading) => ({
        id: heading.id,
        distance: Math.abs(heading.getBoundingClientRect().top - targetY)
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    return closest?.id || document.querySelector("#planTocList a.active")?.dataset?.anchor || null;
  }

  function currentEditorAnchor() {
    const { editor } = getEls();
    if (!editor) return null;
    const headings = getMarkdownHeadings(editor.value);
    if (!headings.length) return null;
    const position = editor.selectionStart || 0;
    return headings.filter((heading) => heading.charIndex <= position).pop()?.id || headings[0]?.id || null;
  }

  function caretTopInTextarea(textarea, position) {
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const properties = [
      "boxSizing", "width", "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
      "textTransform", "wordSpacing", "textIndent", "whiteSpace", "lineHeight", "paddingTop",
      "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth",
      "borderBottomWidth", "borderLeftWidth"
    ];

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.overflow = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";
    mirror.style.wordWrap = "break-word";
    mirror.style.width = `${textarea.clientWidth}px`;

    properties.forEach((prop) => {
      mirror.style[prop] = computed[prop];
    });

    const before = textarea.value.slice(0, position);
    const span = document.createElement("span");
    mirror.textContent = before;
    span.textContent = textarea.value.slice(position, position + 1) || ".";
    mirror.appendChild(span);
    document.body.appendChild(mirror);

    const top = span.offsetTop;
    document.body.removeChild(mirror);
    return top;
  }

  function scrollEditorToAnchor(anchor) {
    const { editor } = getEls();
    if (!editor || !anchor) return;

    const headings = getMarkdownHeadings(editor.value);
    const heading = headings.find((item) => item.id === anchor) || headings[0];
    if (!heading) return;

    function applyScroll() {
      const top = caretTopInTextarea(editor, heading.charIndex);
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(heading.charIndex, heading.charIndex + Math.min(80, Math.max(1, heading.text.length)));
      editor.scrollTop = Math.max(0, top - 95);
    }

    applyScroll();
    requestAnimationFrame(() => {
      applyScroll();
      const pageTop = Math.max(0, window.scrollY + editor.getBoundingClientRect().top - 132);
      window.scrollTo({ top: pageTop, behavior: "auto" });
      setTimeout(applyScroll, 80);
      setTimeout(applyScroll, 200);
    });
  }

  function scrollPreviewToAnchor(anchor) {
    if (!anchor) return;
    const target = document.getElementById(anchor);
    if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function showMarkdown(anchor) {
    const { editor, preview, save, toggle, label, previewTitle } = getEls();
    if (!editor || !preview) return;

    if (typeof window.enhancedPlanRender === "function") window.enhancedPlanRender();

    editor.classList.remove("is-hidden");
    editor.classList.add("full-editor");
    preview.classList.add("is-hidden");
    label?.classList.remove("is-hidden");
    previewTitle?.classList.add("is-hidden");
    if (save) save.style.display = "inline-flex";
    if (toggle) toggle.textContent = "Show preview";

    setTimeout(() => scrollEditorToAnchor(anchor), 40);
  }

  function showPreview(anchor) {
    const { editor, preview, save, toggle, label, previewTitle } = getEls();
    if (!editor || !preview) return;

    if (typeof window.enhancedPlanRender === "function") window.enhancedPlanRender();

    editor.classList.add("is-hidden");
    preview.classList.remove("is-hidden");
    label?.classList.add("is-hidden");
    previewTitle?.classList.remove("is-hidden");
    if (save) save.style.display = "none";
    if (toggle) toggle.textContent = "Edit Markdown";

    setTimeout(() => scrollPreviewToAnchor(anchor), 40);
  }

  function install() {
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("#planModeToggleBtn");
      if (!button || !planIsActive()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (markdownIsVisible()) showPreview(currentEditorAnchor());
      else showMarkdown(currentPreviewAnchor());
    }, true);

    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.("#planTocList a");
      if (!link || !planIsActive() || !markdownIsVisible()) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const anchor = link.dataset.anchor;
      history.replaceState(null, "", `#${anchor}`);
      scrollEditorToAnchor(anchor);
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 900));
})();
