(() => {
  const MIN_QUERY = 2;
  let query = "";
  let marks = [];
  let editorMatches = [];
  let currentIndex = -1;
  let applying = false;

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getEls() {
    return {
      plan: document.getElementById("plan"),
      editor: document.getElementById("planEditor"),
      preview: document.getElementById("planPreview"),
      input: document.getElementById("planSearchInput"),
      status: document.getElementById("planSearchStatus"),
      prev: document.getElementById("planSearchPrev"),
      next: document.getElementById("planSearchNext"),
      clear: document.getElementById("planSearchClear")
    };
  }

  function removeMarks(root) {
    if (!root) return;
    root.querySelectorAll("mark.plan-search-mark").forEach((mark) => {
      const text = document.createTextNode(mark.textContent || "");
      mark.replaceWith(text);
      text.parentElement?.normalize?.();
    });
  }

  function isIgnoredTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest("mark, script, style, textarea, input, button, select"));
  }

  function highlightPreview() {
    const { preview } = getEls();
    if (!preview) return [];
    applying = true;
    removeMarks(preview);
    applying = false;

    if (!query || query.length < MIN_QUERY) return [];

    const regex = new RegExp(escapeRegExp(query), "gi");
    const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isIgnoredTextNode(node)) return NodeFilter.FILTER_REJECT;
        return regex.test(node.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    const found = [];
    applying = true;
    textNodes.forEach((node) => {
      const text = node.nodeValue || "";
      const fragment = document.createDocumentFragment();
      regex.lastIndex = 0;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        const mark = document.createElement("mark");
        mark.className = "plan-search-mark";
        mark.textContent = match[0];
        fragment.appendChild(mark);
        found.push(mark);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.replaceWith(fragment);
    });
    applying = false;
    return found;
  }

  function collectEditorMatches() {
    const { editor } = getEls();
    if (!editor || !query || query.length < MIN_QUERY) return [];
    const value = editor.value || "";
    const regex = new RegExp(escapeRegExp(query), "gi");
    const matches = [];
    let match;
    while ((match = regex.exec(value)) !== null) {
      const line = value.slice(0, match.index).split("\n").length;
      const lineStart = value.lastIndexOf("\n", match.index - 1) + 1;
      const lineEnd = value.indexOf("\n", match.index);
      const snippet = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd).trim();
      matches.push({ index: match.index, length: match[0].length, line, snippet });
    }
    return matches;
  }

  function updateStatus() {
    const { status } = getEls();
    if (!status) return;
    if (!query) {
      status.textContent = "Search inside the plan.";
      return;
    }
    if (query.length < MIN_QUERY) {
      status.textContent = `Type at least ${MIN_QUERY} characters.`;
      return;
    }
    const total = editorMatches.length;
    status.textContent = total ? `${currentIndex + 1} / ${total} matches` : "No matches found.";
  }

  function isMarkdownMode() {
    const { editor, preview } = getEls();
    return Boolean(editor && preview && !editor.classList.contains("is-hidden") && preview.classList.contains("is-hidden"));
  }

  function selectEditorMatch(match) {
    const { editor } = getEls();
    if (!editor || !match) return;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(match.index, match.index + match.length);
    const approxLineHeight = 22;
    editor.scrollTop = Math.max(0, (match.line - 1) * approxLineHeight - 90);
    window.scrollTo({ top: Math.max(0, window.scrollY + editor.getBoundingClientRect().top - 135), behavior: "auto" });
  }

  function scrollToCurrent() {
    if (!editorMatches.length || currentIndex < 0) return;
    if (isMarkdownMode()) {
      selectEditorMatch(editorMatches[currentIndex]);
      return;
    }
    const mark = marks[currentIndex];
    if (!mark) return;
    marks.forEach((m) => m.classList.remove("active"));
    mark.classList.add("active");
    mark.scrollIntoView({ behavior: "auto", block: "center" });
  }

  function runSearch({ keepIndex = false } = {}) {
    const { input } = getEls();
    query = (input?.value || "").trim();
    editorMatches = collectEditorMatches();
    marks = highlightPreview();
    if (!keepIndex || currentIndex >= editorMatches.length) currentIndex = editorMatches.length ? 0 : -1;
    updateStatus();
    if (currentIndex >= 0) scrollToCurrent();
  }

  function move(delta) {
    if (!editorMatches.length) return;
    currentIndex = (currentIndex + delta + editorMatches.length) % editorMatches.length;
    updateStatus();
    scrollToCurrent();
  }

  function clearSearch() {
    const { input, preview } = getEls();
    if (input) input.value = "";
    query = "";
    currentIndex = -1;
    editorMatches = [];
    marks = [];
    removeMarks(preview);
    updateStatus();
  }

  function install() {
    const { input, prev, next, clear, preview, editor } = getEls();
    if (!input || input.dataset.planSearchInstalled) return;
    input.dataset.planSearchInstalled = "1";

    input.addEventListener("input", () => runSearch());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        move(event.shiftKey ? -1 : 1);
      }
    });
    prev?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));
    clear?.addEventListener("click", clearSearch);
    editor?.addEventListener("input", () => {
      if (query) setTimeout(() => runSearch({ keepIndex: true }), 80);
    });

    if (preview) {
      const observer = new MutationObserver(() => {
        if (applying || !query) return;
        setTimeout(() => runSearch({ keepIndex: true }), 80);
      });
      observer.observe(preview, { childList: true, subtree: true, characterData: true });
    }

    updateStatus();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(install, 900));
})();
