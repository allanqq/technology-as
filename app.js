(() => {
  const search = document.querySelector("#lens-search");
  const list = document.querySelector(".lens-index");
  const toolbar = document.querySelector(".results-toolbar");
  const status = toolbar?.querySelector('[role="status"]');
  const sortButtons = Array.from(toolbar?.querySelectorAll(".sort-control button") ?? []);

  if (!search || !list || !toolbar || !status || sortButtons.length !== 2) return;

  const records = Array.from(list.querySelectorAll(":scope > li")).map((element, index) => ({
    element,
    index,
    name: element.querySelector(".record-title")?.textContent?.replace(/^Technology as\s*/i, "").trim() ?? "",
    searchText: element.textContent?.toLocaleLowerCase() ?? "",
  }));

  const reset = document.createElement("button");
  reset.className = "reset-control";
  reset.type = "button";
  reset.textContent = "Reset filters ×";
  reset.hidden = true;
  toolbar.append(reset);

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.setAttribute("role", "status");
  empty.hidden = true;
  empty.innerHTML = '<p class="section-label">No match / 00</p><h3>No lens contains that combination.</h3><p>Try a broader term, or return to the complete field.</p><button type="button">Show all 100 lenses →</button>';
  list.after(empty);

  const parameters = new URLSearchParams(window.location.search);
  let sortMode = parameters.get("sort") === "alphabetical" ? "alphabetical" : "sequence";
  search.value = parameters.get("q") ?? "";

  function updateUrl() {
    const next = new URLSearchParams();
    if (search.value) next.set("q", search.value);
    if (sortMode !== "sequence") next.set("sort", sortMode);
    const query = next.size ? `?${next.toString()}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${query}${window.location.hash}`);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const visible = records.filter((record) => record.searchText.includes(query));
    const ordered = [...visible].sort((a, b) =>
      sortMode === "alphabetical" ? a.name.localeCompare(b.name) : a.index - b.index,
    );

    for (const record of records) record.element.hidden = true;
    for (const record of ordered) {
      record.element.hidden = false;
      list.append(record.element);
    }

    status.innerHTML = `<strong>${ordered.length}</strong> ${ordered.length === 1 ? "lens" : "lenses"}`;
    sortButtons[0].setAttribute("aria-pressed", String(sortMode === "sequence"));
    sortButtons[1].setAttribute("aria-pressed", String(sortMode === "alphabetical"));
    reset.hidden = !search.value;
    list.hidden = ordered.length === 0;
    empty.hidden = ordered.length !== 0;
    updateUrl();
  }

  search.addEventListener("input", render);
  sortButtons[0].addEventListener("click", () => {
    sortMode = "sequence";
    render();
  });
  sortButtons[1].addEventListener("click", () => {
    sortMode = "alphabetical";
    render();
  });
  reset.addEventListener("click", () => {
    search.value = "";
    render();
    search.focus();
  });
  empty.querySelector("button")?.addEventListener("click", () => {
    search.value = "";
    render();
    search.focus();
  });

  render();
})();
