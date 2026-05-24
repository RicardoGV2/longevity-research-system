(() => {
  const TAB_DEFS = [
    { key: "measures", label: "Measures", heading: "What it measures" },
    { key: "use", label: "How to use", heading: "How to use it" },
    { key: "comparison", label: "Compare", heading: "Comparison / limitations" },
    { key: "frequency", label: "Frequency", heading: "How often" },
    { key: "notes", label: "Notes", heading: "Notes" }
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fieldText(card, label) {
    const fields = [...card.querySelectorAll(".map-field")];
    const field = fields.find((node) => node.querySelector("span")?.textContent?.trim().toLowerCase() === label.toLowerCase());
    return field?.querySelector("p")?.textContent?.trim() || "";
  }

  function editValue(card, field) {
    const el = card.querySelector(`[data-field='${field}']`);
    return el?.value?.trim() || "";
  }

  function activeTabFor(card) {
    return card.dataset.activeMapInfoTab || "measures";
  }

  function setActiveTab(card, key) {
    card.dataset.activeMapInfoTab = key;
    card.querySelectorAll(".map-info-tab").forEach((button) => {
      const active = button.dataset.mapInfoTab === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    card.querySelectorAll(".map-info-panel").forEach((panel) => {
      panel.hidden = panel.dataset.mapInfoPanel !== key;
    });
  }

  function enhanceCard(card) {
    if (!card || card.dataset.cardUiEnhanced === "1") return;
    const body = card.querySelector(".map-body");
    const title = card.querySelector(".map-title");
    const edit = card.querySelector(".map-edit");
    if (!body || !title || !edit) return;

    card.dataset.cardUiEnhanced = "1";
    card.classList.add("map-card-ui-v2");

    const status = editValue(card, "status");
    if (status && !title.querySelector(".map-status-chip")) {
      const chip = document.createElement("span");
      chip.className = "map-chip map-status-chip";
      chip.textContent = status;
      title.appendChild(chip);
    }

    const values = {
      measures: fieldText(card, "Measures"),
      use: fieldText(card, "How to use"),
      comparison: fieldText(card, "Comparison / notes"),
      frequency: editValue(card, "frequency"),
      notes: editValue(card, "notes")
    };

    const tabs = document.createElement("div");
    tabs.className = "map-info-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = TAB_DEFS.map((tab) => `
      <button type="button" class="map-info-tab" role="tab" data-map-info-tab="${tab.key}">${escapeHtml(tab.label)}</button>
    `).join("");

    const panels = document.createElement("div");
    panels.className = "map-info-panels";
    panels.innerHTML = TAB_DEFS.map((tab) => `
      <section class="map-info-panel" data-map-info-panel="${tab.key}" hidden>
        <span>${escapeHtml(tab.heading)}</span>
        <p>${escapeHtml(values[tab.key] || "Pending / not defined yet.")}</p>
      </section>
    `).join("");

    body.querySelectorAll(".map-field").forEach((node) => node.remove());
    title.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", panels);

    const summary = edit.querySelector("summary");
    if (summary) summary.textContent = "Edit details / photo";

    setActiveTab(card, activeTabFor(card));
  }

  function enhanceAllCards() {
    document.querySelectorAll("#measurementMap .map-card").forEach(enhanceCard);
  }

  function installStyles() {
    if (document.getElementById("measurementMapCardUiStyles")) return;
    const style = document.createElement("style");
    style.id = "measurementMapCardUiStyles";
    style.textContent = `
      #measurementMap .measurement-map-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      #measurementMap .map-card.map-card-ui-v2 {
        grid-template-columns: minmax(150px, 210px) minmax(0, 1fr);
        border-radius: 22px;
        background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
        box-shadow: 0 14px 38px rgba(15, 23, 42, 0.07);
      }

      #measurementMap .map-card-ui-v2 .map-photo {
        min-height: 230px;
        padding: 0;
        border-right: 1px solid var(--line);
        background: #f1f5f9;
      }

      #measurementMap .map-card-ui-v2 .map-photo img {
        min-height: 230px;
        height: 100%;
      }

      #measurementMap .map-card-ui-v2 .map-body {
        padding: 18px 20px;
        gap: 12px;
      }

      #measurementMap .map-card-ui-v2 .map-title {
        gap: 8px;
      }

      #measurementMap .map-card-ui-v2 .map-title h3 {
        font-size: clamp(1.1rem, 2.1vw, 1.35rem);
        line-height: 1.15;
        margin-right: 4px;
      }

      #measurementMap .map-card-ui-v2 .map-chip {
        padding: 4px 9px;
        font-size: 0.72rem;
        font-weight: 850;
      }

      #measurementMap .map-card-ui-v2 .map-status-chip {
        background: #ecfeff;
        color: #0e7490;
      }

      #measurementMap .map-info-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding: 2px 0 4px;
        scrollbar-width: none;
      }

      #measurementMap .map-info-tabs::-webkit-scrollbar {
        display: none;
      }

      #measurementMap .map-info-tab {
        border: 1px solid var(--line);
        background: #ffffff;
        color: #536078;
        border-radius: 999px;
        padding: 7px 11px;
        font: inherit;
        font-size: 0.82rem;
        font-weight: 800;
        white-space: nowrap;
        min-height: 34px;
      }

      #measurementMap .map-info-tab.active {
        background: #2563eb;
        border-color: #2563eb;
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
      }

      #measurementMap .map-info-panels {
        min-width: 0;
      }

      #measurementMap .map-info-panel {
        border: 1px solid #dbe5f3;
        border-radius: 18px;
        background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
        padding: 14px 15px;
        min-height: 104px;
      }

      #measurementMap .map-info-panel span {
        display: block;
        color: #64748b;
        font-size: 0.76rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 7px;
      }

      #measurementMap .map-info-panel p {
        margin: 0;
        line-height: 1.35;
        font-size: clamp(0.94rem, 1.8vw, 1.04rem);
        color: #1f2937;
      }

      #measurementMap .map-card-ui-v2 .map-edit {
        margin-top: 2px;
        border-top: 1px solid var(--line);
        padding-top: 10px;
      }

      #measurementMap .map-card-ui-v2 .map-edit summary {
        width: fit-content;
        cursor: pointer;
        color: #2563eb;
        font-weight: 850;
        border-radius: 12px;
        padding: 6px 9px;
      }

      #measurementMap .map-card-ui-v2 .map-edit[open] summary {
        background: #eff6ff;
      }

      @media (max-width: 720px) {
        #measurementMap .map-card.map-card-ui-v2 {
          grid-template-columns: 132px minmax(0, 1fr);
        }

        #measurementMap .map-card-ui-v2 .map-photo,
        #measurementMap .map-card-ui-v2 .map-photo img {
          min-height: 220px;
        }

        #measurementMap .map-card-ui-v2 .map-body {
          padding: 15px;
        }
      }

      @media (max-width: 560px) {
        #measurementMap .map-card.map-card-ui-v2 {
          grid-template-columns: 1fr;
        }

        #measurementMap .map-card-ui-v2 .map-photo {
          border-right: none;
          border-bottom: 1px solid var(--line);
        }

        #measurementMap .map-card-ui-v2 .map-photo,
        #measurementMap .map-card-ui-v2 .map-photo img {
          min-height: 185px;
          max-height: 220px;
        }

        #measurementMap .map-info-panel {
          min-height: 94px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installHooks() {
    if (window.__measurementMapCardUiHooksInstalled) return;
    window.__measurementMapCardUiHooksInstalled = true;

    document.addEventListener("click", (event) => {
      const button = event.target.closest?.(".map-info-tab");
      if (!button) return;
      const card = button.closest(".map-card");
      if (!card) return;
      setActiveTab(card, button.dataset.mapInfoTab || "measures");
    }, true);

    const observer = new MutationObserver(() => {
      clearTimeout(window.__measurementMapCardUiTimer);
      window.__measurementMapCardUiTimer = setTimeout(enhanceAllCards, 30);
    });

    const target = document.body || document.documentElement;
    if (target) observer.observe(target, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    installHooks();
    [0, 120, 500, 1200].forEach((delay) => setTimeout(enhanceAllCards, delay));
  }

  document.addEventListener("DOMContentLoaded", init);
  init();
})();
