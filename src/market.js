// Client-side filters for the postings list: country, skill and free text.
(() => {
  const cards = [...document.querySelectorAll(".posting")];
  const countryButtons = [...document.querySelectorAll("[data-country]")].filter((el) => el.tagName === "BUTTON");
  const skill = document.getElementById("skill-filter");
  const search = document.getElementById("search");
  const count = document.getElementById("posting-count");
  const empty = document.getElementById("empty");
  const openOnly = document.getElementById("open-only");
  let country = "all";

  function apply() {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const ok =
        (country === "all" || card.dataset.country === country) &&
        (!openOnly.checked || card.dataset.closed === "false") &&
        (!skill.value || card.dataset.skills.split("|").includes(skill.value)) &&
        (!q || card.textContent.toLowerCase().includes(q));
      card.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = count.dataset.template.replace("{n}", shown);
    empty.hidden = shown > 0;
  }

  for (const btn of countryButtons) {
    btn.addEventListener("click", () => {
      country = btn.dataset.country;
      for (const b of countryButtons) b.setAttribute("aria-pressed", String(b === btn));
      apply();
    });
  }
  skill.addEventListener("change", apply);
  openOnly.addEventListener("change", apply);
  search.addEventListener("input", apply);
})();
