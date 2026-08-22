(() => {
  "use strict";

  const DIMENSIONS = [
    {
      id: "power",
      label: "Power",
      keywords: ["power", "authority", "control", "govern", "institution", "surveillance", "consent", "politic", "inequal", "exclude", "legitim", "enforce", "contest", "permission", "proclamation", "rule", "ownership", "sovereign"]
    },
    {
      id: "knowledge",
      label: "Knowledge",
      keywords: ["knowledge", "truth", "data", "model", "classif", "predict", "approx", "simulat", "measure", "score", "uncertain", "represent", "proxy", "rank", "language", "legib", "epistem", "interpret"]
    },
    {
      id: "agency",
      label: "Agency",
      keywords: ["agency", "autonom", "behavior", "attention", "identity", "relation", "care", "dignity", "body", "emotion", "habit", "depend", "labor", "deskilling", "meaning", "choice", "friction", "access", "introspection", "desire"]
    },
    {
      id: "material",
      label: "Material",
      keywords: ["material", "energy", "water", "mineral", "waste", "environment", "climate", "extract", "supply", "infrastructure", "land", "emission", "heat", "resource", "transpiration", "physical", "metabolism", "maintenance"]
    },
    {
      id: "time",
      label: "Time",
      keywords: ["future", "history", "memory", "speed", "acceler", "transform", "alter", "irrevers", "maintain", "legacy", "lock", "path", "normal", "scale", "tempor", "obsolete", "evolution", "transition", "anticip"]
    },
    {
      id: "responsibility",
      label: "Responsibility",
      keywords: ["risk", "harm", "safety", "failure", "responsib", "account", "resilien", "precaution", "security", "vulnerab", "tribulation", "consternation", "abuse", "incident", "cost", "consequence", "repair", "liability"]
    }
  ];

  const elements = {
    cloud: document.querySelector("#lens-cloud"),
    status: document.querySelector("#field-status"),
    search: document.querySelector("#lens-search"),
    filters: [...document.querySelectorAll(".dimension-filter button")],
    error: document.querySelector("#load-error"),
    random: document.querySelector("#random-lens"),
    dialog: document.querySelector("#lens-dialog"),
    close: document.querySelector("#close-lens"),
    closeIcon: document.querySelector("#dialog-close-icon"),
    copyLink: document.querySelector("#copy-link"),
    linkStatus: document.querySelector("#link-status"),
    lensDimension: document.querySelector("#lens-dimension"),
    lensCount: document.querySelector("#lens-count"),
    lensTitle: document.querySelector("#lens-title"),
    lensInterpretation: document.querySelector("#lens-interpretation"),
    lensQuestion: document.querySelector("#lens-question"),
    apply: document.querySelector("#apply-lens"),
    next: document.querySelector("#next-lens"),
    reflection: document.querySelector("#reflection"),
    decision: document.querySelector("#decision-input"),
    visible: document.querySelector("#visible-input"),
    change: document.querySelector("#change-input"),
    copyReflection: document.querySelector("#copy-reflection"),
    clearReflection: document.querySelector("#clear-reflection"),
    reflectionStatus: document.querySelector("#reflection-status"),
    weeklyInvite: document.querySelector("#weekly-invite")
  };

  if (!elements.cloud || !elements.dialog) return;

  const state = {
    lenses: [],
    activeFilter: "all",
    query: "",
    current: null,
    lastFocus: null
  };

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
      const score = dimension.keywords.reduce((total, keyword) => {
        const matches = normalized.match(new RegExp(`\\b${keyword}`, "g"));
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
    const shortWordBoost = Math.max(0, 12 - name.length) / 18;
    const rhythm = ((index * 7) % 5) / 8;
    return (0.2 + shortWordBoost + rhythm).toFixed(2);
  }

  function deterministicOrder(index) {
    return (index * 37) % 101;
  }

  async function loadLenses() {
    const response = await fetch("../index.html", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);

    const source = await response.text();
    const doc = new DOMParser().parseFromString(source, "text/html");
    const records = [...doc.querySelectorAll(".lens-index > li[data-lens-record]")];

    if (!records.length) throw new Error("No lenses found in source library");

    state.lenses = records.map((record, index) => {
      const number = record.querySelector(".record-number")?.textContent?.trim() || String(index + 1).padStart(2, "0");
      const name = record.querySelector(".record-title")?.textContent?.replace(/^Technology as\s*/i, "").trim() || `lens ${index + 1}`;
      const interpretation = record.querySelector(".record-interpretation > p:last-child")?.textContent?.trim() || "";
      const question = record.querySelector(".record-catalyst > p:last-child")?.textContent?.trim() || "What becomes visible through this lens?";
      const dimension = classify(`${name} ${interpretation} ${question}`, index);

      return {
        id: record.id || `lens-${index + 1}`,
        index,
        number,
        name,
        interpretation,
        question,
        dimension,
        searchText: normalize(`${name} ${interpretation} ${question} ${dimension.label}`),
        scale: visualScale(name, index),
        order: deterministicOrder(index)
      };
    });

    renderCloud();
    openFromHash();
  }

  function createLensButton(lens) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lens-word";
    button.textContent = lens.name;
    button.dataset.lensId = lens.id;
    button.dataset.dimension = lens.dimension.id;
    button.dataset.dimensionLabel = lens.dimension.label;
    button.style.setProperty("--scale", lens.scale);
    button.style.order = lens.order;
    button.setAttribute("aria-label", `${lens.name}, ${lens.dimension.label} lens`);
    button.addEventListener("click", () => openLens(lens, button));
    return button;
  }

  function visibleLenses() {
    return state.lenses.filter((lens) => {
      const dimensionMatch = state.activeFilter === "all" || lens.dimension.id === state.activeFilter;
      const queryMatch = !state.query || lens.searchText.includes(state.query);
      return dimensionMatch && queryMatch;
    });
  }

  function renderCloud() {
    const visible = visibleLenses();
    const fragment = document.createDocumentFragment();
    visible.forEach((lens) => fragment.append(createLensButton(lens)));
    elements.cloud.replaceChildren(fragment);
    elements.cloud.setAttribute("aria-busy", "false");
    elements.status.textContent = `${visible.length} ${visible.length === 1 ? "lens" : "lenses"}`;

    if (!visible.length) {
      const note = document.createElement("p");
      note.className = "cloud-empty";
      note.textContent = "No lens matches. Try another word or return to all.";
      elements.cloud.append(note);
    }
  }

  function setFilter(filter) {
    state.activeFilter = filter;
    elements.filters.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    });
    renderCloud();
  }

  function openLens(lens, trigger) {
    state.current = lens;
    state.lastFocus = trigger || document.activeElement;
    elements.lensDimension.textContent = lens.dimension.label;
    elements.lensCount.textContent = `Lens ${lens.number} of ${state.lenses.length}`;
    elements.lensTitle.textContent = lens.name;
    elements.lensInterpretation.textContent = lens.interpretation;
    elements.lensQuestion.textContent = lens.question;
    elements.reflection.hidden = true;
    elements.apply.textContent = "Apply this lens →";
    elements.linkStatus.textContent = "";
    elements.reflectionStatus.textContent = "";
    elements.weeklyInvite.hidden = true;
    window.history.replaceState(null, "", `#${lens.id}`);

    if (!elements.dialog.open) elements.dialog.showModal();
    elements.close.focus();
  }

  function closeLens({ restoreHash = true } = {}) {
    if (elements.dialog.open) elements.dialog.close();
    if (restoreHash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    state.lastFocus?.focus?.();
  }

  function openFromHash() {
    if (!window.location.hash.startsWith("#lens-")) return;
    const id = window.location.hash.slice(1);
    const lens = state.lenses.find((item) => item.id === id);
    if (lens) openLens(lens, document.querySelector(`[data-lens-id="${CSS.escape(id)}"]`));
  }

  function chooseAnother() {
    if (!state.lenses.length) return;
    let next = state.current;
    while (state.lenses.length > 1 && next?.id === state.current?.id) {
      next = state.lenses[Math.floor(Math.random() * state.lenses.length)];
    }
    if (next) openLens(next, state.lastFocus);
  }

  async function copyText(text, statusElement, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      statusElement.textContent = successMessage;
      window.setTimeout(() => { statusElement.textContent = ""; }, 1800);
      return true;
    } catch {
      statusElement.textContent = "Copy unavailable in this browser.";
      return false;
    }
  }

  function reflectionText() {
    const lens = state.current;
    return [
      `CRITICAL TECHNOLOGY — ${lens.name.toUpperCase()}`,
      "",
      `Decision\n${elements.decision.value.trim()}`,
      "",
      `Question\n${lens.question}`,
      "",
      `What became visible\n${elements.visible.value.trim()}`,
      "",
      `What changes\n${elements.change.value.trim()}`
    ].join("\n");
  }

  elements.search.addEventListener("input", () => {
    state.query = normalize(elements.search.value);
    renderCloud();
  });

  elements.filters.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  elements.random.addEventListener("click", () => {
    const visible = visibleLenses();
    const candidates = visible.length ? visible : state.lenses;
    const lens = candidates[Math.floor(Math.random() * candidates.length)];
    if (lens) openLens(lens, elements.random);
  });

  elements.close.addEventListener("click", () => closeLens());
  elements.closeIcon.addEventListener("click", () => closeLens());
  elements.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLens();
  });

  elements.next.addEventListener("click", chooseAnother);
  elements.apply.addEventListener("click", () => {
    elements.reflection.hidden = !elements.reflection.hidden;
    elements.apply.textContent = elements.reflection.hidden ? "Apply this lens →" : "Hide reflection ↑";
    if (!elements.reflection.hidden) {
      elements.reflection.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => elements.decision.focus(), 250);
    }
  });

  elements.copyLink.addEventListener("click", () => {
    copyText(window.location.href, elements.linkStatus, "Link copied.");
  });

  elements.copyReflection.addEventListener("click", async () => {
    const values = [elements.decision.value, elements.visible.value, elements.change.value].map((value) => value.trim());
    if (values.some((value) => !value)) {
      elements.reflectionStatus.textContent = "Complete all three lines first.";
      return;
    }
    const copied = await copyText(reflectionText(), elements.reflectionStatus, "Reflection copied.");
    if (copied) elements.weeklyInvite.hidden = false;
  });

  elements.clearReflection.addEventListener("click", () => {
    elements.decision.value = "";
    elements.visible.value = "";
    elements.change.value = "";
    elements.reflectionStatus.textContent = "";
    elements.weeklyInvite.hidden = true;
    elements.decision.focus();
  });

  elements.weeklyInvite.addEventListener("click", () => closeLens());

  window.addEventListener("hashchange", () => {
    if (window.location.hash.startsWith("#lens-") && state.lenses.length) openFromHash();
  });

  loadLenses().catch((error) => {
    console.error(error);
    elements.cloud.setAttribute("aria-busy", "false");
    elements.cloud.hidden = true;
    elements.error.hidden = false;
    elements.status.textContent = "Lens field unavailable";
  });
})();
