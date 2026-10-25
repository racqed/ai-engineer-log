// Client-side filters for the community page: topic and post language.
(() => {
  const cards = [...document.querySelectorAll(".cpost")];
  const topicButtons = [...document.querySelectorAll("button[data-topic]")];
  const langButtons = [...document.querySelectorAll("button[data-lang]")];
  const count = document.getElementById("post-count");
  const empty = document.getElementById("empty");
  let topic = "all";
  let lang = "all";

  function apply() {
    let shown = 0;
    for (const card of cards) {
      const ok = (topic === "all" || card.dataset.topic === topic) && (lang === "all" || card.dataset.lang === lang);
      card.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = `${count.dataset.en.replace("{n}", shown)} · ${count.dataset.ko.replace("{n}", shown)}`;
    empty.hidden = shown > 0;
  }

  function group(buttons, key, set) {
    for (const btn of buttons) {
      btn.addEventListener("click", () => {
        set(btn.dataset[key]);
        for (const b of buttons) b.setAttribute("aria-pressed", String(b === btn));
        apply();
      });
    }
  }
  group(topicButtons, "topic", (v) => (topic = v));
  group(langButtons, "lang", (v) => (lang = v));
})();
