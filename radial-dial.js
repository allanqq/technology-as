(() => {
  "use strict";

  const ITEM_ANGLE_DEGREES = 13.5;
  const ITEM_ANGLE_RADIANS = ITEM_ANGLE_DEGREES * Math.PI / 180;
  const VISIBLE_NEIGHBORS = 13.35;
  const TICK_COUNT = 72;
  const WHEEL_SENSITIVITY = 0.0065;

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
    instrument: document.querySelector("#dial-instrument"),
    words: document.querySelector("#dial-words"),
    ticks: document.querySelector("#dial-ticks"),
    currentWord: document.querySelector("#current-word"),
    count: document.querySelector("#lens-count"),
    dimension: document.querySelector("#lens-dimension"),
    interpretation: document.querySelector("#lens-interpretation"),
    question: document.querySelector("#lens-question"),
    loading: document.querySelector("#loading-note"),
    error: document.querySelector("#load-error"),
    retry: document.querySelector("#retry-button"),
    random: document.querySelector("#random-button"),
    readout: document.querySelector("#position-readout")
  };

  if (!elements.instrument || !elements.words) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const snapshotMode = new URLSearchParams(window.location.search).has("snapshot");
  let renderedFrames = 0;

  const state = {
    lenses: [],
    wordElements: [],
    position: 0,
    targetPosition: 0,
    selectedIndex: -1,
    geometry: {
      centerX: 0,
      centerY: 0,
      radius: 0
    },
    pointer: null,
    wheelTimer: 0,
    hasMovedPointer: false,
    animationFrame: 0
  };

  function modulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function normalizeAngle(value) {
    let angle = value;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function shortestIndexDelta(from, to, count) {
    let delta = modulo(to - from, count);
    if (delta > count / 2) delta -= count;
    return delta;
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

  async function loadLenses() {
    elements.instrument.setAttribute("aria-busy", "true");
    elements.error.hidden = true;
    elements.loading.hidden = false;

    const response = await fetch("./source.html", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);

    const source = await response.text();
    const documentSource = new DOMParser().parseFromString(source, "text/html");
    const records = [...documentSource.querySelectorAll(".lens-index > li[data-lens-record]")];

    if (!records.length) throw new Error("No lenses found in source library");

    state.lenses = records.map((record, index) => {
      const number = record.querySelector(".record-number")?.textContent?.trim()
        || String(index + 1).padStart(2, "0");
      const title = record.querySelector(".record-title")?.textContent?.trim() || `Lens ${index + 1}`;
      const name = title.replace(/^Technology as\s*/i, "").replace(/[.…]+$/g, "").trim();
      const interpretation = record.querySelector(".record-interpretation > p:last-child")?.textContent?.trim() || "";
      const question = record.querySelector(".record-catalyst > p:last-child")?.textContent?.trim()
        || "What becomes visible through this lens?";
      const dimension = classify(`${name} ${interpretation} ${question}`, index);

      return {
        id: record.id || `lens-${index + 1}`,
        number,
        name,
        interpretation,
        question,
        dimension
      };
    });

    buildTicks();
    buildWords();
    updateGeometry();

    const hashIndex = indexFromHash();
    state.position = hashIndex >= 0 ? hashIndex : 0;
    state.targetPosition = state.position;
    syncSelection(true);
    render();

    elements.instrument.setAttribute("aria-busy", "false");
    elements.loading.hidden = true;
    elements.random.disabled = false;
  }

  function buildTicks() {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < TICK_COUNT; index += 1) {
      const tick = document.createElement("span");
      tick.className = "dial-tick";
      if (index % 6 === 0) tick.classList.add("is-major");
      const angle = index * (360 / TICK_COUNT);
      tick.style.transform = `rotate(${angle}deg) translateX(calc(var(--dial-radius) - .15rem))`;
      fragment.append(tick);
    }

    elements.ticks.replaceChildren(fragment);
  }

  function buildWords() {
    const fragment = document.createDocumentFragment();
    state.wordElements = state.lenses.map((lens, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "dial-word";
      option.id = `dial-option-${index}`;
      option.dataset.index = String(index);
      option.setAttribute("role", "option");
      option.setAttribute("aria-label", `Technology as ${lens.name}`);
      option.setAttribute("aria-selected", "false");
      option.tabIndex = -1;
      option.textContent = lens.name;
      option.addEventListener("click", () => {
        if (state.hasMovedPointer) return;
        navigateTo(index);
        snapTarget();
      });
      fragment.append(option);
      return option;
    });

    elements.words.replaceChildren(fragment);
  }

  function updateGeometry() {
    const rect = elements.instrument.getBoundingClientRect();
    const narrow = rect.width <= 760;
    const centerX = narrow ? rect.width * 0.085 : rect.width * 0.335;
    const centerY = rect.height * 0.5;
    const widthRadius = narrow ? rect.width * 0.42 : rect.width * 0.235;
    const heightRadius = rect.height * (narrow ? 0.38 : 0.41);
    const radius = Math.max(116, Math.min(widthRadius, heightRadius, 390));

    state.geometry = { centerX, centerY, radius };
    document.documentElement.style.setProperty("--center-x", `${centerX}px`);
    document.documentElement.style.setProperty("--center-y", `${centerY}px`);
    document.documentElement.style.setProperty("--dial-radius", `${radius}px`);
  }

  function render() {
    if (!state.lenses.length) return;

    const count = state.lenses.length;
    const { radius } = state.geometry;
    const currentModulo = modulo(state.position, count);

    state.wordElements.forEach((element, index) => {
      let delta = index - currentModulo;
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;

      const absoluteDelta = Math.abs(delta);
      if (absoluteDelta > VISIBLE_NEIGHBORS) {
        element.style.opacity = "0";
        element.style.pointerEvents = "none";
        element.style.visibility = "hidden";
        return;
      }

      const angle = delta * ITEM_ANGLE_RADIANS;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const frontness = (Math.cos(angle) + 1) / 2;
      const edgeFade = Math.max(0, 1 - absoluteDelta / VISIBLE_NEIGHBORS);
      const opacity = Math.max(0.055, Math.pow(frontness, 1.65) * Math.pow(edgeFade, .32));
      const scale = 0.56 + frontness * 0.42;
      const activeDistance = Math.abs(delta);
      const active = activeDistance < 0.48;

      element.style.visibility = "visible";
      element.style.pointerEvents = active ? "none" : "auto";
      element.style.opacity = active ? "0" : opacity.toFixed(3);
      element.style.zIndex = String(Math.round(frontness * 10));
      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    });

    elements.ticks.style.transform = `rotate(${-state.position * ITEM_ANGLE_DEGREES}deg)`;
    const degree = modulo(Math.round(state.position) * ITEM_ANGLE_DEGREES, 360);
    elements.readout.textContent = `${String(Math.round(degree)).padStart(3, "0")}°`;
  }

  function syncSelection(force = false) {
    if (!state.lenses.length) return;
    const nextIndex = modulo(Math.round(state.targetPosition), state.lenses.length);
    if (!force && nextIndex === state.selectedIndex) return;

    const previousElement = state.wordElements[state.selectedIndex];
    previousElement?.setAttribute("aria-selected", "false");

    state.selectedIndex = nextIndex;
    const lens = state.lenses[nextIndex];
    const currentElement = state.wordElements[nextIndex];
    currentElement?.setAttribute("aria-selected", "true");
    elements.instrument.setAttribute("aria-activedescendant", currentElement?.id || "");

    elements.currentWord.textContent = lens.name;
    elements.currentWord.style.setProperty("--word-scale", wordScale(lens.name));
    elements.count.textContent = `${lens.number} / ${String(state.lenses.length).padStart(3, "0")}`;
    elements.dimension.textContent = lens.dimension.label;
    elements.interpretation.textContent = lens.interpretation;
    elements.question.textContent = lens.question;

    const url = new URL(window.location.href);
    url.hash = lens.id;
    window.history.replaceState(null, "", url);
  }

  function wordScale(word) {
    const length = String(word).length;
    if (length <= 12) return "1";
    if (length <= 18) return ".84";
    if (length <= 25) return ".69";
    return ".56";
  }

  function indexFromHash() {
    const id = window.location.hash.slice(1);
    if (!id) return -1;
    return state.lenses.findIndex((lens) => lens.id === id);
  }

  function navigateBy(delta) {
    state.targetPosition += delta;
    syncSelection();
  }

  function navigateTo(index) {
    const current = modulo(state.targetPosition, state.lenses.length);
    const delta = shortestIndexDelta(current, index, state.lenses.length);
    state.targetPosition += delta;
    syncSelection();
  }

  function snapTarget() {
    state.targetPosition = Math.round(state.targetPosition);
    syncSelection();
  }

  function handleWheel(event) {
    if (!state.lenses.length) return;
    event.preventDefault();

    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    state.targetPosition += delta * WHEEL_SENSITIVITY;
    syncSelection();

    window.clearTimeout(state.wheelTimer);
    state.wheelTimer = window.setTimeout(snapTarget, 92);
  }

  function pointerAngle(event) {
    const rect = elements.instrument.getBoundingClientRect();
    return Math.atan2(
      event.clientY - rect.top - state.geometry.centerY,
      event.clientX - rect.left - state.geometry.centerX
    );
  }

  function handlePointerDown(event) {
    if (!state.lenses.length || event.button !== 0) return;

    const rect = elements.instrument.getBoundingClientRect();
    const dx = event.clientX - rect.left - state.geometry.centerX;
    const dy = event.clientY - rect.top - state.geometry.centerY;
    const distance = Math.hypot(dx, dy);

    if (distance < state.geometry.radius * 0.28 || distance > state.geometry.radius * 1.55) return;

    elements.instrument.focus({ preventScroll: true });
    state.pointer = {
      id: event.pointerId,
      lastAngle: pointerAngle(event),
      startX: event.clientX,
      startY: event.clientY
    };
    state.hasMovedPointer = false;
    elements.instrument.setPointerCapture(event.pointerId);
    elements.instrument.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    if (!state.pointer || event.pointerId !== state.pointer.id) return;

    const angle = pointerAngle(event);
    const deltaAngle = normalizeAngle(angle - state.pointer.lastAngle);
    state.pointer.lastAngle = angle;
    state.targetPosition -= deltaAngle / ITEM_ANGLE_RADIANS;

    const travel = Math.hypot(event.clientX - state.pointer.startX, event.clientY - state.pointer.startY);
    if (travel > 5) state.hasMovedPointer = true;

    syncSelection();
  }

  function handlePointerUp(event) {
    if (!state.pointer || event.pointerId !== state.pointer.id) return;

    if (elements.instrument.hasPointerCapture(event.pointerId)) {
      elements.instrument.releasePointerCapture(event.pointerId);
    }
    state.pointer = null;
    elements.instrument.classList.remove("is-dragging");
    snapTarget();
    window.setTimeout(() => { state.hasMovedPointer = false; }, 0);
  }

  function handleKeyDown(event) {
    if (!state.lenses.length) return;

    const commands = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
      PageDown: 5,
      PageUp: -5
    };

    if (event.key in commands) {
      event.preventDefault();
      navigateBy(commands[event.key]);
      snapTarget();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      navigateTo(0);
      snapTarget();
    }

    if (event.key === "End") {
      event.preventDefault();
      navigateTo(state.lenses.length - 1);
      snapTarget();
    }
  }

  function chooseRandomLens() {
    if (state.lenses.length < 2) return;
    let next = state.selectedIndex;
    while (Math.abs(shortestIndexDelta(state.selectedIndex, next, state.lenses.length)) < 4) {
      next = Math.floor(Math.random() * state.lenses.length);
    }
    navigateTo(next);
    snapTarget();
    elements.instrument.focus({ preventScroll: true });
  }

  function animate() {
    if (state.lenses.length) {
      const difference = state.targetPosition - state.position;
      if (reducedMotion || Math.abs(difference) < 0.0005) {
        state.position = state.targetPosition;
      } else {
        state.position += difference * 0.14;
      }
      render();
    }

    renderedFrames += 1;
    if (!snapshotMode || renderedFrames < 90) {
      state.animationFrame = window.requestAnimationFrame(animate);
    }
  }

  function showLoadError(error) {
    console.error(error);
    elements.instrument.setAttribute("aria-busy", "false");
    elements.loading.hidden = true;
    elements.error.hidden = false;
    elements.random.disabled = true;
  }

  elements.instrument.addEventListener("wheel", handleWheel, { passive: false });
  elements.instrument.addEventListener("pointerdown", handlePointerDown);
  elements.instrument.addEventListener("pointermove", handlePointerMove);
  elements.instrument.addEventListener("pointerup", handlePointerUp);
  elements.instrument.addEventListener("pointercancel", handlePointerUp);
  elements.instrument.addEventListener("keydown", handleKeyDown);
  elements.random.addEventListener("click", chooseRandomLens);
  elements.retry.addEventListener("click", () => loadLenses().catch(showLoadError));

  window.addEventListener("resize", updateGeometry);
  window.addEventListener("hashchange", () => {
    const index = indexFromHash();
    if (index >= 0 && index !== state.selectedIndex) {
      navigateTo(index);
      snapTarget();
    }
  });

  animate();
  loadLenses().catch(showLoadError);
})();
