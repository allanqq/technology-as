(() => {
  "use strict";

  const STORAGE_KEY = "technology-as:decision-instrument:v1";
  const MAX_SELECTED = 4;
  const DEFAULT_SELECTED = 3;
  const RESULT_COUNT = 6;

  const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "because", "been", "before", "being", "but", "by",
    "can", "could", "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in", "into",
    "is", "it", "its", "may", "more", "most", "not", "of", "on", "or", "our", "should", "so", "some",
    "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "to",
    "too", "up", "use", "using", "we", "what", "when", "where", "which", "who", "will", "with", "would",
    "you", "your"
  ]);

  const EXPANSION_RULES = [
    { match: ["ai", "artificial intelligence", "model", "models", "llm", "algorithm", "agent"], cues: ["automation", "prediction", "classification", "approximation", "delegation", "authority", "opacity", "uncertainty", "judgment"] },
    { match: ["data", "dataset", "database", "analytics", "tracking"], cues: ["measurement", "extraction", "classification", "representation", "privacy", "surveillance", "memory", "consent", "provenance"] },
    { match: ["metric", "kpi", "score", "ranking", "optimize", "optimization"], cues: ["measurement", "proxy", "incentive", "proclamation", "value", "behavior", "gaming", "legibility"] },
    { match: ["interface", "product", "user", "ux", "experience", "app"], cues: ["mediation", "attention", "behavior", "agency", "default", "friction", "accessibility", "habit"] },
    { match: ["platform", "marketplace", "network", "ecosystem"], cues: ["infrastructure", "dependence", "power", "governance", "scale", "lock-in", "intermediation", "standard"] },
    { match: ["worker", "labor", "employee", "team", "workflow", "job"], cues: ["automation", "deskilling", "control", "dignity", "coordination", "exploitation", "visibility", "responsibility"] },
    { match: ["safety", "risk", "harm", "security", "abuse", "failure"], cues: ["responsibility", "precaution", "resilience", "accountability", "failure", "vulnerability", "rollback", "uncertainty"] },
    { match: ["privacy", "surveillance", "monitoring", "identity"], cues: ["consent", "observation", "control", "visibility", "classification", "memory", "power", "boundary"] },
    { match: ["energy", "compute", "hardware", "cloud", "gpu", "infrastructure"], cues: ["material", "energy", "water", "extraction", "labor", "waste", "maintenance", "dependency", "transpiration"] },
    { match: ["policy", "regulation", "governance", "compliance"], cues: ["authority", "legitimacy", "accountability", "enforcement", "participation", "institution", "contestability", "responsibility"] },
    { match: ["launch", "ship", "deploy", "release", "rollout"], cues: ["irreversibility", "speed", "precaution", "maintenance", "failure", "responsibility", "normalization", "path dependence"] },
    { match: ["education", "student", "learning", "teacher"], cues: ["authority", "measurement", "attention", "agency", "standardization", "relationship", "care", "knowledge"] },
    { match: ["health", "medical", "patient", "care"], cues: ["care", "body", "risk", "classification", "authority", "consent", "dignity", "responsibility"] }
  ];

  const DOMAIN_CUES = {
    "ai-models": { label: "AI and models", cues: ["automation", "prediction", "classification", "approximation", "authority", "uncertainty", "opacity", "delegation"] },
    "product-interface": { label: "product and interface", cues: ["mediation", "attention", "agency", "behavior", "default", "friction", "accessibility", "relationship"] },
    "data-infrastructure": { label: "data and infrastructure", cues: ["extraction", "measurement", "material", "surveillance", "dependency", "maintenance", "provenance", "scale"] },
    "organization-workflow": { label: "organization and workflow", cues: ["labor", "coordination", "control", "incentive", "responsibility", "deskilling", "visibility", "institution"] },
    "policy-governance": { label: "policy and governance", cues: ["authority", "legitimacy", "accountability", "consent", "participation", "enforcement", "power", "contestability"] },
    "hardware-physical": { label: "hardware and physical systems", cues: ["material", "energy", "water", "extraction", "waste", "maintenance", "infrastructure", "environment"] }
  };

  const DIMENSIONS = [
    {
      id: "power",
      label: "Power & governance",
      color: "#ff5a36",
      keywords: ["power", "authority", "control", "governance", "institution", "surveillance", "consent", "politics", "inequality", "exclusion", "legitimacy", "enforcement", "contestability", "monopoly", "permission", "proclamation"],
      rationale: "It asks who gains authority, who absorbs the consequences, and who can contest the system.",
      moves: ["Name the accountable human owner and escalation path.", "Add a meaningful override, appeal, or refusal mechanism.", "Make permissions and decision authority narrower, visible, and reviewable."]
    },
    {
      id: "knowledge",
      label: "Knowledge & representation",
      color: "#b8d8ff",
      keywords: ["knowledge", "truth", "data", "model", "classification", "prediction", "approximation", "simulation", "measurement", "score", "uncertainty", "representation", "proxy", "ranking", "language", "legibility"],
      rationale: "It tests what the system treats as knowledge, what it leaves out, and how uncertainty is concealed or communicated.",
      moves: ["Expose uncertainty, provenance, and the limits of the representation.", "Test counterexamples and people poorly represented by the data.", "Separate a useful proxy from the reality it is being allowed to govern."]
    },
    {
      id: "agency",
      label: "Human agency & experience",
      color: "#ffb7d0",
      keywords: ["agency", "autonomy", "behavior", "attention", "identity", "relationship", "care", "dignity", "body", "emotion", "habit", "dependency", "labor", "deskilling", "meaning", "choice", "friction", "accessibility"],
      rationale: "It tests whether the design expands or contracts human agency, dignity, skill, attention, and relationships.",
      moves: ["Preserve a real choice rather than a nominal opt-out.", "Measure effects on skill, attention, dignity, and dependency.", "Design feedback and recovery around the affected person, not only the operator."]
    },
    {
      id: "material",
      label: "Material & ecological systems",
      color: "#a9e5c7",
      keywords: ["material", "energy", "water", "mineral", "waste", "environment", "climate", "extraction", "supply", "infrastructure", "land", "emission", "heat", "resource", "transpiration", "physical"],
      rationale: "It brings hidden labor, energy, resource, infrastructure, and ecological flows back into the decision.",
      moves: ["Create a lifecycle budget for energy, water, materials, and waste.", "Trace hidden labor and supplier dependencies behind the interface.", "Compare the proposed system with a lower-resource or nontechnical alternative."]
    },
    {
      id: "time",
      label: "Time, change & lock-in",
      color: "#dbc5ff",
      keywords: ["future", "history", "memory", "speed", "acceleration", "transformation", "alteration", "irreversible", "maintenance", "legacy", "lock", "path", "normalization", "scale", "temporality", "obsolescence"],
      rationale: "It tests reversibility, maintenance, lock-in, and the futures that become easier or harder after this decision.",
      moves: ["Define a rollback, sunset, migration, or decommissioning path.", "Review what becomes normalized when the choice operates at scale.", "Fund maintenance and monitoring beyond the launch moment."]
    },
    {
      id: "risk",
      label: "Risk & responsibility",
      color: "#ffd08e",
      keywords: ["risk", "harm", "safety", "failure", "responsibility", "accountability", "resilience", "precaution", "security", "vulnerability", "tribulation", "consternation", "uncertainty", "abuse", "incident", "cost"],
      rationale: "It turns abstract responsibility into failure modes, affected parties, safeguards, and ownership.",
      moves: ["Run a pre-mortem with concrete failure and abuse cases.", "Set a threshold that stops or degrades the system safely.", "Assign incident ownership and rehearse response before deployment."]
    }
  ];

  const EXAMPLES = {
    agent: {
      system: "An AI customer-support agent that can inspect accounts, issue refunds, and send messages in the company’s name.",
      decision: "Whether it should act autonomously below a dollar threshold or require human confirmation before every consequential action.",
      stakeholders: "Customers, support workers, supervisors, people whose accounts are misread, and teams responsible for incidents.",
      constraints: "Response time, support costs, uneven model reliability, pressure to launch, and unclear accountability when the agent makes a mistake.",
      domains: ["ai-models", "product-interface", "organization-workflow", "policy-governance"]
    },
    metric: {
      system: "A social learning product used by students and educators.",
      decision: "Whether the primary product metric should be daily time spent, lesson completion, or a slower measure of durable learning and student agency.",
      stakeholders: "Students, teachers, parents, product teams, and students with different learning needs or limited time.",
      constraints: "Investor pressure for growth, slow learning outcomes, noisy measurement, and the ease of optimizing engagement instead of educational value.",
      domains: ["product-interface", "data-infrastructure", "organization-workflow"]
    },
    infrastructure: {
      system: "A generative-AI service that runs large inference workloads across several cloud regions.",
      decision: "Which provider and region to standardize on, and whether latency and cost should outweigh energy, water, labor, resilience, and vendor lock-in.",
      stakeholders: "Users, infrastructure engineers, local communities, data-center workers, suppliers, and future teams inheriting the architecture.",
      constraints: "Latency targets, rapidly changing prices, limited environmental data, reliability commitments, and the cost of migrating later.",
      domains: ["ai-models", "data-infrastructure", "hardware-physical", "policy-governance"]
    }
  };

  const elements = {
    form: document.querySelector("#decision-form"),
    system: document.querySelector("#system-input"),
    decision: document.querySelector("#decision-input"),
    stakeholders: document.querySelector("#stakeholders-input"),
    constraints: document.querySelector("#constraints-input"),
    submit: document.querySelector("#decision-form .primary-action"),
    engineStatus: document.querySelector("#engine-status"),
    results: document.querySelector("#results"),
    action: document.querySelector("#action"),
    stack: document.querySelector("#lens-stack"),
    snapshotSystem: document.querySelector("#snapshot-system"),
    snapshotDecision: document.querySelector("#snapshot-decision"),
    signalSummary: document.querySelector("#signal-summary"),
    revise: document.querySelector("#revise-button"),
    selectedSummary: document.querySelector("#selected-summary"),
    change: document.querySelector("#change-input"),
    test: document.querySelector("#test-input"),
    owner: document.querySelector("#owner-input"),
    review: document.querySelector("#review-input"),
    copyBrief: document.querySelector("#copy-brief"),
    downloadBrief: document.querySelector("#download-brief"),
    reset: document.querySelector("#reset-instrument"),
    exportStatus: document.querySelector("#export-status")
  };

  if (!elements.form || !elements.stack) return;

  const state = {
    lenses: [],
    documentFrequency: new Map(),
    currentInput: null,
    currentResults: [],
    selected: new Set(),
    notes: {},
    cardElements: new Map()
  };

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .toLocaleLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function stem(word) {
    if (word.length < 5) return word;
    return word
      .replace(/(izations|ization|ational|ations|ation|ments|ment|ingly|edly|ing|ied|ies|ed|es)$/u, "")
      .replace(/s$/u, "");
  }

  function tokenize(value) {
    return normalize(value)
      .split(/\s+/u)
      .filter(Boolean)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
      .map(stem);
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  async function loadLenses() {
    const response = await fetch("../index.html", { cache: "force-cache" });
    if (!response.ok) throw new Error(`Lens library returned ${response.status}.`);
    const source = await response.text();
    const documentSource = new DOMParser().parseFromString(source, "text/html");
    const records = [...documentSource.querySelectorAll(".lens-index > li[data-lens-record]")];

    const lenses = records.map((record, index) => {
      const name = record.querySelector(".record-title")?.textContent?.replace(/^Technology as\s*/i, "").trim() || `lens ${index + 1}`;
      const interpretation = record.querySelector(".record-interpretation > p:last-child")?.textContent?.trim() || "";
      const catalyst = record.querySelector(".record-catalyst > p:last-child")?.textContent?.trim() || "";
      const number = record.querySelector(".record-number")?.textContent?.trim() || String(index + 1).padStart(2, "0");
      const titleTokens = tokenize(name);
      const interpretationTokens = tokenize(interpretation);
      const catalystTokens = tokenize(catalyst);
      const allTokens = [...titleTokens, ...interpretationTokens, ...catalystTokens];

      return {
        id: record.id || `lens-${index + 1}`,
        number,
        name,
        interpretation,
        catalyst,
        normalizedText: normalize(`${name} ${interpretation} ${catalyst}`),
        titleTokens: new Set(titleTokens),
        interpretationTokens: new Set(interpretationTokens),
        catalystTokens: new Set(catalystTokens),
        allTokens: new Set(allTokens)
      };
    });

    if (lenses.length < 90) throw new Error(`Expected the 100-lens library but found ${lenses.length}.`);

    const documentFrequency = new Map();
    for (const lens of lenses) {
      for (const term of lens.allTokens) documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }

    state.lenses = lenses;
    state.documentFrequency = documentFrequency;
    return lenses;
  }

  const lensesPromise = loadLenses();

  function getDomains() {
    return [...elements.form.querySelectorAll('input[name="domain"]:checked')].map((input) => input.value);
  }

  function getInput() {
    return {
      system: elements.system.value.trim(),
      decision: elements.decision.value.trim(),
      stakeholders: elements.stakeholders.value.trim(),
      constraints: elements.constraints.value.trim(),
      domains: getDomains()
    };
  }

  function addWeightedPhrase(termMap, phrase, weight, source) {
    for (const token of tokenize(phrase)) {
      const current = termMap.get(token);
      if (!current || weight > current.weight) {
        termMap.set(token, { weight, label: phrase, source });
      } else if (weight === current.weight && current.label.length > phrase.length) {
        current.label = phrase;
      }
    }
  }

  function buildQuery(input) {
    const termMap = new Map();
    const rawSections = [
      [input.system, 3.2, "system"],
      [input.decision, 4.2, "decision"],
      [input.stakeholders, 2.3, "stakeholders"],
      [input.constraints, 2.1, "constraints"]
    ];

    for (const [text, weight, source] of rawSections) {
      const originalWords = normalize(text).split(/\s+/u).filter(Boolean);
      for (const word of originalWords) {
        if (word.length <= 2 || STOP_WORDS.has(word)) continue;
        addWeightedPhrase(termMap, word, weight, source);
      }
    }

    const completeText = normalize(`${input.system} ${input.decision} ${input.stakeholders} ${input.constraints}`);
    for (const rule of EXPANSION_RULES) {
      if (rule.match.some((phrase) => completeText.includes(normalize(phrase)))) {
        for (const cue of rule.cues) addWeightedPhrase(termMap, cue, 1.7, "expanded");
      }
    }

    for (const domainId of input.domains) {
      const domain = DOMAIN_CUES[domainId];
      if (!domain) continue;
      addWeightedPhrase(termMap, domain.label, 2.2, "domain");
      for (const cue of domain.cues) addWeightedPhrase(termMap, cue, 2, "domain");
    }

    return termMap;
  }

  function classifyDimension(lens) {
    let best = DIMENSIONS[0];
    let bestScore = -1;

    for (const dimension of DIMENSIONS) {
      let score = 0;
      for (const keyword of dimension.keywords) {
        for (const token of tokenize(keyword)) {
          if (lens.titleTokens.has(token)) score += 4;
          if (lens.catalystTokens.has(token)) score += 2.2;
          if (lens.interpretationTokens.has(token)) score += 1.4;
        }
      }
      if (score > bestScore) {
        best = dimension;
        bestScore = score;
      }
    }

    return best;
  }

  function scoreLens(lens, termMap) {
    const matches = [];
    let score = 0;
    const totalDocuments = state.lenses.length;

    for (const [term, meta] of termMap) {
      let fieldWeight = 0;
      if (lens.titleTokens.has(term)) fieldWeight += 5.2;
      if (lens.catalystTokens.has(term)) fieldWeight += 2.7;
      if (lens.interpretationTokens.has(term)) fieldWeight += 1.7;
      if (!fieldWeight) continue;

      const frequency = state.documentFrequency.get(term) || 0;
      const inverseFrequency = 1 + Math.log((totalDocuments + 1) / (frequency + 1));
      const contribution = meta.weight * fieldWeight * inverseFrequency;
      score += contribution;
      matches.push({ term, label: meta.label, contribution, source: meta.source });
    }

    const normalizedDecision = normalize(state.currentInput?.decision || "");
    const normalizedName = normalize(lens.name);
    if (normalizedDecision.includes(normalizedName) && normalizedName.length > 4) score += 18;

    matches.sort((a, b) => b.contribution - a.contribution);
    return { lens, score, matches, dimension: classifyDimension(lens) };
  }

  function diversify(scored, count) {
    const remaining = [...scored];
    const selected = [];
    const dimensionCount = new Map();
    const maxScore = remaining[0]?.score || 1;

    while (selected.length < count && remaining.length) {
      let winnerIndex = 0;
      let winnerValue = -Infinity;

      remaining.forEach((candidate, index) => {
        const repetitions = dimensionCount.get(candidate.dimension.id) || 0;
        const diversityAdjustment = repetitions === 0 ? maxScore * .16 : -maxScore * .12 * repetitions;
        const matchBreadth = Math.min(candidate.matches.length, 5) * maxScore * .012;
        const adjusted = candidate.score + diversityAdjustment + matchBreadth;
        if (adjusted > winnerValue) {
          winnerValue = adjusted;
          winnerIndex = index;
        }
      });

      const [winner] = remaining.splice(winnerIndex, 1);
      selected.push(winner);
      dimensionCount.set(winner.dimension.id, (dimensionCount.get(winner.dimension.id) || 0) + 1);
    }

    return selected;
  }

  function rankLenses(input) {
    state.currentInput = input;
    const termMap = buildQuery(input);
    const scored = state.lenses
      .map((lens) => scoreLens(lens, termMap))
      .sort((a, b) => b.score - a.score || a.lens.name.localeCompare(b.lens.name));

    const results = diversify(scored, RESULT_COUNT);
    const signals = unique(
      [...termMap.values()]
        .sort((a, b) => b.weight - a.weight)
        .map((item) => item.label)
        .filter((label) => label.length > 2)
    ).slice(0, 8);

    return { results, signals };
  }

  function humanList(values) {
    const clean = unique(values.filter(Boolean));
    if (!clean.length) return "the broader system context";
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
  }

  function buildWhy(result) {
    const matched = unique(result.matches.map((match) => match.label)).slice(0, 3);
    const opening = matched.length
      ? `Your framing foregrounds ${humanList(matched)}.`
      : "This lens broadens the decision beyond its stated function.";
    return `${opening} ${result.dimension.rationale}`;
  }

  function renderLensCard(result, index) {
    const { lens, dimension } = result;
    const card = createElement("article", "lens-card");
    card.dataset.lensId = lens.id;
    card.style.setProperty("--dimension-color", dimension.color);

    const rail = createElement("div", "lens-rail");
    const railMeta = createElement("div");
    railMeta.append(
      createElement("p", "lens-number"),
      createElement("p", "lens-dimension", dimension.label),
      createElement("div", "dimension-mark")
    );
    const selectButton = createElement("button", "lens-select", "Add to brief +");
    selectButton.type = "button";
    selectButton.setAttribute("aria-pressed", "false");
    selectButton.addEventListener("click", () => toggleLens(lens.id));
    rail.append(railMeta, selectButton);

    const main = createElement("div", "lens-main");
    const top = createElement("div", "lens-top");
    const titleArea = createElement("div");
    titleArea.append(createElement("p", "lens-kicker", `Ranked lens / ${String(index + 1).padStart(2, "0")}`));
    const title = createElement("h3", "lens-title");
    title.append(createElement("span", "", "Technology as"), document.createTextNode(lens.name));
    titleArea.append(title, createElement("p", "lens-why", buildWhy(result)));

    const catalystArea = createElement("div", "lens-catalyst");
    catalystArea.append(createElement("p", "micro-label", "Critical catalyst"));
    const quote = createElement("blockquote", "", lens.catalyst);
    catalystArea.append(quote);
    const sourceLink = createElement("a", "source-link", `Open lens ${lens.number} in the library ↗`);
    sourceLink.href = `../index.html#${lens.id}`;
    catalystArea.append(sourceLink);
    top.append(titleArea, catalystArea);

    const details = createElement("div", "lens-details");
    const interpretation = createElement("div");
    interpretation.append(createElement("p", "micro-label", "Interpretation"), createElement("p", "", lens.interpretation));
    const moves = createElement("div");
    moves.append(createElement("p", "micro-label", "Intervention moves"));
    const moveList = createElement("ul", "move-list");
    dimension.moves.forEach((move) => moveList.append(createElement("li", "", move)));
    moves.append(moveList);
    details.append(interpretation, moves);

    const workspace = createElement("div", "lens-workspace");
    const revealLabel = createElement("label");
    revealLabel.append(createElement("span", "micro-label", "What does this lens reveal?"));
    const revealInput = createElement("textarea");
    revealInput.placeholder = "A hidden assumption, externality, power relation, uncertainty, or affected party…";
    revealInput.value = state.notes[lens.id]?.reveal || "";
    revealInput.addEventListener("input", () => updateNote(lens.id, "reveal", revealInput.value));
    revealLabel.append(revealInput);

    const actionLabel = createElement("label");
    actionLabel.append(createElement("span", "micro-label", "What intervention follows?"));
    const actionInput = createElement("textarea");
    actionInput.placeholder = "A concrete change to design, code, permissions, metrics, governance, rollout, or testing…";
    actionInput.value = state.notes[lens.id]?.action || "";
    actionInput.addEventListener("input", () => updateNote(lens.id, "action", actionInput.value));
    actionLabel.append(actionInput);
    workspace.append(revealLabel, actionLabel);

    main.append(top, details, workspace);
    card.append(rail, main);
    state.cardElements.set(lens.id, { card, button: selectButton });
    return card;
  }

  function updateNote(lensId, key, value) {
    state.notes[lensId] = { ...(state.notes[lensId] || {}), [key]: value };
    persist();
  }

  function toggleLens(lensId) {
    if (state.selected.has(lensId)) {
      state.selected.delete(lensId);
    } else if (state.selected.size >= MAX_SELECTED) {
      elements.exportStatus.textContent = `The brief is limited to ${MAX_SELECTED} lenses. Remove one before adding another.`;
      elements.action.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    } else {
      state.selected.add(lensId);
    }

    syncSelectionUI();
    persist();
  }

  function syncSelectionUI() {
    for (const [lensId, refs] of state.cardElements) {
      const selected = state.selected.has(lensId);
      refs.card.classList.toggle("is-selected", selected);
      refs.button.setAttribute("aria-pressed", String(selected));
      refs.button.textContent = selected ? "In brief ✓" : "Add to brief +";
    }

    elements.selectedSummary.replaceChildren();
    const selectedResults = state.currentResults.filter((result) => state.selected.has(result.lens.id));
    selectedResults.forEach((result, index) => {
      const item = createElement("div", "selected-item");
      item.append(createElement("span", "", String(index + 1).padStart(2, "0")), createElement("p", "", `Technology as ${result.lens.name}`));
      elements.selectedSummary.append(item);
    });

    if (!selectedResults.length) {
      elements.selectedSummary.append(createElement("p", "selection-guidance", "No lenses selected. Add at least one lens to create a decision brief."));
    }

    elements.action.hidden = false;
    elements.exportStatus.textContent = selectedResults.length
      ? `${selectedResults.length} of ${MAX_SELECTED} possible lenses selected.`
      : "Select at least one lens before exporting.";
  }

  function renderResults(results, signals) {
    state.currentResults = results;
    state.selected = new Set(results.slice(0, DEFAULT_SELECTED).map((result) => result.lens.id));
    state.notes = {};
    state.cardElements.clear();

    elements.snapshotSystem.textContent = state.currentInput.system;
    elements.snapshotDecision.textContent = state.currentInput.decision;
    elements.signalSummary.textContent = signals.join(" · ") || "system · choice · consequences";
    elements.stack.replaceChildren(...results.map(renderLensCard));
    elements.results.hidden = false;
    elements.action.hidden = false;
    syncSelectionUI();
  }

  function showEngineError(error) {
    elements.results.hidden = false;
    elements.action.hidden = true;
    elements.stack.replaceChildren();
    const box = createElement("div", "engine-error");
    box.append(
      createElement("h3", "", "The lens library could not be loaded."),
      createElement("p", "", `${error.message} Open this endpoint from its hosted preview rather than as a local file, then retry.`)
    );
    elements.stack.append(box);
  }

  async function runAnalysis(input, options = {}) {
    elements.submit.disabled = true;
    const originalLabel = elements.submit.innerHTML;
    elements.submit.innerHTML = "Reading the 100-lens field <span aria-hidden=\"true\">…</span>";
    elements.engineStatus.textContent = "Parsing and ranking the full collection across six critical dimensions.";

    try {
      await lensesPromise;
      const { results, signals } = rankLenses(input);
      renderResults(results, signals);
      elements.engineStatus.textContent = `Ranked ${state.lenses.length} lenses. The result balances relevance with critical diversity.`;
      persist();
      if (options.scroll !== false) elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error(error);
      elements.engineStatus.textContent = "The ranking engine could not load the lens source.";
      showEngineError(error);
    } finally {
      elements.submit.disabled = false;
      elements.submit.innerHTML = originalLabel;
    }
  }

  function buildMarkdown() {
    const input = state.currentInput || getInput();
    const selectedResults = state.currentResults.filter((result) => state.selected.has(result.lens.id));
    const lines = [
      "# Technology as… Decision Reflection",
      "",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "## System",
      input.system || "Not specified",
      "",
      "## Live technical decision",
      input.decision || "Not specified",
      "",
      "## People and groups who can be affected",
      input.stakeholders || "Not specified",
      "",
      "## Constraints and pressures",
      input.constraints || "Not specified",
      "",
      `## Critical lens stack (${selectedResults.length})`,
      ""
    ];

    selectedResults.forEach((result, index) => {
      const note = state.notes[result.lens.id] || {};
      lines.push(
        `### ${index + 1}. Technology as ${result.lens.name}`,
        "",
        `**Dimension:** ${result.dimension.label}`,
        "",
        `**Why this lens:** ${buildWhy(result)}`,
        "",
        `**Interpretation:** ${result.lens.interpretation}`,
        "",
        `**Critical catalyst:** ${result.lens.catalyst}`,
        "",
        "**What this lens revealed:**",
        note.reveal?.trim() || "Not yet captured.",
        "",
        "**Intervention from this lens:**",
        note.action?.trim() || "Not yet captured.",
        "",
        "**Possible intervention moves:**",
        ...result.dimension.moves.map((move) => `- ${move}`),
        ""
      );
    });

    lines.push(
      "## Decision change",
      elements.change.value.trim() || "Not yet specified.",
      "",
      "## Evidence or test",
      elements.test.value.trim() || "Not yet specified.",
      "",
      "## Ownership",
      `- Decision owner: ${elements.owner.value.trim() || "Not assigned"}`,
      `- Review date: ${elements.review.value || "Not scheduled"}`,
      "",
      "---",
      "Generated with the experimental Technology as… decision instrument. This brief is a prompt for accountable human judgment, not an automated verdict."
    );

    return lines.join("\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = text;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand("copy");
      temporary.remove();
      return copied;
    }
  }

  function slugify(value) {
    return normalize(value).replace(/\s+/g, "-").slice(0, 54) || "technology-decision";
  }

  function persist() {
    try {
      const payload = {
        form: getInput(),
        hasRun: Boolean(state.currentResults.length),
        selected: [...state.selected],
        notes: state.notes,
        canvas: {
          change: elements.change.value,
          test: elements.test.value,
          owner: elements.owner.value,
          review: elements.review.value
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Decision instrument state could not be saved.", error);
    }
  }

  function restoreForm(saved) {
    if (!saved?.form) return;
    elements.system.value = saved.form.system || "";
    elements.decision.value = saved.form.decision || "";
    elements.stakeholders.value = saved.form.stakeholders || "";
    elements.constraints.value = saved.form.constraints || "";
    const domains = new Set(saved.form.domains || []);
    elements.form.querySelectorAll('input[name="domain"]').forEach((input) => { input.checked = domains.has(input.value); });
    elements.change.value = saved.canvas?.change || "";
    elements.test.value = saved.canvas?.test || "";
    elements.owner.value = saved.canvas?.owner || "";
    elements.review.value = saved.canvas?.review || "";
  }

  async function restore() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      saved = null;
    }
    if (!saved) return;
    restoreForm(saved);
    if (!saved.hasRun || !saved.form?.system || !saved.form?.decision) return;

    await runAnalysis(saved.form, { scroll: false });
    const available = new Set(state.currentResults.map((result) => result.lens.id));
    const restoredSelected = new Set((saved.selected || []).filter((id) => available.has(id)).slice(0, MAX_SELECTED));
    if (restoredSelected.size) state.selected = restoredSelected;
    state.notes = saved.notes || {};

    for (const result of state.currentResults) {
      const refs = state.cardElements.get(result.lens.id);
      if (!refs) continue;
      const textareas = refs.card.querySelectorAll(".lens-workspace textarea");
      if (textareas[0]) textareas[0].value = state.notes[result.lens.id]?.reveal || "";
      if (textareas[1]) textareas[1].value = state.notes[result.lens.id]?.action || "";
    }
    syncSelectionUI();
    persist();
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!elements.form.reportValidity()) return;
    runAnalysis(getInput());
  });

  document.querySelectorAll(".example-button").forEach((button) => {
    button.addEventListener("click", () => {
      const example = EXAMPLES[button.dataset.example];
      if (!example) return;
      elements.system.value = example.system;
      elements.decision.value = example.decision;
      elements.stakeholders.value = example.stakeholders;
      elements.constraints.value = example.constraints;
      const selectedDomains = new Set(example.domains);
      elements.form.querySelectorAll('input[name="domain"]').forEach((input) => { input.checked = selectedDomains.has(input.value); });
      elements.form.requestSubmit();
    });
  });

  elements.revise.addEventListener("click", () => {
    document.querySelector("#frame").scrollIntoView({ behavior: "smooth", block: "start" });
    elements.decision.focus({ preventScroll: true });
  });

  [elements.change, elements.test, elements.owner, elements.review].forEach((input) => input.addEventListener("input", persist));

  elements.copyBrief.addEventListener("click", async () => {
    if (!state.selected.size) {
      elements.exportStatus.textContent = "Select at least one lens before copying the brief.";
      return;
    }
    const copied = await copyText(buildMarkdown());
    elements.exportStatus.textContent = copied ? "Decision brief copied to the clipboard." : "Copy was blocked by the browser. Use Download Markdown instead.";
  });

  elements.downloadBrief.addEventListener("click", () => {
    if (!state.selected.size) {
      elements.exportStatus.textContent = "Select at least one lens before downloading the brief.";
      return;
    }
    const blob = new Blob([buildMarkdown()], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${slugify(state.currentInput?.system)}-decision-reflection.md`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    elements.exportStatus.textContent = "Markdown decision brief downloaded.";
  });

  elements.reset.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    elements.form.reset();
    elements.change.value = "";
    elements.test.value = "";
    elements.owner.value = "";
    elements.review.value = "";
    elements.results.hidden = true;
    elements.action.hidden = true;
    state.currentInput = null;
    state.currentResults = [];
    state.selected.clear();
    state.notes = {};
    state.cardElements.clear();
    elements.engineStatus.textContent = "The engine will rank all 100 lenses and deliberately diversify the result.";
    elements.exportStatus.textContent = "";
    document.querySelector("#frame").scrollIntoView({ behavior: "smooth", block: "start" });
    elements.system.focus({ preventScroll: true });
  });

  restore();
})();
