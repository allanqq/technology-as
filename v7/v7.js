(() => {
  "use strict";

  const DIMENSIONS = [
    {
      id: "power",
      label: "Power",
      words: ["power", "authority", "control", "govern", "institution", "surveillance", "consent", "politic", "inequal", "exclude", "legitim", "enforce", "contest", "permission", "rule", "ownership", "sovereign"]
    },
    {
      id: "knowledge",
      label: "Knowledge",
      words: ["knowledge", "truth", "data", "model", "classif", "predict", "approx", "simulat", "measure", "score", "uncertain", "represent", "proxy", "rank", "language", "interpret"]
    },
    {
      id: "agency",
      label: "Agency",
      words: ["agency", "autonom", "behavior", "attention", "identity", "relation", "care", "dignity", "body", "emotion", "habit", "depend", "labor", "meaning", "choice", "friction", "access", "desire"]
    },
    {
      id: "material",
      label: "Material",
      words: ["material", "energy", "water", "mineral", "waste", "environment", "climate", "extract", "supply", "infrastructure", "land", "emission", "heat", "resource", "physical", "metabolism", "maintenance"]
    },
    {
      id: "time",
      label: "Time",
      words: ["future", "history", "memory", "speed", "acceler", "transform", "alter", "irrevers", "legacy", "lock", "path", "normal", "scale", "tempor", "obsolete", "evolution", "transition", "anticip"]
    },
    {
      id: "responsibility",
      label: "Responsibility",
      words: ["risk", "harm", "safety", "failure", "responsib", "account", "resilien", "precaution", "security", "vulnerab", "tribulation", "consternation", "abuse", "incident", "cost", "consequence", "repair", "liability"]
    }
  ];

  const elements = {
    cloud: document.querySelector("#lens-cloud"),
    status: document.querySelector("#field-status"),
    error: document.querySelector("#load-error"),
    template: document.querySelector("#lens-panel-template")
  };

  if (!elements.cloud || !elements.template) return;

  const state = {
    lenses: [],
    buttons: new Map(),
    currentLens: null,
    currentButton: null,
    panel: null
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function classify(text, index) {
    const normalized = normalize(text);
    let best = DIMENSIONS[index % DIMENSIONS.length];
    let bestScore = 0;

    for (const dimension of DIMENSIONS) {
      const score = dimension.words.reduce((total, word) => {
        const matches = normalized.match(new RegExp(`\\b${word}`, "g"));
        return total + (matches?.length || 0);
      }, 0);

      if (score > bestScore) {
        best = dimension;
        bestScore = score;
      }
    }

    return best;
  }

  function visualScale(name, index) {
    const shortWordBoost = Math.max(0, 14 - name.length) / 20;
    const rhythm = ((index * 17) % 7) / 10;
    return (0.32 + shortWordBoost + rhythm).toFixed(2);
  }

  function visualOrder(index) {
    return (index * 37) % 101;
  }

  async function loadLenses() {
    const response = await fetch("../index.html", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);

    const source = await response.text();
    const documentSource = new DOMParser().parseFromString(source, "text/html");
    const records = [...documentSource.querySelectorAll(".lens-index > li[data-lens-record]")];

    if (!records.length) throw new Error("No lenses found in source library");

    state.lenses = records
      .map((record, index) => {
        const number = record.querySelector(".record-number")?.textContent?.trim() || String(index + 1).padStart(2, "0");
        const name = record.querySelector(".record-title")?.textContent?.replace(/^Technology as\s*/i, "").trim() || `lens ${index + 1}`;
        const interpretation = record.querySelector(".record-interpretation > p:last-child")?.textContent?.trim() || "";
        const question = record.querySelector(".record-catalyst > p:last-child")?.textContent?.trim() || "What becomes visible through this lens?";
        const dimension = classify(`${name} ${interpretation} ${question}`, index);

        return {
          id: record.id || `lens-${index + 1}`,
          number,
          name,
          interpretation,
          question,
          dimension,
          scale: visualScale(name, index),
          order: visualOrder(index)
        };
      })
      .sort((a, b) => a.order - b.order);

    renderCloud();
    openFromHash();
  }

  function renderCloud() {
    const fragment = document.createDocumentFragment();

    for (const lens of state.lenses) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lens-word";
      button.textContent = lens.name;
      button.style.setProperty("--scale", lens.scale);
      button.dataset.lensId = lens.id;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", `${lens.name}. Open lens.`);
      button.addEventListener("click", () => toggleLens(lens, button));
      state.buttons.set(lens.id, button);
      fragment.append(button);
    }

    elements.cloud.replaceChildren(fragment);
    elements.cloud.setAttribute("aria-busy", "false");
    elements.status.textContent = `${state.lenses.length} lenses`;
  }

  function createPanel(lens) {
    const panel = elements.template.content.firstElementChild.cloneNode(true);
    panel.id = `${lens.id}-panel`;
    panel.querySelector(".panel-dimension").textContent = lens.dimension.label;
    panel.querySelector(".panel-count").textContent = `${lens.number} / ${String(state.lenses.length).padStart(3, "0")}`;
    panel.querySelector(".panel-interpretation").textContent = lens.interpretation;
    panel.querySelector(".panel-question").textContent = lens.question;
    panel.querySelector(".panel-close").addEventListener("click", () => closeLens({ restoreFocus: true }));
    return panel;
  }

  function toggleLens(lens, button) {
    if (state.currentLens?.id === lens.id) {
      closeLens({ restoreFocus: false });
      return;
    }

    openLens(lens, button);
  }

  function openLens(lens, button, { updateHash = true } = {}) {
    if (state.currentButton) {
      state.currentButton.setAttribute("aria-expanded", "false");
      state.currentButton.removeAttribute("aria-controls");
    }

    state.panel?.remove();

    const panel = createPanel(lens);
    button.after(panel);
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-controls", panel.id);

    state.currentLens = lens;
    state.currentButton = button;
    state.panel = panel;

    if (updateHash) window.history.replaceState(null, "", `#${lens.id}`);

    requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
      panel.focus({ preventScroll: true });
    });
  }

  function closeLens({ restoreFocus = false, clearHash = true } = {}) {
    const previousButton = state.currentButton;

    state.panel?.remove();
    previousButton?.setAttribute("aria-expanded", "false");
    previousButton?.removeAttribute("aria-controls");

    state.currentLens = null;
    state.currentButton = null;
    state.panel = null;

    if (clearHash) {
      window.history.replaceState(null, "", window.location.href.split("#")[0]);
    }

    if (restoreFocus) previousButton?.focus();
  }

  function openFromHash() {
    if (!window.location.hash.startsWith("#lens-")) return;
    const id = window.location.hash.slice(1);
    const lens = state.lenses.find((item) => item.id === id);
    const button = state.buttons.get(id);
    if (lens && button) openLens(lens, button, { updateHash: false });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.currentLens) {
      event.preventDefault();
      closeLens({ restoreFocus: true });
    }
  });

  window.addEventListener("hashchange", () => {
    if (!state.lenses.length) return;
    if (window.location.hash.startsWith("#lens-")) openFromHash();
    else if (state.currentLens) closeLens({ clearHash: false });
  });

  loadLenses().catch((error) => {
    console.error(error);
    elements.cloud.setAttribute("aria-busy", "false");
    elements.cloud.hidden = true;
    elements.error.hidden = false;
    elements.status.textContent = "Unavailable";
  });
})();
