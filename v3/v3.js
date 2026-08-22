(() => {
  "use strict";

  const DIMENSIONS = [
    {
      id: "power",
      label: "Power",
      words: ["power", "authority", "control", "governance", "consent", "surveillance", "permission", "accountability", "exclusion", "proclamation"]
    },
    {
      id: "knowledge",
      label: "Knowledge",
      words: ["knowledge", "truth", "data", "model", "classification", "prediction", "approximation", "measurement", "score", "uncertainty", "representation", "simulation"]
    },
    {
      id: "agency",
      label: "Agency",
      words: ["agency", "choice", "behavior", "attention", "identity", "care", "dignity", "labor", "dependency", "relationship", "accessibility", "habit"]
    },
    {
      id: "material",
      label: "Material",
      words: ["material", "energy", "water", "mineral", "waste", "environment", "extraction", "infrastructure", "supply", "physical", "transpiration"]
    },
    {
      id: "time",
      label: "Time",
      words: ["future", "history", "memory", "speed", "transformation", "alteration", "irreversible", "maintenance", "legacy", "lock", "scale", "normalization"]
    },
    {
      id: "risk",
      label: "Risk",
      words: ["risk", "harm", "safety", "failure", "responsibility", "resilience", "precaution", "security", "vulnerability", "tribulation", "consternation"]
    }
  ];

  const EXPANSIONS = [
    { match: ["ai", "agent", "model", "algorithm", "llm"], add: ["automation", "authority", "prediction", "approximation", "uncertainty", "responsibility"] },
    { match: ["data", "tracking", "analytics"], add: ["measurement", "classification", "surveillance", "consent", "representation"] },
    { match: ["metric", "score", "ranking", "optimize"], add: ["measurement", "incentive", "behavior", "proclamation", "approximation"] },
    { match: ["interface", "product", "user", "app"], add: ["attention", "agency", "behavior", "choice", "relationship"] },
    { match: ["platform", "network", "ecosystem"], add: ["power", "governance", "infrastructure", "dependency", "scale"] },
    { match: ["worker", "labor", "employee", "workflow"], add: ["control", "agency", "dignity", "responsibility", "dependency"] },
    { match: ["launch", "deploy", "release", "rollout"], add: ["risk", "failure", "irreversible", "normalization", "responsibility"] },
    { match: ["cloud", "compute", "hardware", "gpu", "infrastructure"], add: ["energy", "water", "material", "dependency", "maintenance"] }
  ];

  const STOP = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "i", "if", "in", "is", "it", "of", "on", "or", "our", "that", "the", "their", "this", "to", "we", "what", "when", "which", "who", "with", "you", "your"]);

  const elements = {
    form: document.querySelector("#decision-form"),
    decision: document.querySelector("#decision"),
    context: document.querySelector("#context"),
    example: document.querySelector("#example-button"),
    status: document.querySelector("#engine-status"),
    frame: document.querySelector("#frame-step"),
    results: document.querySelector("#results-step"),
    grid: document.querySelector("#lens-grid"),
    revise: document.querySelector("#revise-button"),
    changeStep: document.querySelector("#change-step"),
    back: document.querySelector("#back-to-lenses"),
    dimension: document.querySelector("#chosen-dimension"),
    name: document.querySelector("#chosen-name"),
    question: document.querySelector("#chosen-question"),
    change: document.querySelector("#change"),
    copy: document.querySelector("#copy-button"),
    reset: document.querySelector("#reset-button"),
    copyStatus: document.querySelector("#copy-status")
  };

  if (!elements.form || !elements.grid) return;

  let lenses = [];
  let selected = null;

  function normalize(value) {
    return String(value || "")
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/[’']/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function tokens(value) {
    return normalize(value)
      .split(/\s+/u)
      .filter((word) => word.length > 2 && !STOP.has(word));
  }

  function expand(inputTokens) {
    const expanded = new Set(inputTokens);
    const text = ` ${inputTokens.join(" ")} `;
    EXPANSIONS.forEach((rule) => {
      if (rule.match.some((word) => text.includes(` ${word} `))) {
        rule.add.forEach((word) => expanded.add(word));
      }
    });
    return [...expanded];
  }

  function classify(text) {
    const normalized = normalize(text);
    return DIMENSIONS
      .map((dimension) => ({
        ...dimension,
        score: dimension.words.reduce((sum, word) => sum + (normalized.includes(word) ? 1 : 0), 0)
      }))
      .sort((a, b) => b.score - a.score)[0];
  }

  async function loadLenses() {
    const response = await fetch("../index.html", { cache: "force-cache" });
    if (!response.ok) throw new Error("The lens library could not be loaded.");
    const source = new DOMParser().parseFromString(await response.text(), "text/html");

    lenses = [...source.querySelectorAll(".lens-index > li[data-lens-record]")].map((record, index) => {
      const name = record.querySelector(".record-title")?.textContent?.replace(/^Technology as\s*/i, "").trim() || `lens ${index + 1}`;
      const interpretation = record.querySelector(".record-interpretation > p:last-child")?.textContent?.trim() || "";
      const catalyst = record.querySelector(".record-catalyst > p:last-child")?.textContent?.trim() || "";
      const number = record.querySelector(".record-number")?.textContent?.trim() || String(index + 1).padStart(2, "0");
      const text = `${name} ${interpretation} ${catalyst}`;
      return {
        id: record.id || `lens-${index + 1}`,
        name,
        number,
        catalyst,
        normalized: normalize(text),
        titleTokens: new Set(tokens(name)),
        allTokens: new Set(tokens(text)),
        dimension: classify(text)
      };
    });

    if (lenses.length < 3) throw new Error("The lens library is incomplete.");
  }

  function scoreLens(lens, queryTokens) {
    let score = 0;
    queryTokens.forEach((word) => {
      if (lens.titleTokens.has(word)) score += 7;
      if (lens.allTokens.has(word)) score += 2;
      if (lens.normalized.includes(word)) score += .5;
    });
    return score;
  }

  function chooseThree(input) {
    const queryTokens = expand(tokens(input));
    const ranked = lenses
      .map((lens) => ({ lens, score: scoreLens(lens, queryTokens) }))
      .sort((a, b) => b.score - a.score || Number(a.lens.number) - Number(b.lens.number));

    const chosen = [];
    const usedDimensions = new Set();

    ranked.forEach((result) => {
      if (chosen.length >= 3) return;
      if (!usedDimensions.has(result.lens.dimension.id)) {
        chosen.push(result);
        usedDimensions.add(result.lens.dimension.id);
      }
    });

    ranked.forEach((result) => {
      if (chosen.length >= 3 || chosen.some((item) => item.lens.id === result.lens.id)) return;
      chosen.push(result);
    });

    return chosen;
  }

  function show(step) {
    elements.frame.hidden = step !== "frame";
    elements.results.hidden = step !== "results";
    elements.changeStep.hidden = step !== "change";
    const target = step === "frame" ? elements.decision : step === "results" ? elements.results : elements.change;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => target?.focus({ preventScroll: true }), 180);
  }

  function renderResults(results) {
    elements.grid.replaceChildren();

    results.forEach(({ lens }, index) => {
      const card = document.createElement("article");
      card.className = "lens-card";

      const meta = document.createElement("div");
      meta.className = "lens-meta";
      meta.innerHTML = `<span>0${index + 1}</span><span>${lens.dimension.label}</span>`;

      const title = document.createElement("h3");
      const prefix = document.createElement("span");
      prefix.textContent = "Technology as";
      title.append(prefix, document.createTextNode(lens.name));

      const question = document.createElement("p");
      question.className = "lens-question";
      question.textContent = lens.catalyst;

      const button = document.createElement("button");
      button.className = "primary";
      button.type = "button";
      button.innerHTML = `Use this lens <span aria-hidden="true">→</span>`;
      button.addEventListener("click", () => selectLens(lens));

      card.append(meta, title, question, button);
      elements.grid.append(card);
    });
  }

  function selectLens(lens) {
    selected = lens;
    elements.dimension.textContent = `${lens.dimension.label} lens / ${lens.number}`;
    elements.name.textContent = lens.name;
    elements.question.textContent = lens.catalyst;
    elements.change.value = "";
    elements.copyStatus.textContent = "";
    show("change");
  }

  function reflectionText() {
    const sections = [
      "TECHNOLOGY AS… DECISION REFLECTION",
      `Decision\n${elements.decision.value.trim()}`
    ];

    if (elements.context.value.trim()) sections.push(`Context\n${elements.context.value.trim()}`);
    sections.push(
      `Lens\nTechnology as ${selected?.name || ""}`,
      `Question\n${selected?.catalyst || ""}`,
      `Change\n${elements.change.value.trim() || "Not yet specified."}`
    );

    return sections.join("\n\n");
  }

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const decision = elements.decision.value.trim();
    if (!decision) return;

    elements.status.textContent = "";
    const submit = elements.form.querySelector("button[type='submit']");
    submit.disabled = true;

    try {
      if (!lenses.length) await loadLenses();
      renderResults(chooseThree(`${decision} ${elements.context.value}`));
      show("results");
    } catch (error) {
      elements.status.textContent = error instanceof Error ? error.message : "The lens engine failed to load.";
    } finally {
      submit.disabled = false;
    }
  });

  elements.example.addEventListener("click", () => {
    elements.decision.value = "Should our AI agent issue refunds without human approval?";
    elements.context.value = "Customers, support staff, fraud risk, response time, and unclear accountability.";
    elements.decision.focus();
  });

  elements.revise.addEventListener("click", () => show("frame"));
  elements.back.addEventListener("click", () => show("results"));

  elements.copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(reflectionText());
      elements.copyStatus.textContent = "Copied.";
    } catch {
      elements.copyStatus.textContent = "Copy failed. Select the text manually.";
    }
  });

  elements.reset.addEventListener("click", () => {
    elements.form.reset();
    elements.change.value = "";
    elements.status.textContent = "";
    elements.copyStatus.textContent = "";
    selected = null;
    show("frame");
  });
})();
