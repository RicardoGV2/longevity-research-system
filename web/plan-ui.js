(() => {
  let currentMode = "preview";
  let lastHeadings = [];

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

  function inlineMarkdown(text) {
    return esc(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function getElements() {
    return {
      plan: document.getElementById("plan"),
      editor: document.getElementById("planEditor"),
      preview: document.getElementById("planPreview"),
      saveBtn: document.getElementById("savePlanBtn"),
      toggleBtn: document.getElementById("planModeToggleBtn"),
      tocList: document.getElementById("planTocList"),
      label: document.querySelector("#plan .editor-label"),
      previewTitle: document.getElementById("planPreviewTitle")
    };
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").split("\n");
    const used = new Map();
    const headings = [];
    let html = "";
    let charIndex = 0;
    let inUl = false;
    let inOl = false;
    let inTable = false;

    function closeLists() {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
    }

    function closeTable() {
      if (inTable) { html += "</tbody></table>"; inTable = false; }
    }

    function uniqueSlug(base) {
      const count = used.get(base) || 0;
      used.set(base, count + 1);
      return count === 0 ? base : `${base}-${count + 1}`;
    }

    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);

      if (!trimmed) {
        closeLists();
        closeTable();
        charIndex += rawLine.length + 1;
        return;
      }

      if (headingMatch) {
        closeLists();
        closeTable();
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const cleanText = text.replace(/\*\*/g, "");
        const id = uniqueSlug(slugify(cleanText));
        headings.push({ id, text: cleanText, level, lineIndex, charIndex });
        html += `<h${level} id="${id}" data-line="${lineIndex}" data-char="${charIndex}"><a class="heading-anchor" href="#${id}" data-anchor="${id}">${inlineMarkdown(text)}</a></h${level}>`;
        charIndex += rawLine.length + 1;
        return;
      }

      if (trimmed === "---") {
        closeLists();
        closeTable();
        html += "<hr>";
        charIndex += rawLine.length + 1;
        return;
      }

      if (/^\|?\s*:?-{3,}/.test(trimmed)) {
        charIndex += rawLine.length + 1;
        return;
      }

      const looksLikeTable = trimmed.includes("|") && lines[lineIndex + 1]?.trim()?.match(/^\|?\s*:?-{3,}/);
      const inExistingTable = inTable && trimmed.includes("|");
      if (looksLikeTable || inExistingTable) {
        closeLists();
        const rawCells = trimmed.split("|");
        const cells = rawCells
          .map((cell) => cell.trim())
          .filter((cell, index) => !(index === 0 && cell === "") && !(index === rawCells.length - 1 && cell === ""));
        if (!inTable) { html += "<table><tbody>"; inTable = true; }
        html += `<tr>${cells.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`;
        charIndex += rawLine.length + 1;
        return;
      }

      closeTable();

      if (trimmed.startsWith("- ")) {
        if (!inUl) { closeLists(); html += "<ul>"; inUl = true; }
        html += `<li>${inlineMarkdown(trimmed.slice(2))}</li>`;
        charIndex += rawLine.length + 1;
        return;
      }

      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      if (ordered) {
        if (!inOl) { closeLists(); html += "<ol>"; inOl = true; }
        html += `<li>${inlineMarkdown(ordered[1])}</li>`;
        charIndex += rawLine.length + 1;
        return;
      }

      closeLists();
      html += `<p data-line="${lineIndex}" data-char="${charIndex}">${inlineMarkdown(trimmed)}</p>`;
      charIndex += rawLine.length + 1;
    });

    closeLists();
    closeTable();
    return { html: html || "<p>No plan content yet.</p>", headings };
  }

  function ensureStyles() {
    if (document.getElementById("planUiDynamicStyles")) return;
    const style = document.createElement("style");
    style.id = "planUiDynamicStyles";
    style.textContent = `
      #plan .editor-label, #plan .preview-title { margin-top: 0; }
      .plan-shell { display: grid; grid-template-columns: minmax(190px, 270px) minmax(0, 1fr); gap: 18px; align-items: start; }
      .plan-toc { position: sticky; top: 12px; max-height: calc(100vh - 24px); overflow: auto; border: 1px solid var(--line); background: #fbfcff; border-radius: 18px; padding: 14px; }
      .plan-toc-title { font-weight: 800; margin-bottom: 10px; }
      .plan-toc a { display: block; color: #1d4ed8; text-decoration: none; padding: 7px 0; border-bottom: 1px solid rgba(223,228,238,0.75); line-height: 1.25; }
      .plan-toc a:hover { text-decoration: underline; }
      .plan-toc .toc-level-1 { font-weight: 850; }
      .plan-toc .toc-level-2 { padding-left: 10px; font-size: 0.94rem; }
      .plan-toc .toc-level-3 { padding-left: 22px; font-size: 0.88rem; color: #475569; }
      .plan-view { min-width: 0; }
      .plan-editor.is-hidden, .markdown-preview.is-hidden, .editor-label.is-hidden, .preview-title.is-hidden { display: none; }
      .plan-editor.full-editor { min-height: 72vh; }
      .markdown-preview h1, .markdown-preview h2, .markdown-preview h3, .markdown-preview h4 { scroll-margin-top: 18px; }
      .heading-anchor { color: inherit; text-decoration: none; }
      .heading-anchor:hover::after { content: " #"; color: #2563eb; }
      .markdown-preview table { width: 100%; border-collapse: collapse; margin: 12px 0; display: block; overflow-x: auto; }
      .markdown-preview td, .markdown-preview th { border: 1px solid var(--line); padding: 8px; vertical-align: top; }
      .markdown-preview code { background: #eef2ff; padding: 2px 5px; border-radius: 6px; }
      @media (max-width: 780px) { .plan-shell { grid-template-columns: 1fr; } .plan-toc { position: relative; top: 0; max-height: 290px; } }
    `;
    document.head.appendChild(style);
  }

  function renderPlan() {
    const { editor, preview, tocList } = getElements();
    if (!editor || !preview) return;

    const result = markdownToHtml(editor.value || "");
    lastHeadings = result.headings;
    preview.innerHTML = result.html;

    if (tocList) {
      tocList.innerHTML = lastHeadings
        .filter((h) => h.level <= 3)
        .map((h) => `<a href="#${h.id}" class="toc-level-${h.level}" data-anchor="${h.id}">${esc(h.text)}</a>`)
        .join("") || `<span class="muted">No headings yet.</span>`;

      tocList.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          const anchor = link.dataset.anchor;
          if (currentMode === "markdown") scrollEditorToAnchor(anchor);
          else scrollPreviewToAnchor(anchor);
          history.replaceState(null, "", `#${anchor}`);
        });
      });
    }

    preview.querySelectorAll(".heading-anchor").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const anchor = link.dataset.anchor;
        history.replaceState(null, "", `#${anchor}`);
        scrollPreviewToAnchor(anchor);
      });
    });
  }

  function currentAnchor() {
    const { editor, preview, tocList } = getElements();
    renderPlan();

    if (currentMode === "preview" && preview) {
      const active = tocList?.querySelector("a.active")?.dataset?.anchor;
      if (active) return active;

      const headings = [...preview.querySelectorAll("h1,h2,h3,h4")];
      const targetY = Math.min(Math.max(window.innerHeight * 0.32, 130), 260);
      return headings.filter((heading) => heading.getBoundingClientRect().top <= targetY).pop()?.id
        || headings.map((heading) => ({ id: heading.id, d: Math.abs(heading.getBoundingClientRect().top - targetY) })).sort((a, b) => a.d - b.d)[0]?.id
        || lastHeadings[0]?.id
        || null;
    }

    if (editor) {
      const pos = editor.selectionStart || 0;
      return lastHeadings.filter((h) => h.charIndex <= pos).pop()?.id || lastHeadings[0]?.id || null;
    }
    return lastHeadings[0]?.id || null;
  }

  function caretTopInTextarea(textarea, position) {
    const computed = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const props = ["boxSizing", "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "textTransform", "wordSpacing", "textIndent", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"];

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";
    mirror.style.wordWrap = "break-word";
    mirror.style.width = `${textarea.clientWidth}px`;
    props.forEach((prop) => { mirror.style[prop] = computed[prop]; });

    const marker = document.createElement("span");
    mirror.textContent = textarea.value.slice(0, position);
    marker.textContent = textarea.value.slice(position, position + 1) || ".";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const top = marker.offsetTop;
    document.body.removeChild(mirror);
    return top;
  }

  function scrollEditorToAnchor(anchor) {
    const { editor } = getElements();
    if (!editor || !anchor) return;
    renderPlan();
    const heading = lastHeadings.find((h) => h.id === anchor) || lastHeadings[0];
    if (!heading) return;

    const apply = () => {
      const top = caretTopInTextarea(editor, heading.charIndex);
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(heading.charIndex, heading.charIndex + Math.min(120, Math.max(1, heading.text.length)));
      editor.scrollTop = Math.max(0, top - 105);
    };

    apply();
    requestAnimationFrame(() => {
      apply();
      const pageTop = Math.max(0, window.scrollY + editor.getBoundingClientRect().top - 132);
      window.scrollTo({ top: pageTop, behavior: "auto" });
      setTimeout(apply, 60);
      setTimeout(apply, 180);
    });
  }

  function scrollPreviewToAnchor(anchor) {
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function setMode(mode, anchor = null) {
    const { editor, preview, saveBtn, toggleBtn, label, previewTitle } = getElements();
    if (!editor || !preview) return;

    const targetAnchor = anchor || currentAnchor();
    currentMode = mode;
    renderPlan();

    if (mode === "markdown") {
      editor.classList.remove("is-hidden");
      editor.classList.add("full-editor");
      preview.classList.add("is-hidden");
      label?.classList.remove("is-hidden");
      previewTitle?.classList.add("is-hidden");
      if (saveBtn) saveBtn.style.display = "inline-flex";
      if (toggleBtn) toggleBtn.textContent = "Show preview";
      setTimeout(() => scrollEditorToAnchor(targetAnchor), 80);
    } else {
      editor.classList.add("is-hidden");
      preview.classList.remove("is-hidden");
      label?.classList.add("is-hidden");
      previewTitle?.classList.remove("is-hidden");
      if (saveBtn) saveBtn.style.display = "none";
      if (toggleBtn) toggleBtn.textContent = "Edit Markdown";
      setTimeout(() => scrollPreviewToAnchor(targetAnchor), 80);
    }
  }

  function enhancePlanTab() {
    const { plan, editor, preview, saveBtn } = getElements();
    if (!plan || !editor || !preview || document.getElementById("planModeToggleBtn")) return;

    ensureStyles();

    const actions = plan.querySelector(".section-head .inline-actions");
    const toggle = document.createElement("button");
    toggle.id = "planModeToggleBtn";
    toggle.type = "button";
    toggle.textContent = "Edit Markdown";
    actions?.prepend(toggle);

    const note = document.createElement("p");
    note.className = "plan-help plan-note";
    note.textContent = "Use the navigation links to jump through the plan. Switch to Markdown to edit the same section.";
    plan.querySelector(".section-head")?.insertAdjacentElement("afterend", note);

    const oldPreviewTitle = [...plan.querySelectorAll("h3")].find((h) => h.textContent.trim() === "Preview");
    const previewTitle = document.createElement("h3");
    previewTitle.id = "planPreviewTitle";
    previewTitle.className = "preview-title";
    previewTitle.textContent = "Preview";
    if (oldPreviewTitle) oldPreviewTitle.replaceWith(previewTitle);

    const toc = document.createElement("aside");
    toc.className = "plan-toc";
    toc.innerHTML = `<div class="plan-toc-title">Plan navigation</div><div id="planTocList"></div>`;

    const shell = document.createElement("div");
    shell.className = "plan-shell";
    const view = document.createElement("div");
    view.className = "plan-view";
    const label = plan.querySelector(".editor-label");

    shell.appendChild(toc);
    shell.appendChild(view);
    plan.appendChild(shell);
    if (label) view.appendChild(label);
    view.appendChild(editor);
    view.appendChild(previewTitle);
    view.appendChild(preview);

    toggle.addEventListener("click", () => setMode(currentMode === "preview" ? "markdown" : "preview", currentAnchor()));
    editor.addEventListener("input", () => renderPlan());
    saveBtn?.addEventListener("click", () => setMode("preview", currentAnchor()));

    window.renderMarkdownPreview = function overriddenMarkdownPreview(markdown) {
      if (editor.value !== markdown) editor.value = markdown || "";
      renderPlan();
    };

    setTimeout(() => {
      renderPlan();
      setMode("preview", location.hash ? decodeURIComponent(location.hash.slice(1)) : currentAnchor());
    }, 350);
  }

  window.enhancePlanTab = enhancePlanTab;
  window.enhancedPlanRender = renderPlan;

  document.addEventListener("DOMContentLoaded", () => setTimeout(enhancePlanTab, 500));
})();
