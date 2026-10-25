// Renders content/*.json into static HTML in dist/. No framework: each page is
// a function that returns a string, and layout() wraps it.
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent, root, SOURCE_CATEGORIES, STATUSES } from "./content.mjs";

const out = join(root, "dist");
const { profile, market, reading, roadmap, log } = loadContent();

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Small, safe subset of Markdown for log bodies and notes: escape first, then
// allow **bold**, `code`, [label](https://...) and links to this site's own
// pages ([label](market.html#id)). Blank lines split paragraphs.
function md(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((para) => {
      const html = esc(para.trim())
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+|[a-z0-9-]+\.html(?:#[\w-]+)?)\)/g, '<a href="$2">$1</a>');
      return html.startsWith("- ")
        ? `<ul>${html.split(/\n/).map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("")}</ul>`
        : `<p>${html.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d) {
  const [y, m, day] = String(d).split("-");
  if (!m) return y;
  return day ? `${Number(day)} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}

const sourceById = new Map((reading.sources ?? []).map((s) => [s.id, s]));
const cites = (ids = []) =>
  ids.length
    ? `<span class="cites">${ids
        .filter((id) => sourceById.has(id))
        .map((id) => `<a href="reading.html#${esc(id)}" title="${esc(sourceById.get(id).title)}">${esc(id)}</a>`)
        .join("")}</span>`
    : "";

const tasks = roadmap.tasks ?? [];
const countBy = (status) => tasks.filter((t) => t.status === status).length;
const progress = tasks.length ? Math.round((countBy("done") / tasks.length) * 100) : 0;
const STATUS_LABEL = { todo: "To do", doing: "In progress", done: "Done" };

// Counted from posting tags so the chart can never disagree with the postings.
const skillFrequency = (market.skills ?? []).map((s) => ({
  ...s,
  count: (market.postings ?? []).filter((p) => p.skills.includes(s.skill)).length,
}));

function skillBars(items, limit = items.length) {
  const total = (market.postings ?? []).length || 1;
  const rows = [...items].sort((a, b) => b.count - a.count).slice(0, limit);
  return `<ol class="bars">${rows
    .map(
      (s) => `<li>
        <span class="bar-label">${esc(s.skill)}</span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${((s.count / total) * 100).toFixed(1)}%"></span></span>
        <span class="bar-value">${s.count}<span class="muted">/${total}</span></span>
        ${s.note ? `<span class="bar-note">${esc(s.note)}</span>` : ""}
      </li>`
    )
    .join("")}</ol>`;
}

function logEntry(e) {
  return `<article class="entry" id="${esc(e.date)}-${esc(slug(e.title))}">
    <time datetime="${esc(e.date)}">${fmtDate(e.date)}</time>
    <div>
      <h3>${esc(e.title)}</h3>
      <div class="prose">${md(e.body)}</div>
      ${(e.tags ?? []).length ? `<p class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</p>` : ""}
      ${(e.links ?? []).length ? `<p class="links">${e.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)} ↗</a>`).join("")}</p>` : ""}
    </div>
  </article>`;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

// ---------- layout ----------

const NAV = [
  ["index.html", "Overview"],
  ["market.html", "Market"],
  ["reading.html", "Reading"],
  ["roadmap.html", "Roadmap"],
  ["log.html", "Log"],
  ["built.html", "How it's built"],
];

function layout({ file, title, description, body, scripts = "" }) {
  const fullTitle = file === "index.html" ? profile.siteTitle : `${title} · ${profile.siteTitle}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#14322e">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2314322e'/%3E%3Cpath d='M9 22l5-12 5 12M11 18h6M22 10v12' stroke='%23f2b33d' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">AE</span><span>${esc(profile.siteTitle)}</span></a>
    <nav aria-label="Main">
      <ul>${NAV.map(([href, label]) => `<li><a href="${href}"${href === file ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}</ul>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>Kept by ${esc(profile.name)} · ${esc(profile.location)} · Content updated ${fmtDate(profile.updated)}</p>
    <p>${(profile.links ?? []).map((l) => `<a href="${esc(l.url)}">${esc(l.label)}</a>`).join(" · ")}</p>
  </div>
</footer>
${scripts}
</body>
</html>
`;
}

// ---------- pages ----------

const pages = {};

pages["index.html"] = () => {
  const doing = tasks.filter((t) => t.status === "doing");
  const next = tasks.filter((t) => t.status === "todo").slice(0, Math.max(0, 3 - doing.length));
  const now = [...doing, ...next];
  return layout({
    file: "index.html",
    title: "Overview",
    description: profile.headline,
    body: `
<section class="hero">
  <p class="eyebrow">${esc(profile.eyebrow)}</p>
  <h1>${esc(profile.headline)}</h1>
  <p class="lede">${esc(profile.thesis)}</p>
  <div class="hero-actions">
    <a class="button" href="roadmap.html">See the roadmap</a>
    <a class="button ghost" href="market.html">What employers ask for</a>
  </div>
</section>

<section class="stats" aria-label="At a glance">
  <a class="stat" href="market.html"><strong>${(market.postings ?? []).length}</strong><span>job postings analysed (UK and US)</span></a>
  <a class="stat" href="reading.html"><strong>${(reading.sources ?? []).length}</strong><span>articles, reports and guides</span></a>
  <a class="stat" href="roadmap.html"><strong>${progress}%</strong><span>of the roadmap done (${countBy("done")}/${tasks.length})</span></a>
  <a class="stat" href="log.html"><strong>${(log.entries ?? []).length}</strong><span>work log entries</span></a>
</section>

<div class="grid-2">
  <section class="panel">
    <h2>Working on now</h2>
    <ul class="task-list compact">${now.map(taskItem).join("")}</ul>
    <p><a href="roadmap.html">Full roadmap →</a></p>
  </section>
  <section class="panel">
    <h2>Most requested skills</h2>
    <p class="muted small">Share of the ${(market.postings ?? []).length} postings that mention each skill.</p>
    ${skillBars(skillFrequency, 7)}
    <p><a href="market.html">All postings →</a></p>
  </section>
</div>

<section class="panel">
  <h2>Why this site exists</h2>
  <div class="prose">${md((profile.about ?? []).join("\n\n"))}</div>
</section>

<section>
  <div class="section-head"><h2>Latest from the log</h2><a href="log.html">All entries →</a></div>
  <div class="entries">${(log.entries ?? []).slice(0, 3).map(logEntry).join("")}</div>
</section>`,
  });
};

function taskItem(t) {
  return `<li class="task status-${t.status}" id="${esc(t.id)}">
    <span class="chip chip-${t.status}">${STATUS_LABEL[t.status]}</span>
    <div>
      <h3>${esc(t.title)}</h3>
      ${t.why ? `<p class="muted">${esc(t.why)}</p>` : ""}
      <p class="deliverable"><span>Proof of work</span> ${esc(t.deliverable)}</p>
      ${t.status === "done" ? `<p class="small">Done ${fmtDate(t.done)}${t.evidence ? ` · <a href="${esc(t.evidence)}">evidence ↗</a>` : ""}</p>` : ""}
      ${cites(t.sourceIds)}
    </div>
  </li>`;
}

pages["market.html"] = () => {
  const postings = [...(market.postings ?? [])].sort((a, b) => (a.country === b.country ? 0 : a.country === "UK" ? -1 : 1));
  const allSkills = [...new Set(postings.flatMap((p) => p.skills))].sort((a, b) => a.localeCompare(b));
  return layout({
    file: "market.html",
    title: "Market",
    description: "What UK and US employers ask of AI engineers, from real job postings.",
    body: `
<section class="page-head">
  <p class="eyebrow">Market research · updated ${fmtDate(market.updated)}</p>
  <h1>What employers actually ask for</h1>
  <p class="lede">${esc(market.intro)}</p>
</section>

${(market.takeaways ?? []).length ? `<section class="panel takeaways"><h2>What this means for me</h2><ol>${market.takeaways.map((t) => `<li>${md(t).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ol></section>` : ""}

<div class="grid-2">
  <section class="panel">
    <h2>Recurring requirements</h2>
    <p class="muted small">How many of the ${postings.length} postings mention each skill.</p>
    ${skillBars(skillFrequency.filter((s) => s.count > 0))}
  </section>
  <section class="panel">
    <h2>UK and US: what differs</h2>
    <ul class="dots">${(market.ukVsUs ?? []).map((x) => `<li>${md(x).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ul>
  </section>
</div>

<section>
  <div class="section-head"><h2>Postings</h2><p class="muted small" id="posting-count" aria-live="polite">${postings.length} shown</p></div>
  <form class="filters" id="filters" role="search" onsubmit="return false">
    <div class="segmented" role="group" aria-label="Country">
      <button type="button" data-country="all" aria-pressed="true">All</button>
      <button type="button" data-country="UK" aria-pressed="false">UK</button>
      <button type="button" data-country="US" aria-pressed="false">US</button>
    </div>
    <label class="field"><span class="sr-only">Skill</span>
      <select id="skill-filter"><option value="">Any skill</option>${allSkills.map((s) => `<option>${esc(s)}</option>`).join("")}</select>
    </label>
    <label class="field grow"><span class="sr-only">Search postings</span>
      <input id="search" type="search" placeholder="Search title, company or requirement">
    </label>
    <label class="check"><input id="open-only" type="checkbox"> Open only</label>
  </form>
  <div class="postings" id="postings">
    ${postings
      .map(
        (p) => `<article class="posting" data-country="${esc(p.country)}" data-closed="${p.closed}" data-skills="${esc(p.skills.join("|"))}">
      <div class="posting-top">
        <span class="flag flag-${esc(p.country)}">${esc(p.country)}</span>
        ${p.closed ? `<span class="closed">Closed</span>` : ""}
        <span class="muted small">${esc(p.location)}${p.workMode ? ` · ${esc(p.workMode)}` : ""} · ${fmtDate(p.seenDate)}</span>
      </div>
      <h3><a href="${esc(p.url)}">${esc(p.title)}</a></h3>
      <p class="company">${esc(p.company)}${p.salary ? ` · <span class="salary">${esc(p.salary)}</span>` : ""}</p>
      <p>${esc(p.summary)}</p>
      ${(p.agenticSignals ?? []).length ? `<details><summary>From the posting</summary><ul>${p.agenticSignals.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></details>` : ""}
      <p class="tags">${p.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</p>
    </article>`
      )
      .join("")}
  </div>
  <p class="empty" id="empty" hidden>No postings match those filters.</p>
</section>

${(market.caveats ?? []).length ? `<section class="note"><h2>Caveats</h2><ul class="dots">${market.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}`,
    scripts: `<script src="market.js" defer></script>`,
  });
};

pages["reading.html"] = () => {
  const groups = Object.entries(SOURCE_CATEGORIES)
    .map(([key, label]) => [label, (reading.sources ?? []).filter((s) => s.category === key)])
    .filter(([, items]) => items.length);
  return layout({
    file: "reading.html",
    title: "Reading",
    description: "Articles, reports and guides on AI engineering and agentic coding, with what each one says.",
    body: `
<section class="page-head">
  <p class="eyebrow">Reading list · ${(reading.sources ?? []).length} sources</p>
  <h1>What the evidence says</h1>
  <p class="lede">${esc(reading.intro)}</p>
</section>

<section>
  <h2>Themes</h2>
  <div class="themes">${(reading.themes ?? [])
    .map((t, i) => `<article class="theme"><span class="theme-num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(t.theme)}</h3><p>${esc(t.evidence)}</p>${cites(t.sourceIds)}</article>`)
    .join("")}</div>
</section>

${groups
  .map(
    ([label, items]) => `<section>
  <h2>${esc(label)}</h2>
  <div class="sources">${items
    .map(
      (s) => `<article class="source" id="${esc(s.id)}">
      <p class="muted small"><span class="source-id">${esc(s.id)}</span> ${esc(s.publisher)}${s.author ? ` · ${esc(s.author)}` : ""} · ${fmtDate(s.date)}${s.region ? ` · ${esc(s.region)}` : ""}</p>
      <h3><a href="${esc(s.url)}">${esc(s.title)}</a></h3>
      <ul class="dots">${s.keyPoints.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
    </article>`
    )
    .join("")}</div>
</section>`
  )
  .join("")}

${(reading.caveats ?? []).length ? `<section class="note"><h2>Caveats</h2><ul class="dots">${reading.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>` : ""}`,
  });
};

pages["roadmap.html"] = () =>
  layout({
    file: "roadmap.html",
    title: "Roadmap",
    description: "A six-month plan from applied data science to AI engineering, with a proof-of-work deliverable for each step.",
    body: `
<section class="page-head">
  <p class="eyebrow">Roadmap · ${countBy("done")} of ${tasks.length} done</p>
  <h1>The plan, and how far along it is</h1>
  <p class="lede">${esc(roadmap.intro)}</p>
  <div class="progress" role="img" aria-label="${progress}% of roadmap tasks done">
    ${["done", "doing", "todo"].map((s) => `<span class="progress-${s}" style="flex:${countBy(s)}"></span>`).join("")}
  </div>
  <p class="legend small">${STATUSES.map((s) => `<span><i class="dot dot-${s}"></i>${STATUS_LABEL[s]} ${countBy(s)}</span>`).join("")}</p>
</section>

${(roadmap.phases ?? [])
  .map((ph) => {
    const items = tasks.filter((t) => t.phase === ph.id);
    return `<section class="phase">
  <div class="phase-head">
    <p class="eyebrow">${esc(ph.window)}</p>
    <h2>${esc(ph.title)}</h2>
    ${ph.goal ? `<p class="muted">${esc(ph.goal)}</p>` : ""}
  </div>
  <ul class="task-list">${items.map(taskItem).join("")}</ul>
</section>`;
  })
  .join("")}`,
  });

pages["log.html"] = () =>
  layout({
    file: "log.html",
    title: "Log",
    description: "A dated journal of what I have done on the way to AI engineering.",
    body: `
<section class="page-head">
  <p class="eyebrow">Work log · ${(log.entries ?? []).length} entries</p>
  <h1>What I've done</h1>
  <p class="lede">${esc(log.intro)}</p>
</section>
<div class="entries">${(log.entries ?? []).map(logEntry).join("")}</div>`,
  });

pages["built.html"] = () =>
  layout({
    file: "built.html",
    title: "How it's built",
    description: "How this site is built and maintained with coding agents.",
    body: `
<section class="page-head">
  <p class="eyebrow">Colophon</p>
  <h1>How this site is built</h1>
  <p class="lede">${esc(profile.built?.intro)}</p>
</section>
${(profile.built?.sections ?? []).map((s) => `<section class="panel"><h2>${esc(s.heading)}</h2><div class="prose">${md(s.body)}</div></section>`).join("")}`,
  });

pages["404.html"] = () =>
  layout({
    file: "404.html",
    title: "Not found",
    description: "Page not found.",
    body: `<section class="page-head"><h1>That page isn't here</h1><p class="lede"><a href="index.html">Back to the overview</a></p></section>`,
  });

// ---------- write ----------

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// Cloudflare serves pages at clean URLs (/market) and 404s on /market.html, so
// internal links are written as file names above and rewritten here.
const cleanLinks = (html) =>
  html.replace(/href="index\.html/g, 'href="/').replace(/href="([a-z0-9-]+)\.html/g, 'href="/$1');
for (const [file, render] of Object.entries(pages)) writeFileSync(join(out, file), cleanLinks(render()));
for (const asset of ["styles.css", "market.js"]) copyFileSync(join(root, "src", asset), join(out, asset));
writeFileSync(join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log(`Built ${Object.keys(pages).length} pages into dist/`);
