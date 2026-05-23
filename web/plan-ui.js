(() => {
  let currentMode = "preview";
  let lastHeadings = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function inlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function closeLists(state) {
    if (state.inUl) {
      state.html += "</ul>";
      state.inUl = false;
    }
    if (state.inOl) {
      state.html += "</ol>";
      state.inOl = false;
    }
  }

  function closeTable(state) {
    if (state.inTable) {
      state.html += "</tbody></table>";
      state.inTable = false;
    }
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").split("\n");
    const used = new Map();
    const headings = [];
    const state = { html: "", inUl: false, inOl: false, inTable: false };

    function uniqueSlug(base) {
      const current = used.get(base) || 0;
      used.set(base, current + 1);
      return current === 0 ? base : `${base}-${current + 1}`;
    }

    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

      if (!trimmed) {
        closeLists(state);
        closeTable(state);
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        closeLists(state);
        closeTable(state);
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = uniqueSlug(slugify(text.replace(/\*\*/g, "")));
        headings.push({ id, text: text.replace(/\*\*/g, ""), level, lineIndex });
        state.html += `<h${level} id="${id}" data-line="${lineIndex}"><a class="heading-anchor" href="#${id}" data-anchor="${id}">${inlineMarkdown(text)}</a></h${level}>`;
        return;
      }

      if (trimmed === "---") {
        closeLists(state);
        closeTable(state);
        state.html += "<hr>";
        return;
      }

      const isDividerRow = /^\|?\s*:?-{3,}/.test(trimmed);
      if (isDividerRow) return;

      const looksLikeTable = trimmed.includes("|") && lines[lineIndex + 1]?.trim()?.match(/^\|?\s*:?-{3,}/);
      const inExistingTable = state.inTable && trimmed.includes("|");
      if (looksLikeTable || inExistingTable) {
        closeLists(state);
        const rawCells = trimmed.split("|");
        const cells = rawCells
          .map((cell) => cell.trim())
          .filter((cell, index) => !(index === 0 && cell === "") && !(index === rawCells.length - 1 && cell === ""));
        if (!state.inTable) {
          state.html += "<table><tbody>";
          state.inTable = true;
        }
        state.html += `<tr>${cells.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`;
        return;
      }

      closeTable(state);

      if (trimmed.startsWith("- ")) {
        if (!state.inUl) {
          closeLists(state);
          state.html += "<ul>";
          state.inUl = true;
        }
        state.html += `<li>${inlineMarkdown(trimmed.slice(2))}</li>`;
        return;
      }

      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      if (ordered) {
        if (!state.inOl) {
          closeLists(state);
          state.html += "<ol>";
          state.inOl = true;
        }
        state.html += `<li>${inlineMarkdown(ordered[1])}</li>`;
        return;
      }

      closeLists(state);
      state.html += `<p data-line="${lineIndex}">${inlineMarkdown(trimmed)}</p>`;
    });

    closeLists(state);
    closeTable(state);
    return { html: state.html || "<p>No plan content yet.</p>", headings };
  }

  function ensureStyles() {
    if (document.getElementById("planUiDynamicStyles")) return;
    const style = document.createElement("style");
    style.id = "planUiDynamicStyles";
    style.textContent = `
      #plan .editor-label,
      #plan .preview-title { margin-top: 0; }
      .plan-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin: 14px 0 16px; }
      .plan-toolbar .plan-note { color: var(--muted); font-weight: 650; }
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
      @media (max-width: 780px) {
        .plan-shell { grid-template-columns: 1fr; }
        .plan-toc { position: relative; top: 0; max-height: 290px; }
      }
    `;
    document.head.appendChild(style);
  }

  function getElements() {
    return {
      plan: document.getElementById("plan"),
      editor: document.getElementById("planEditor"),
      preview: document.getElementById("planPreview"),
      saveBtn: document.getElementById("savePlanBtn"),
      loadSeedBtn: document.getElementById("loadSeedPlanBtn"),
      toggleBtn: document.getElementById("planModeToggleBtn"),
      tocList: document.getElementById("planTocList")
    };
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
        .map((h) => `<a href="#${h.id}" class="toc-level-${h.level}" data-anchor="${h.id}">${escapeHtml(h.text)}</a>`)
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
    const { editor, preview } = getElements();
    if (currentMode === "preview" && preview) {
      const visible = [...preview.querySelectorAll("h1,h2,h3,h4")]
        .filter((heading) => heading.getBoundingClientRect().top <= 160)
        .pop();
      return visible?.id || lastHeadings[0]?.id || null;
    }

    if (editor) {
      const before = editor.value.slice(0, editor.selectionStart || 0);
      const line = before.split("\n").length - 1;
      return lastHeadings.filter((h) => h.lineIndex <= line).pop()?.id || lastHeadings[0]?.id || null;
    }
    return null;
  }

  function scrollPreviewToAnchor(anchor) {
    if (!anchor) return;
    const element = document.getElementById(anchor);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollEditorToAnchor(anchor) {
    const { editor } = getElements();
    if (!editor || !anchor) return;
    const heading = lastHeadings.find((h) => h.id === anchor);
    if (!heading) return;
    const lines = editor.value.split("\n");
    const start = lines.slice(0, heading.lineIndex).join("\n").length + (heading.lineIndex > 0 ? 1 : 0);
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(start, start);
    editor.scrollTop = Math.max(0, heading.lineIndex * 21 - 80);
  }

  function setMode(mode, anchor = null) {
    const { editor, preview, saveBtn, toggleBtn, plan } = getElements();
    const label = plan?.querySelector(".editor-label");
    const previewTitle = document.getElementById("planPreviewTitle");
    if (!editor || !preview) return;

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
      setTimeout(() => scrollEditorToAnchor(anchor), 60);
    } else {
      editor.classList.add("is-hidden");
      preview.classList.remove("is-hidden");
      label?.classList.add("is-hidden");
      previewTitle?.classList.remove("is-hidden");
      if (saveBtn) saveBtn.style.display = "none";
      if (toggleBtn) toggleBtn.textContent = "Edit Markdown";
      setTimeout(() => scrollPreviewToAnchor(anchor), 60);
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
      const initialAnchor = location.hash ? decodeURIComponent(location.hash.slice(1)) : currentAnchor();
      setMode("preview", initialAnchor);
    }, 350);
  }

  window.enhancePlanTab = enhancePlanTab;
  window.enhancedPlanRender = renderPlan;

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(enhancePlanTab, 500);
  });
})();
