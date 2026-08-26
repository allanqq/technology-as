(() => {
  "use strict";

  const ITEM_ANGLE_DEGREES = 13.5;
  const ITEM_ANGLE_RADIANS = ITEM_ANGLE_DEGREES * Math.PI / 180;
  const VISIBLE_NEIGHBORS = 13.35;
  const TICK_COUNT = 72;
  const WHEEL_SENSITIVITY = 0.0065;

  const elements = {
    dial: document.querySelector("#dial"),
    words: document.querySelector("#dial-words"),
    ticks: document.querySelector("#dial-ticks"),
    currentWord: document.querySelector("#current-word"),
    status: document.querySelector("#status")
  };

  if (!elements.dial || !elements.words || !elements.currentWord) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    lenses: [],
    wordElements: [],
    position: 0,
    targetPosition: 0,
    selectedIndex: -1,
    geometry: { centerX: 0, centerY: 0, radius: 0 },
    pointer: null,
    wheelTimer: 0,
    animationFrame: 0,
    hasMovedPointer: false
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

  async function loadLenses() {
    const response = await fetch("./source.html", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);

    const source = await response.text();
    const sourceDocument = new DOMParser().parseFromString(source, "text/html");
    const records = [...sourceDocument.querySelectorAll(".lens-index > li[data-lens-record]")];
    if (!records.length) throw new Error("No lenses found");

    state.lenses = records.map((record, index) => {
      const title = record.querySelector(".record-title")?.textContent?.trim() || `Lens ${index + 1}`;
      return {
        id: record.id || `lens-${index + 1}`,
        name: title.replace(/^Technology as\s*/i, "").replace(/[.…]+$/g, "").trim()
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

    elements.dial.setAttribute("aria-busy", "false");
    startAnimation();
  }

  function buildTicks() {
    if (!elements.ticks) return;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < TICK_COUNT; index += 1) {
      const tick = document.createElement("span");
      tick.className = "dial-tick";
      if (index % 6 === 0) tick.classList.add("is-major");
      const angle = index * (360 / TICK_COUNT);
      tick.style.transform = `rotate(${angle}deg) translateX(calc(var(--dial-radius) - .12rem))`;
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
    const rect = elements.dial.getBoundingClientRect();
    const narrow = rect.width <= 760;
    const centerX = narrow ? rect.width * 0.08 : rect.width * 0.34;
    const centerY = rect.height * 0.5;
    const widthRadius = narrow ? rect.width * 0.43 : rect.width * 0.235;
    const heightRadius = rect.height * (narrow ? 0.39 : 0.42);
    const radius = Math.max(112, Math.min(widthRadius, heightRadius, 420));

    state.geometry = { centerX, centerY, radius };
    document.documentElement.style.setProperty("--center-x", `${centerX}px`);
    document.documentElement.style.setProperty("--center-y", `${centerY}px`);
    document.documentElement.style.setProperty("--dial-radius", `${radius}px`);
  }

  function render() {
    if (!state.lenses.length) return;

    const count = state.lenses.length;
    const current = modulo(state.position, count);
    const radius = state.geometry.radius;

    state.wordElements.forEach((element, index) => {
      let delta = index - current;
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;

      const distance = Math.abs(delta);
      if (distance > VISIBLE_NEIGHBORS) {
        element.style.visibility = "hidden";
        element.style.pointerEvents = "none";
        element.style.opacity = "0";
        return;
      }

      const angle = delta * ITEM_ANGLE_RADIANS;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const frontness = (Math.cos(angle) + 1) / 2;
      const edgeFade = Math.max(0, 1 - distance / VISIBLE_NEIGHBORS);
      const opacity = Math.max(.06, Math.pow(frontness, 1.5) * Math.pow(edgeFade, .36));
      const scale = .55 + frontness * .43;
      const active = distance < .48;

      element.style.visibility = "visible";
      element.style.pointerEvents = active ? "none" : "auto";
      element.style.opacity = active ? "0" : opacity.toFixed(3);
      element.style.zIndex = String(Math.round(frontness * 10));
      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
    });

    if (elements.ticks) {
      elements.ticks.style.transform = `rotate(${-state.position * ITEM_ANGLE_DEGREES}deg)`;
    }
  }

  function syncSelection(force = false) {
    if (!state.lenses.length) return;

    const nextIndex = modulo(Math.round(state.targetPosition), state.lenses.length);
    if (!force && nextIndex === state.selectedIndex) return;

    state.wordElements[state.selectedIndex]?.setAttribute("aria-selected", "false");
    state.selectedIndex = nextIndex;

    const lens = state.lenses[nextIndex];
    const activeElement = state.wordElements[nextIndex];
    activeElement?.setAttribute("aria-selected", "true");
    elements.dial.setAttribute("aria-activedescendant", activeElement?.id || "");

    elements.currentWord.textContent = lens.name;
    elements.currentWord.style.setProperty("--word-scale", wordScale(lens.name));
    elements.status.textContent = `Technology as ${lens.name}`;

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
    startAnimation();
  }

  function navigateTo(index) {
    const current = modulo(state.targetPosition, state.lenses.length);
    state.targetPosition += shortestIndexDelta(current, index, state.lenses.length);
    syncSelection();
    startAnimation();
  }

  function snapTarget() {
    state.targetPosition = Math.round(state.targetPosition);
    syncSelection();
    startAnimation();
  }

  function handleWheel(event) {
    if (!state.lenses.length) return;
    event.preventDefault();

    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    state.targetPosition += delta * WHEEL_SENSITIVITY;
    syncSelection();
    startAnimation();

    window.clearTimeout(state.wheelTimer);
    state.wheelTimer = window.setTimeout(snapTarget, 92);
  }

  function pointerAngle(event) {
    const rect = elements.dial.getBoundingClientRect();
    return Math.atan2(
      event.clientY - rect.top - state.geometry.centerY,
      event.clientX - rect.left - state.geometry.centerX
    );
  }

  function handlePointerDown(event) {
    if (!state.lenses.length || event.button !== 0) return;

    const rect = elements.dial.getBoundingClientRect();
    const dx = event.clientX - rect.left - state.geometry.centerX;
    const dy = event.clientY - rect.top - state.geometry.centerY;
    const distance = Math.hypot(dx, dy);

    if (distance < state.geometry.radius * .28 || distance > state.geometry.radius * 1.55) return;

    elements.dial.focus({ preventScroll: true });
    state.pointer = {
      id: event.pointerId,
      lastAngle: pointerAngle(event),
      startX: event.clientX,
      startY: event.clientY
    };
    state.hasMovedPointer = false;
    elements.dial.setPointerCapture(event.pointerId);
    elements.dial.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    if (!state.pointer || event.pointerId !== state.pointer.id) return;

    const angle = pointerAngle(event);
    const deltaAngle = normalizeAngle(angle - state.pointer.lastAngle);
    state.pointer.lastAngle = angle;
    state.targetPosition -= deltaAngle / ITEM_ANGLE_RADIANS;

    if (Math.hypot(event.clientX - state.pointer.startX, event.clientY - state.pointer.startY) > 5) {
      state.hasMovedPointer = true;
    }

    syncSelection();
    startAnimation();
  }

  function handlePointerUp(event) {
    if (!state.pointer || event.pointerId !== state.pointer.id) return;

    if (elements.dial.hasPointerCapture(event.pointerId)) {
      elements.dial.releasePointerCapture(event.pointerId);
    }

    state.pointer = null;
    elements.dial.classList.remove("is-dragging");
    snapTarget();
    window.setTimeout(() => {
      state.hasMovedPointer = false;
    }, 0);
  }

  function handleKeydown(event) {
    if (!state.lenses.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      navigateBy(1);
      snapTarget();
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      navigateBy(-1);
      snapTarget();
    }
  }

  function startAnimation() {
    if (!state.animationFrame) state.animationFrame = requestAnimationFrame(animate);
  }

  function animate() {
    const difference = state.targetPosition - state.position;
    const factor = reducedMotion ? 1 : .16;
    state.position += difference * factor;

    if (Math.abs(difference) < .0008) {
      state.position = state.targetPosition;
      render();
      state.animationFrame = 0;
      return;
    }

    render();
    state.animationFrame = requestAnimationFrame(animate);
  }

  elements.dial.addEventListener("wheel", handleWheel, { passive: false });
  elements.dial.addEventListener("pointerdown", handlePointerDown);
  elements.dial.addEventListener("pointermove", handlePointerMove);
  elements.dial.addEventListener("pointerup", handlePointerUp);
  elements.dial.addEventListener("pointercancel", handlePointerUp);
  elements.dial.addEventListener("keydown", handleKeydown);

  window.addEventListener("resize", () => {
    updateGeometry();
    render();
  });

  window.addEventListener("hashchange", () => {
    if (!state.lenses.length) return;
    const index = indexFromHash();
    if (index >= 0) {
      navigateTo(index);
      snapTarget();
    }
  });

  loadLenses().catch((error) => {
    console.error(error);
    elements.dial.setAttribute("aria-busy", "false");
  });
})();
