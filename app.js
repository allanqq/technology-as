(() => {
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "./upgrade.css";
  document.head.append(style);

  const search = document.querySelector("#lens-search");
  const list = document.querySelector(".lens-index");
  const toolbar = document.querySelector(".results-toolbar");
  const status = toolbar?.querySelector('[role="status"]');
  const sortButtons = Array.from(toolbar?.querySelectorAll(".sort-control button") ?? []);
  if (!search || !list || !toolbar || !status || sortButtons.length !== 2) return;

  const records = Array.from(list.querySelectorAll(":scope > li")).map((element, index) => ({
    element, index,
    name: element.querySelector(".record-title")?.textContent?.replace(/^Technology as\s*/i, "").trim() ?? "",
    searchText: element.textContent?.toLocaleLowerCase() ?? "",
  }));

  const reset = document.createElement("button");
  reset.className = "reset-control"; reset.type = "button"; reset.textContent = "Reset ×"; reset.hidden = true;
  toolbar.append(reset);
  const empty = document.createElement("div");
  empty.className = "empty-state"; empty.setAttribute("role", "status"); empty.hidden = true;
  empty.innerHTML = '<p class="section-label">No match / 00</p><h3>No lens contains that combination.</h3><p>Try a broader term, or return to the complete field.</p><button type="button">Show all 100 lenses →</button>';
  list.after(empty);

  const parameters = new URLSearchParams(window.location.search);
  let sortMode = parameters.get("sort") === "alphabetical" ? "alphabetical" : "sequence";
  search.value = parameters.get("q") ?? "";
  search.placeholder = "Try “power”, “labor”, or “agency”";

  document.querySelector(".header-note")?.replaceChildren("A field guide for reflective technologists");
  const intro = document.querySelector(".orientation-copy p");
  if (intro) intro.innerHTML = "100 lenses for turning philosophy of technology into <strong>better technical judgment.</strong>";

  function updateUrl() {
    const next = new URLSearchParams();
    if (search.value) next.set("q", search.value);
    if (sortMode !== "sequence") next.set("sort", sortMode);
    window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}${window.location.hash}`);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const ordered = records.filter(r => r.searchText.includes(query)).sort((a,b) => sortMode === "alphabetical" ? a.name.localeCompare(b.name) : a.index-b.index);
    records.forEach(r => r.element.hidden = true);
    ordered.forEach(r => { r.element.hidden = false; list.append(r.element); });
    status.innerHTML = `<strong>${ordered.length}</strong> ${ordered.length === 1 ? "lens" : "lenses"}`;
    sortButtons[0].setAttribute("aria-pressed", String(sortMode === "sequence"));
    sortButtons[1].setAttribute("aria-pressed", String(sortMode === "alphabetical"));
    reset.hidden = !search.value; list.hidden = !ordered.length; empty.hidden = !!ordered.length; updateUrl();
  }

  records.forEach(record => {
    const body = record.element.querySelector(".record-body");
    const interpretation = record.element.querySelector(".record-interpretation > p:last-child")?.textContent?.trim();
    const catalyst = record.element.querySelector(".record-catalyst > p:last-child")?.textContent?.trim();
    if (!body || !interpretation || !catalyst) return;
    const practice = document.createElement("section"); practice.className = "record-practice";
    practice.innerHTML = `<div class="practice-heading"><p class="content-label">From reflection to practice</p><p>Use this lens on a decision you are making now.</p></div><div class="practice-grid"><div><span>01 / System</span><p>Name the product, model, interface, metric, workflow, or infrastructure.</p></div><div><span>02 / Embedded choice</span><p>Where is a human judgment becoming code, a default, data, an incentive, or architecture?</p></div><div><span>03 / Critical lens</span><p>${catalyst}</p></div><div><span>04 / Intervention</span><p>What design, engineering, governance, measurement, or deployment choice should change?</p></div></div>`;
    body.after(practice);
    const actions = document.createElement("div"); actions.className = "record-actions";
    actions.innerHTML = '<button type="button">Copy prompt</button><a href="#">Link to lens ↗</a>'; practice.after(actions);
    actions.querySelector("a").href = `${window.location.pathname}${window.location.search}#${record.element.id}`;
    actions.querySelector("button").addEventListener("click", async e => {
      const prompt = `TECHNOLOGY AS ${record.name.toUpperCase()}\n\nInterpretation\n${interpretation}\n\nCritical catalyst\n${catalyst}\n\nApply this lens to a technical decision:\n1. Name the system.\n2. Where is human judgment embedded into code, defaults, data, incentives, or architecture?\n3. ${catalyst}\n4. What concrete technical or governance choice should change?`;
      try { await navigator.clipboard.writeText(prompt); e.currentTarget.textContent = "Copied ✓"; setTimeout(() => e.currentTarget.textContent = "Copy prompt", 1500); } catch { e.currentTarget.textContent = "Copy unavailable"; }
    });
  });

  search.addEventListener("input", render);
  sortButtons[0].addEventListener("click", () => { sortMode="sequence"; render(); });
  sortButtons[1].addEventListener("click", () => { sortMode="alphabetical"; render(); });
  reset.addEventListener("click", () => { search.value=""; render(); search.focus(); });
  empty.querySelector("button")?.addEventListener("click", () => { search.value=""; render(); search.focus(); });
  if (window.location.hash.startsWith("#lens-")) document.querySelector(window.location.hash)?.querySelector("details")?.setAttribute("open", "");
  render();
})();