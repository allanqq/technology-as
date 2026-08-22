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
    inline: document.querySelector("#lens-inline"),
    status: document.querySelector("#field-status"),
    search: document.querySelector("#lens-search"),
    filters: [...document.querySelectorAll(".dimension-filter button")],
    error: document.querySelector("#load-error"),
    random: document.querySelector("#random-lens"),
    close: document.querySelector("#close-lens"),
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

  if (!elements.cloud || !elements.inline) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    lenses: [],
    activeFilter: "all",
    query: "",
    current: null,
    activeButton: null,
    lastFocus: null
  };

  function replaceHash(hash = "") {
    try {
      const url = new URL(window.location.href);
      url.hash = hash;
      window.history.replaceState(null, "", url.href);
    } catch {
      // Deep links are a convenience; the inline interaction still works without them.
    }
  }

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

  function visibleLenses() {
    return state.lenses.filter((lens) => {
      const dimensionMatch = state.activeFilter === "all" || lens.dimension.id === state.activeFilter;
      const queryMatch = !state.query || lens.searchText.includes(state.query);
      return dimensionMatch && queryMatch;
    });
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
    button.setAttribute("aria-controls", "lens-inline");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const isCurrent = state.current?.id === lens.id && !elements.inline.hidden;
      if (isCurrent) {
        closeLens();
      } else {
        openLens(lens, button);
      }
    });
    return button;
  }

  function parkInline() {
    if (elements.inline.parentElement !== elements.cloud.parentElement || elements.inline.previousElementSibling !== elements.cloud) {
      elements.cloud.after(elements.inline);
    }
    elements.inline.style.removeProperty("order");
  }

  function clearActiveButton() {
    if (!state.activeButton) return;
    state.activeButton.classList.remove("is-active");
    state.activeButton.setAttribute("aria-expanded", "false");
    state.activeButton = null;
  }

  function renderCloud() {
    if (!elements.inline.hidden) closeLens({ restoreHash: true, restoreFocus: false });

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

  function resetReflection({ focus = false } = {}) {
    elements.decision.value = "";
    elements.visible.value = "";
    elements.change.value = "";
    elements.reflectionStatus.textContent = "";
    elements.weeklyInvite.hidden = true;
    if (focus) elements.decision.focus();
  }

  function openLens(lens, trigger, { updateHash = true, scroll = true } = {}) {
    if (!lens || !trigger) return;

    const changedLens = state.current?.id !== lens.id;
    clearActiveButton();
    if (changedLens) resetReflection();
    state.current = lens;
    state.activeButton = trigger;
    state.lastFocus = trigger;

    trigger.classList.add("is-active");
    trigger.setAttribute("aria-expanded", "true");

    elements.lensDimension.textContent = lens.dimension.label;
    elements.lensCount.textContent = `Lens ${lens.number} of ${state.lenses.length}`;
    elements.lensTitle.textContent = lens.name;
    elements.lensInterpretation.textContent = lens.interpretation;
    elements.lensQuestion.textContent = lens.question;
    elements.reflection.hidden = true;
    elements.apply.textContent = "Reflect →";
    elements.apply.setAttribute("aria-expanded", "false");
    elements.reflectionStatus.textContent = "";
    elements.weeklyInvite.hidden = true;

    elements.inline.style.order = trigger.style.order || "0";
    trigger.after(elements.inline);
    elements.inline.hidden = false;

    if (updateHash) replaceHash(lens.id);

    if (scroll) {
      window.requestAnimationFrame(() => {
        elements.inline.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "nearest"
        });
      });
    }
  }

  function closeLens({ restoreHash = true, restoreFocus = true } = {}) {
    const focusTarget = state.lastFocus;
    clearActiveButton();
    elements.inline.hidden = true;
    elements.reflection.hidden = true;
    elements.apply.setAttribute("aria-expanded", "false");
    elements.apply.textContent = "Reflect →";
    parkInline();
    state.current = null;

    if (restoreHash && window.location.hash.startsWith("#lens-")) replaceHash();
    if (restoreFocus && focusTarget?.isConnected) focusTarget.focus();
  }

  function openFromHash() {
    if (!window.location.hash.startsWith("#lens-")) return;
    const id = window.location.hash.slice(1);
    const lens = state.lenses.find((item) => item.id === id);
    const button = elements.cloud.querySelector(`[data-lens-id="${CSS.escape(id)}"]`);
    if (lens && button) openLens(lens, button, { updateHash: false, scroll: false });
  }

  function setFilter(filter) {
    state.activeFilter = filter;
    elements.filters.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    });
    renderCloud();
  }

  function chooseAnother() {
    const candidates = visibleLenses();
    if (!candidates.length) return;

    let next = state.current;
    while (candidates.length > 1 && next?.id === state.current?.id) {
      next = candidates[Math.floor(Math.random() * candidates.length)];
    }

    const button = next && elements.cloud.querySelector(`[data-lens-id="${CSS.escape(next.id)}"]`);
    if (next && button) openLens(next, button);
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
    const candidates = visibleLenses().length ? visibleLenses() : state.lenses;
    const lens = candidates[Math.floor(Math.random() * candidates.length)];
    const button = lens && elements.cloud.querySelector(`[data-lens-id="${CSS.escape(lens.id)}"]`);
    if (lens && button) openLens(lens, button);
  });

  elements.close.addEventListener("click", () => closeLens());
  elements.next.addEventListener("click", chooseAnother);

  elements.apply.addEventListener("click", () => {
    elements.reflection.hidden = !elements.reflection.hidden;
    const expanded = !elements.reflection.hidden;
    elements.apply.textContent = expanded ? "Close reflection ↑" : "Reflect →";
    elements.apply.setAttribute("aria-expanded", String(expanded));
    if (expanded) {
      window.requestAnimationFrame(() => {
        elements.reflection.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "nearest"
        });
        elements.decision.focus({ preventScroll: true });
      });
    }
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

  elements.clearReflection.addEventListener("click", () => resetReflection({ focus: true }));

  elements.weeklyInvite.addEventListener("click", () => closeLens({ restoreHash: false, restoreFocus: false }));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.inline.hidden) closeLens();
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash.startsWith("#lens-") && state.lenses.length) {
      openFromHash();
    } else if (!elements.inline.hidden) {
      closeLens({ restoreHash: false, restoreFocus: false });
    }
  });

  loadLenses().catch((error) => {
    console.error(error);
    elements.cloud.setAttribute("aria-busy", "false");
    elements.cloud.hidden = true;
    elements.error.hidden = false;
    elements.status.textContent = "Lens field unavailable";
  });
})();
