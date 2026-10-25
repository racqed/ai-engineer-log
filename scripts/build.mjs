// Renders content/*.json into static HTML in dist/. No framework: each page is
// a function that returns a string, and layout() wraps it.
//
// The site is built twice, like the mentoring site: Korean at / and English at
// /en/. Content text comes from <field> and <field>Ko pairs (enforced by
// check.mjs); interface text comes from [english, korean] pairs in the UI table.
// L picks the language for the pass being rendered.
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { loadContent, root, SOURCE_CATEGORIES, STATUSES, TOPICS } from "./content.mjs";

const out = join(root, "dist");
const { profile, market, reading, roadmap, log, community } = loadContent();
const SITE = "https://ai-engineer-log.latteboo99.workers.dev";
let L = 1; // 1 = Korean (/), 0 = English (/en/)

// ---------- interface text ----------

const UI = {
  siteTitle: [profile.siteTitle, "AI 엔지니어 로그"],
  skip: ["Skip to content", "본문으로 건너뛰기"],
  overview: ["Overview", "개요"],
  market: ["Market", "시장 조사"],
  reading: ["Reading", "자료"],
  roadmap: ["Roadmap", "로드맵"],
  log: ["Log", "기록"],
  community: ["Community", "커뮤니티"],
  communityEyebrow: (n) => [`Community notes · ${n} Threads posts`, `커뮤니티 노트 · Threads 글 ${n}개`],
  communityTitle: ["What practitioners are saying", "실무자들이 말하는 것"],
  allTopics: ["All topics", "모든 주제"],
  allLangs: ["All languages", "모든 언어"],
  switchTo: ["한국어", "EN"],
  mainNav: ["Main", "주요 메뉴"],
  atAGlance: ["At a glance", "한눈에 보기"],
  koPosts: ["Korean posts", "한국어 글"],
  enPosts: ["English posts", "영어 글"],
  tip: ["Try this", "실천 팁"],
  viaSnippet: ["Read from a search snippet", "검색 결과 요약으로 확인"],
  posts: ["Posts", "글"],
  viaLinkedIn: ["via LinkedIn", "LinkedIn 공고"],
  linkedinNotes: ["What the LinkedIn postings add", "LinkedIn 공고에서 본 패턴"],
  built: ["How it's built", "제작 방식"],
  mentoringNav: ["Mentoring", "멘토링"],
  seeRoadmap: ["See the roadmap", "로드맵 보기"],
  whatEmployers: ["What employers ask for", "기업이 원하는 것"],
  statPostings: ["job postings analysed (UK and US)", "분석한 채용 공고 (영국·미국)"],
  statSources: ["articles, reports and guides", "기사·보고서·가이드"],
  statRoadmap: ["of the roadmap done", "로드맵 완료율"],
  statLog: ["work log entries", "작업 기록"],
  workingNow: ["Working on now", "지금 하고 있는 일"],
  fullRoadmap: ["Full roadmap", "전체 로드맵"],
  topSkills: ["Most requested skills", "가장 많이 요구되는 스킬"],
  shareOf: (n) => [`Share of the ${n} postings that mention each skill.`, `공고 ${n}개 중 각 스킬을 언급한 비율입니다.`],
  allPostings: ["All postings", "전체 공고"],
  whyExists: ["Why this site exists", "이 사이트를 만든 이유"],
  latestLog: ["Latest from the log", "최근 기록"],
  allEntries: ["All entries", "전체 기록"],
  proof: ["Proof of work", "증빙 결과물"],
  doneOn: (d) => [`Done ${fmtDateEn(d)}`, `${fmtDateKo(d)} 완료`],
  evidence: ["evidence", "증빙"],
  marketEyebrow: (d) => [`Market research · updated ${fmtDateEn(d)}`, `시장 조사 · ${fmtDateKo(d)} 업데이트`],
  marketTitle: ["What employers actually ask for", "기업이 실제로 요구하는 것"],
  meaning: ["What this means for me", "나에게 주는 의미"],
  recurring: ["Recurring requirements", "반복해서 나오는 요구 사항"],
  howMany: (n) => [`How many of the ${n} postings mention each skill.`, `공고 ${n}개 중 각 스킬을 언급한 공고 수입니다.`],
  ukVsUs: ["UK and US: what differs", "영국과 미국의 차이"],
  postings: ["Postings", "채용 공고"],
  shown: (n) => [`${n} shown`, `${n}개 표시`],
  all: ["All", "전체"],
  uk: ["UK", "영국"],
  us: ["US", "미국"],
  anySkill: ["Any skill", "모든 스킬"],
  search: ["Search title, company or requirement", "직함·회사·요구 사항 검색"],
  openOnly: ["Open only", "모집 중만"],
  closed: ["Closed", "마감"],
  fromPosting: ["From the posting (original English)", "공고 원문 (영어)"],
  noMatch: ["No postings match those filters.", "조건에 맞는 공고가 없습니다."],
  caveats: ["Caveats", "유의 사항"],
  readingEyebrow: (n) => [`Reading list · ${n} sources`, `자료 목록 · 출처 ${n}개`],
  readingTitle: ["What the evidence says", "근거가 말해 주는 것"],
  themes: ["Themes", "핵심 흐름"],
  roadmapEyebrow: (d, n) => [`Roadmap · ${d} of ${n} done`, `로드맵 · ${n}개 중 ${d}개 완료`],
  roadmapTitle: ["The plan, and how far along it is", "계획과 진행 상황"],
  logEyebrow: (n) => [`Work log · ${n} entries`, `작업 기록 · ${n}개`],
  logTitle: ["What I've done", "지금까지 한 일"],
  builtEyebrow: ["Colophon", "제작 노트"],
  builtTitle: ["How this site is built", "이 사이트를 만든 방식"],
  notFound: ["That page isn't here", "페이지를 찾을 수 없습니다"],
  backHome: ["Back to the overview", "개요로 돌아가기"],
  keptBy: (d) => [
    `Kept by ${profile.name} · ${profile.location} · Content updated ${fmtDateEn(d)}`,
    `${profile.name} 운영 · 영국 에든버러 · ${fmtDateKo(d)} 업데이트`,
  ],
};
const STATUS_LABEL = { todo: ["To do", "할 일"], doing: ["In progress", "진행 중"], done: ["Done", "완료"] };

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Small, safe subset of Markdown: escape first, then allow **bold**, `code`,
// [label](https://...) and links to this site's own pages ([label](market.html#id)).
// Blank lines split paragraphs; a paragraph starting with "- " is a list.
function md(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((para) => {
      const html = inline(para.trim());
      return html.startsWith("- ")
        ? `<ul>${html.split(/\n/).map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("")}</ul>`
        : `<p>${html.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}
const inline = (text) =>
  esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+|[a-z0-9-]+\.html(?:#[\w-]+)?)\)/g, '<a href="$2">$1</a>');

// Language-picking building blocks: a pair is [english, korean].
const pick = (en, k) => (L ? k : en);
const txt = (pair) => esc(pair[L]);
const heading = (tag, pair, attrs = "") => `<${tag}${attrs}>${txt(pair)}</${tag}>`;
const paras = (en, k, cls = "") => `<p${cls ? ` class="${cls}"` : ""}>${inline(pick(en, k))}</p>`;
const prose = (en, k) => `<div class="prose">${md(pick(en, k))}</div>`;
const listItems = (en = [], k = []) => pick(en, k).map((item) => `<li>${inline(item)}</li>`).join("");
const pairOf = (obj, field) => [obj?.[field], obj?.[`${field}Ko`]];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDateEn(d) {
  const [y, m, day] = String(d).split("-");
  if (!m) return y;
  return day ? `${Number(day)} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}
function fmtDateKo(d) {
  const [y, m, day] = String(d).split("-");
  return [`${y}년`, m && `${Number(m)}월`, day && `${Number(day)}일`].filter(Boolean).join(" ");
}
const fmtDate = (d) => (L ? fmtDateKo(d) : fmtDateEn(d));

const sourceById = new Map((reading.sources ?? []).map((s) => [s.id, s]));
const cites = (ids = []) =>
  ids.length
    ? `<span class="cites">${ids
        .filter((id) => sourceById.has(id))
        .map((id) => `<a href="reading.html#${esc(id)}" title="${esc(sourceById.get(id).title)}">${esc(id)}</a>`)
        .join("")}</span>`
    : "";

const linkList = (links = []) =>
  links.map((l) => `<a href="${esc(l.url)}">${esc(L && l.labelKo ? l.labelKo : l.label)} ↗</a>`).join("");

const tasks = roadmap.tasks ?? [];
const countBy = (status) => tasks.filter((t) => t.status === status).length;
const progress = tasks.length ? Math.round((countBy("done") / tasks.length) * 100) : 0;

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
        <span class="bar-label">${esc(L && s.skillKo ? s.skillKo : s.skill)}</span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${((s.count / total) * 100).toFixed(1)}%"></span></span>
        <span class="bar-value">${s.count}<span class="muted">/${total}</span></span>
        ${s.note ? `<span class="bar-note">${esc(pick(s.note, s.noteKo))}</span>` : ""}
      </li>`
    )
    .join("")}</ol>`;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

function logEntry(e) {
  return `<article class="entry" id="${esc(e.date)}-${esc(slug(e.title))}">
    <time datetime="${esc(e.date)}">${fmtDate(e.date)}</time>
    <div>
      ${heading("h3", pairOf(e, "title"))}
      ${prose(e.body, e.bodyKo)}
      ${(e.tags ?? []).length ? `<p class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</p>` : ""}
      ${(e.links ?? []).length ? `<p class="links">${linkList(e.links)}</p>` : ""}
    </div>
  </article>`;
}

function taskItem(t) {
  return `<li class="task status-${t.status}" id="${esc(t.id)}">
    <span class="chip chip-${t.status}">${txt(STATUS_LABEL[t.status])}</span>
    <div>
      ${heading("h3", pairOf(t, "title"))}
      ${t.why ? paras(t.why, t.whyKo, "muted") : ""}
      <div class="deliverable"><span class="label">${txt(UI.proof)}</span>${paras(t.deliverable, t.deliverableKo)}</div>
      ${t.status === "done" ? `<p class="small">${txt(UI.doneOn(t.done))}${t.evidence ? ` · <a href="${esc(t.evidence)}">${txt(UI.evidence)} ↗</a>` : ""}</p>` : ""}
      ${cites(t.sourceIds)}
    </div>
  </li>`;
}

const more = (href, pair) => `<p class="more"><a href="${href}">${txt(pair)} →</a></p>`;
// The mentoring site is the main site; these blocks point readers back to it.
const M = profile.mentoring;
const mentoringBand = () => `<section class="mentoring-band">
  <div>
    ${heading("h2", pairOf(M, "heading"))}
    ${paras(M.body, M.bodyKo)}
  </div>
  <div class="mentoring-actions">
    <a class="button accent" href="${esc(M.sessionsUrl)}">${txt(pairOf(M, "cta"))} ↗</a>
    <a class="button ghost" href="${esc(pick(M.urlEn, M.url))}">${txt(pairOf(M, "site"))} ↗</a>
  </div>
</section>`;
const mentoringNote = (field) => `<aside class="mentoring-note">
  <div>${paras(M[field], M[`${field}Ko`])}</div>
  <a class="button accent" href="${esc(M.sessionsUrl)}">${txt(pairOf(M, "cta"))} ↗</a>
</aside>`;

const caveatsSection = (obj) =>
  (obj.caveats ?? []).length ? `<section class="note">${heading("h2", UI.caveats)}<ul class="dots">${listItems(obj.caveats, obj.caveatsKo)}</ul></section>` : "";

function pageHead(eyebrow, title, ledeEn, ledeKo, extra = "") {
  return `<section class="page-head">
  <p class="eyebrow">${txt(eyebrow)}</p>
  ${heading("h1", title)}
  ${paras(ledeEn, ledeKo, "lede")}
  ${extra}
</section>`;
}

// ---------- layout ----------

const NAV = [
  ["index.html", UI.overview],
  ["market.html", UI.market],
  ["reading.html", UI.reading],
  ["roadmap.html", UI.roadmap],
  ["log.html", UI.log],
  ["community.html", UI.community],
  ["built.html", UI.built],
];

// Where a page lives in each language: Korean at /, English at /en/.
const pagePath = (lang, file) =>
  (lang ? "/" : "/en/") + (file === "index.html" || file === "404.html" ? "" : file.replace(/\.html$/, ""));
const FONTS = [
  "family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500",
  "family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@600",
];

function layout({ file, title, description, body, scripts = "" }) {
  const fullTitle = file === "index.html" ? txt(UI.siteTitle) : `${txt(title)} | ${txt(UI.siteTitle)}`;
  const desc = esc(description[L]);
  const alternates = file === "404.html" ? "" : `
<link rel="alternate" hreflang="ko" href="${SITE}${pagePath(1, file)}">
<link rel="alternate" hreflang="en" href="${SITE}${pagePath(0, file)}">
<link rel="alternate" hreflang="x-default" href="${SITE}${pagePath(1, file)}">`;
  return `<!doctype html>
<html lang="${L ? "ko" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${L ? "ko_KR" : "en_GB"}">
<meta property="og:locale:alternate" content="${L ? "en_GB" : "ko_KR"}">${alternates}
<meta name="theme-color" content="#14322e">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2314322e'/%3E%3Cpath d='M9 22l5-12 5 12M11 18h6M22 10v12' stroke='%23f2b33d' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${(L ? FONTS : FONTS.slice(0, 1)).join("&")}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip" href="#main">${txt(UI.skip)}</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="index.html"><span class="brand-mark" aria-hidden="true">AE</span><span class="brand-text">${txt(UI.siteTitle)}</span></a>
    <nav aria-label="${txt(UI.mainNav)}">
      <ul>${NAV.map(([href, label]) => `<li><a href="${href}"${href === file ? ' aria-current="page"' : ""}>${txt(label)}</a></li>`).join("")}<li><a class="lang-switch" href="${pagePath(1 - L, file)}" lang="${L ? "en" : "ko"}" hreflang="${L ? "en" : "ko"}">${UI.switchTo[L]}</a></li><li><a class="nav-cta" href="${esc(pick(M.urlEn, M.url))}">${txt(UI.mentoringNav)} ↗</a></li></ul>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <p>${txt(UI.keptBy(profile.updated))}</p>
    <p>${linkList(profile.links)}</p>
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
  const n = (market.postings ?? []).length;
  return layout({
    file: "index.html",
    title: UI.overview,
    description: pairOf(profile, "headline"),
    body: `
<section class="hero">
  <p class="eyebrow">${esc(pick(profile.eyebrow, profile.eyebrowKo))}</p>
  ${heading("h1", pairOf(profile, "headline"))}
  ${paras(profile.thesis, profile.thesisKo, "lede")}
  <div class="hero-actions">
    <a class="button" href="roadmap.html">${txt(UI.seeRoadmap)}</a>
    <a class="button ghost" href="market.html">${txt(UI.whatEmployers)}</a>
  </div>
</section>

<section class="stats" aria-label="${txt(UI.atAGlance)}">
  <a class="stat" href="market.html"><strong>${n}</strong><span>${txt(UI.statPostings)}</span></a>
  <a class="stat" href="reading.html"><strong>${(reading.sources ?? []).length}</strong><span>${txt(UI.statSources)}</span></a>
  <a class="stat" href="roadmap.html"><strong>${progress}%</strong><span>${txt(UI.statRoadmap)} (${countBy("done")}/${tasks.length})</span></a>
  <a class="stat" href="log.html"><strong>${(log.entries ?? []).length}</strong><span>${txt(UI.statLog)}</span></a>
</section>

${mentoringBand()}

<div class="grid-2">
  <section class="panel">
    ${heading("h2", UI.workingNow)}
    <ul class="task-list compact">${[...doing, ...next].map(taskItem).join("")}</ul>
    ${more("roadmap.html", UI.fullRoadmap)}
  </section>
  <section class="panel">
    ${heading("h2", UI.topSkills)}
    ${paras(...UI.shareOf(n), "muted small")}
    ${skillBars(skillFrequency, 7)}
    ${more("market.html", UI.allPostings)}
  </section>
</div>

<section class="panel">
  ${heading("h2", UI.whyExists)}
  ${(profile.about ?? []).map((p, i) => prose(p, profile.aboutKo?.[i])).join("")}
</section>

<section>
  <div class="section-head">${heading("h2", UI.latestLog)}<a href="log.html">${txt(UI.allEntries)} →</a></div>
  <div class="entries">${(log.entries ?? []).slice(0, 3).map(logEntry).join("")}</div>
</section>`,
  });
};

pages["market.html"] = () => {
  const postings = [...(market.postings ?? [])].sort((a, b) => (a.country === b.country ? 0 : a.country === "UK" ? -1 : 1));
  const usedSkills = skillFrequency.filter((s) => s.count > 0);
  const shown = UI.shown(postings.length);
  return layout({
    file: "market.html",
    title: UI.market,
    description: ["What UK and US employers ask of AI engineers, from real job postings.", "실제 채용 공고로 본 영국·미국 기업이 AI 엔지니어에게 요구하는 것."],
    body: `
${pageHead(UI.marketEyebrow(market.updated), UI.marketTitle, market.intro, market.introKo)}

${(market.takeaways ?? []).length ? `<section class="panel takeaways">${heading("h2", UI.meaning)}<ol>${listItems(market.takeaways, market.takeawaysKo)}</ol></section>` : ""}

<div class="grid-2">
  <section class="panel">
    ${heading("h2", UI.recurring)}
    ${paras(...UI.howMany(postings.length), "muted small")}
    ${skillBars(usedSkills)}
  </section>
  <section class="panel">
    ${heading("h2", UI.ukVsUs)}
    <ul class="dots">${listItems(market.ukVsUs, market.ukVsUsKo)}</ul>
  </section>
</div>

${(market.linkedinNotes ?? []).length ? `<section class="panel">${heading("h2", UI.linkedinNotes)}<ul class="dots">${listItems(market.linkedinNotes, market.linkedinNotesKo)}</ul></section>` : ""}

<section id="postings">
  <div class="section-head">${heading("h2", UI.postings)}<p class="muted small" id="posting-count" aria-live="polite" data-template="${esc(UI.shown("{n}")[L])}">${txt(shown)}</p></div>
  <form class="filters" id="filters" role="search" onsubmit="return false">
    <div class="segmented" role="group" aria-label="Country">
      <button type="button" data-country="all" aria-pressed="true">${txt(UI.all)}</button>
      <button type="button" data-country="UK" aria-pressed="false">${txt(UI.uk)}</button>
      <button type="button" data-country="US" aria-pressed="false">${txt(UI.us)}</button>
    </div>
    <label class="field"><span class="sr-only">Skill</span>
      <select id="skill-filter"><option value="">${txt(UI.anySkill)}</option>${usedSkills
        .map((s) => s.skill)
        .sort((a, b) => a.localeCompare(b))
        .map((s) => {
          const k = skillFrequency.find((x) => x.skill === s)?.skillKo;
          return `<option value="${esc(s)}">${esc(L && k ? k : s)}</option>`;
        })
        .join("")}</select>
    </label>
    <label class="field grow"><span class="sr-only">Search postings</span>
      <input id="search" type="search" placeholder="${txt(UI.search)}">
    </label>
    <label class="check"><input id="open-only" type="checkbox"> ${txt(UI.openOnly)}</label>
  </form>
  <div class="postings" id="postings">
    ${postings
      .map(
        (p) => `<article class="posting" data-country="${esc(p.country)}" data-closed="${p.closed}" data-skills="${esc(p.skills.join("|"))}">
      <div class="posting-top">
        <span class="flag flag-${esc(p.country)}">${esc(p.country)}</span>
        ${p.source ? `<span class="via">${txt(UI.viaLinkedIn)}</span>` : ""}
        ${p.closed ? `<span class="closed">${txt(UI.closed)}</span>` : ""}
        <span class="muted small">${esc(p.location)}${p.workMode ? ` · ${esc(p.workMode)}` : ""} · ${fmtDate(p.seenDate)}</span>
      </div>
      <h3><a href="${esc(p.url)}">${esc(p.title)}</a></h3>
      <p class="company">${esc(p.company)}${p.salary ? ` · <span class="salary">${esc(p.salary)}</span>` : ""}</p>
      ${paras(p.summary, p.summaryKo)}
      ${(p.agenticSignals ?? []).length ? `<details><summary>${txt(UI.fromPosting)}</summary><ul>${p.agenticSignals.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></details>` : ""}
      <p class="tags">${p.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</p>
    </article>`
      )
      .join("")}
  </div>
  <p class="empty" id="empty" hidden>${txt(UI.noMatch)}</p>
</section>

${mentoringNote("marketNote")}

${caveatsSection(market)}`,
    scripts: `<script src="/market.js" defer></script>`,
  });
};

pages["reading.html"] = () => {
  const groups = Object.entries(SOURCE_CATEGORIES)
    .map(([key, label]) => [label, (reading.sources ?? []).filter((s) => s.category === key)])
    .filter(([, items]) => items.length);
  return layout({
    file: "reading.html",
    title: UI.reading,
    description: ["Articles, reports and guides on AI engineering and agentic coding, with what each one says.", "AI 엔지니어링과 에이전틱 코딩에 관한 기사·보고서·가이드와 각각의 핵심 내용."],
    body: `
${pageHead(UI.readingEyebrow((reading.sources ?? []).length), UI.readingTitle, reading.intro, reading.introKo)}

<section>
  ${heading("h2", UI.themes)}
  <div class="themes">${(reading.themes ?? [])
    .map(
      (t, i) =>
        `<article class="theme"><span class="theme-num">${String(i + 1).padStart(2, "0")}</span>${heading("h3", pairOf(t, "theme"))}${paras(t.evidence, t.evidenceKo)}${cites(t.sourceIds)}</article>`
    )
    .join("")}</div>
</section>

${groups
  .map(
    ([label, items]) => `<section>
  ${heading("h2", label)}
  <div class="sources">${items
    .map(
      (s) => `<article class="source" id="${esc(s.id)}">
      <p class="muted small"><span class="source-id">${esc(s.id)}</span> ${esc(s.publisher)}${s.author ? ` · ${esc(s.author)}` : ""} · ${fmtDate(s.date)}${s.region ? ` · ${esc(s.region)}` : ""}</p>
      <h3><a href="${esc(s.url)}">${esc(s.title)}</a></h3>
      <ul class="dots">${listItems(s.keyPoints, s.keyPointsKo)}</ul>
    </article>`
    )
    .join("")}</div>
</section>`
  )
  .join("")}

${caveatsSection(reading)}`,
  });
};

pages["roadmap.html"] = () =>
  layout({
    file: "roadmap.html",
    title: UI.roadmap,
    description: ["A six-month plan from applied data science to AI engineering, with a proof-of-work deliverable for each step.", "응용 데이터 사이언스에서 AI 엔지니어링으로 가는 6개월 계획과 단계별 증빙 결과물."],
    body: `
${pageHead(
  UI.roadmapEyebrow(countBy("done"), tasks.length),
  UI.roadmapTitle,
  roadmap.intro,
  roadmap.introKo,
  `<div class="progress" role="img" aria-label="${progress}% of roadmap tasks done">
    ${["done", "doing", "todo"].map((s) => `<span class="progress-${s}" style="flex:${countBy(s)}"></span>`).join("")}
  </div>
  <p class="legend small">${STATUSES.map((s) => `<span><i class="dot dot-${s}"></i>${txt(STATUS_LABEL[s])} ${countBy(s)}</span>`).join("")}</p>`
)}

${(roadmap.phases ?? [])
  .map(
    (ph) => `<section class="phase">
  <div class="phase-head">
    <p class="eyebrow">${esc(pick(ph.window, ph.windowKo))}</p>
    ${heading("h2", pairOf(ph, "title"))}
    ${ph.goal ? paras(ph.goal, ph.goalKo, "muted") : ""}
  </div>
  <ul class="task-list">${tasks.filter((t) => t.phase === ph.id).map(taskItem).join("")}</ul>
</section>`
  )
  .join("")}

${mentoringNote("roadmapNote")}`,
  });

pages["log.html"] = () =>
  layout({
    file: "log.html",
    title: UI.log,
    description: ["A dated journal of what I have done on the way to AI engineering.", "AI 엔지니어링으로 가는 길에 한 일을 날짜별로 기록합니다."],
    body: `
${pageHead(UI.logEyebrow((log.entries ?? []).length), UI.logTitle, log.intro, log.introKo)}
<div class="entries">${(log.entries ?? []).map(logEntry).join("")}</div>`,
  });

pages["community.html"] = () => {
  const posts = community.posts ?? [];
  const postById = new Map(posts.map((p) => [p.id, p]));
  const usedTopics = Object.entries(TOPICS).filter(([key]) => posts.some((p) => p.topic === key));
  return layout({
    file: "community.html",
    title: UI.community,
    description: ["What practitioners on Threads say about coding agents, tokens and AI engineering.", "Threads 실무자들이 말하는 코딩 에이전트, 토큰, AI 엔지니어링 이야기."],
    body: `
${pageHead(UI.communityEyebrow(posts.length), UI.communityTitle, community.intro, community.introKo)}

${(community.themes ?? []).length ? `<section>
  ${heading("h2", UI.themes)}
  <div class="themes">${community.themes
    .map(
      (t, i) => `<article class="theme"><span class="theme-num">${String(i + 1).padStart(2, "0")}</span>${heading("h3", pairOf(t, "theme"))}${paras(t.summary, t.summaryKo)}<span class="cites">${(t.postIds ?? [])
        .filter((id) => postById.has(id))
        .map((id) => `<a href="#${esc(id)}" title="${esc(postById.get(id).author)}">${esc(id)}</a>`)
        .join("")}</span></article>`
    )
    .join("")}</div>
</section>` : ""}

<section id="posts">
  <div class="section-head">${heading("h2", UI.posts)}<p class="muted small" id="post-count" aria-live="polite" data-template="${esc(UI.shown("{n}")[L])}">${txt(UI.shown(posts.length))}</p></div>
  <div class="filters" role="group" aria-label="Filter posts">
    <div class="segmented wrap-seg" role="group" aria-label="Topic">
      <button type="button" data-topic="all" aria-pressed="true">${txt(UI.allTopics)}</button>
      ${usedTopics.map(([key, label]) => `<button type="button" data-topic="${key}" aria-pressed="false">${txt(label)}</button>`).join("")}
    </div>
    <div class="segmented" role="group" aria-label="Language">
      <button type="button" data-lang="all" aria-pressed="true">${txt(UI.allLangs)}</button>
      <button type="button" data-lang="ko" aria-pressed="false">${txt(UI.koPosts)}</button>
      <button type="button" data-lang="en" aria-pressed="false">${txt(UI.enPosts)}</button>
    </div>
  </div>
  <div class="community-posts">${posts
    .map(
      (p) => `<article class="cpost" id="${esc(p.id)}" data-topic="${esc(p.topic)}" data-lang="${esc(p.lang)}">
      <div class="posting-top">
        <span class="chip chip-topic">${txt(TOPICS[p.topic])}</span>
        <span class="flag flag-lang">${p.lang === "ko" ? "KO" : "EN"}</span>
        <span class="muted small"><a href="${esc(p.url)}">${esc(p.author)} ↗</a>${p.date ? ` · ${fmtDate(p.date)}` : ""} · ${esc(p.id)}</span>
      </div>
      ${paras(p.summary, p.summaryKo)}
      ${p.tip ? `<div class="tip"><span class="label">${txt(UI.tip)}</span>${paras(p.tip, p.tipKo)}</div>` : ""}
      ${p.quote ? `<blockquote lang="${esc(p.lang)}">${esc(p.quote)}</blockquote>` : ""}
      ${p.seenVia === "snippet" ? `<p class="muted small">${txt(UI.viaSnippet)}</p>` : ""}
    </article>`
    )
    .join("")}</div>
  <p class="empty" id="empty" hidden>${txt(UI.noMatch)}</p>
</section>

${caveatsSection(community)}`,
    scripts: `<script src="/community.js" defer></script>`,
  });
};

pages["built.html"] = () =>
  layout({
    file: "built.html",
    title: UI.built,
    description: ["How this site is built and maintained with coding agents.", "코딩 에이전트로 이 사이트를 만들고 운영하는 방식."],
    body: `
${pageHead(UI.builtEyebrow, UI.builtTitle, profile.built?.intro, profile.built?.introKo)}
${(profile.built?.sections ?? []).map((s) => `<section class="panel">${heading("h2", pairOf(s, "heading"))}${prose(s.body, s.bodyKo)}</section>`).join("")}`,
  });

pages["404.html"] = () =>
  layout({
    file: "404.html",
    title: ["Not found", "찾을 수 없음"],
    description: ["Page not found.", "페이지를 찾을 수 없습니다."],
    body: `<section class="page-head">${heading("h1", UI.notFound)}<p class="lede"><a href="index.html">${txt(UI.backHome)}</a></p></section>`,
  });

// ---------- write ----------

rmSync(out, { recursive: true, force: true });
// Cloudflare serves pages at clean URLs (/market) and 404s on /market.html, so
// internal links are written as file names above and rewritten here, with the
// language prefix. On English pages, links to this site's own URLs (log
// evidence, for example) go to the English version.
for (const lang of [1, 0]) {
  L = lang;
  const dir = L ? out : join(out, "en");
  const prefix = L ? "/" : "/en/";
  mkdirSync(dir, { recursive: true });
  const cleanLinks = (html) => {
    html = html.replace(/href="index\.html/g, `href="${prefix}`).replace(/href="([a-z0-9-]+)\.html/g, `href="${prefix}$1`);
    if (!L) html = html.replace(new RegExp(`(<a [^>]*href=")${SITE}(/(?!en/)[^"]*)?"`, "g"), (_, a, rest = "/") => `${a}${SITE}/en${rest}"`);
    return html;
  };
  for (const [file, render] of Object.entries(pages)) writeFileSync(join(dir, file), cleanLinks(render()));
}
for (const asset of ["styles.css", "market.js", "community.js"]) copyFileSync(join(root, "src", asset), join(out, asset));
writeFileSync(join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log(`Built ${Object.keys(pages).length} pages in Korean (dist/) and English (dist/en/)`);
