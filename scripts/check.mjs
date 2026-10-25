// Validates content/*.json before every build. This is the guardrail that lets
// a coding agent edit content safely: if it invents a field, breaks a reference
// or forgets a source URL, the build stops with a precise message.
import { loadContent, STATUSES, SOURCE_CATEGORIES } from "./content.mjs";

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const isDate = (v) => typeof v === "string" && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v);
const isUrl = (v) => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);
const isText = (v) => typeof v === "string" && v.trim().length > 0;

function need(obj, where, fields) {
  for (const [key, test, label] of fields) {
    if (!test(obj?.[key])) fail(where, `"${key}" must be ${label}`);
  }
}

function unique(items, key, where) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item[key])) fail(where, `duplicate ${key} "${item[key]}"`);
    seen.add(item[key]);
  }
  return seen;
}

let content;
try {
  content = loadContent();
} catch (err) {
  console.error(`Could not read content: ${err.message}`);
  process.exit(1);
}
const { profile, market, reading, roadmap, log } = content;

// profile.json
need(profile, "profile", [
  ["name", isText, "text"],
  ["headline", isText, "text"],
  ["thesis", isText, "text"],
  ["updated", isDate, "a YYYY-MM-DD date"],
]);
// The mentoring site is the main site; this log supports it with CTAs.
need(profile.mentoring, "profile.mentoring", [
  ["url", isUrl, "an https URL"],
  ["sessionsUrl", isUrl, "an https URL"],
  ...["heading", "body", "cta", "site", "marketNote", "roadmapNote"].map((f) => [f, isText, "text"]),
]);
for (const [i, link] of (profile.links ?? []).entries()) {
  need(link, `profile.links[${i}]`, [["label", isText, "text"], ["url", isUrl, "an https URL"]]);
}

// reading.json — sources first, because other files cite them.
const sources = reading.sources ?? [];
const sourceIds = unique(sources, "id", "reading.sources");
for (const s of sources) {
  const where = `reading.sources[${s.id}]`;
  need(s, where, [
    ["id", isText, "text"],
    ["title", isText, "text"],
    ["publisher", isText, "text"],
    ["date", isDate, "YYYY, YYYY-MM or YYYY-MM-DD"],
    ["url", isUrl, "an https URL"],
  ]);
  if (!(s.category in SOURCE_CATEGORIES)) fail(where, `category must be one of ${Object.keys(SOURCE_CATEGORIES).join(", ")}`);
  if (!Array.isArray(s.keyPoints) || s.keyPoints.length === 0) fail(where, "needs at least one keyPoint");
}
const cite = (ids, where) => {
  for (const id of ids ?? []) if (!sourceIds.has(id)) fail(where, `cites unknown source "${id}"`);
};
for (const [i, t] of (reading.themes ?? []).entries()) {
  need(t, `reading.themes[${i}]`, [["theme", isText, "text"], ["evidence", isText, "text"]]);
  cite(t.sourceIds, `reading.themes[${i}]`);
}

// market.json — skill counts are computed from posting tags, so every tag must
// come from the shared vocabulary in market.skills.
const postings = market.postings ?? [];
need(market, "market", [["updated", isDate, "a YYYY-MM-DD date"]]);
const skillNames = unique(market.skills ?? [], "skill", "market.skills");
for (const [i, p] of postings.entries()) {
  const where = `market.postings[${i}] (${p.company ?? "?"})`;
  need(p, where, [
    ["title", isText, "text"],
    ["company", isText, "text"],
    ["location", isText, "text"],
    ["seenDate", isDate, "YYYY-MM or YYYY-MM-DD"],
    ["url", isUrl, "an https URL"],
    ["summary", isText, "text"],
  ]);
  if (!["UK", "US"].includes(p.country)) fail(where, `country must be "UK" or "US"`);
  if (typeof p.closed !== "boolean") fail(where, `"closed" must be true or false`);
  if (!Array.isArray(p.skills) || p.skills.length === 0) fail(where, "needs at least one skill tag");
  for (const tag of p.skills ?? []) {
    if (!skillNames.has(tag)) fail(where, `skill tag "${tag}" is not in market.skills (add it there or use an existing one)`);
  }
}

// roadmap.json
const phaseIds = unique(roadmap.phases ?? [], "id", "roadmap.phases");
unique(roadmap.tasks ?? [], "id", "roadmap.tasks");
for (const t of roadmap.tasks ?? []) {
  const where = `roadmap.tasks[${t.id}]`;
  need(t, where, [["id", isText, "text"], ["title", isText, "text"], ["deliverable", isText, "text"]]);
  if (!phaseIds.has(t.phase)) fail(where, `unknown phase "${t.phase}"`);
  if (!STATUSES.includes(t.status)) fail(where, `status must be one of ${STATUSES.join(", ")}`);
  if (t.status === "done" && !isDate(t.done)) fail(where, `done tasks need a "done" date`);
  if (t.evidence !== undefined && !isUrl(t.evidence)) fail(where, `"evidence" must be an https URL`);
  cite(t.sourceIds, where);
}

// log.json
const entries = log.entries ?? [];
for (const [i, e] of entries.entries()) {
  const where = `log.entries[${i}]`;
  need(e, where, [["date", (v) => isDate(v) && v.length === 10, "a YYYY-MM-DD date"], ["title", isText, "text"], ["body", isText, "text"]]);
  for (const [j, link] of (e.links ?? []).entries()) {
    need(link, `${where}.links[${j}]`, [["label", isText, "text"], ["url", isUrl, "an https URL"]]);
  }
  if (i > 0 && e.date > entries[i - 1].date) fail(where, "entries must be newest first");
}

// Bilingual: every translatable field needs a Korean sibling named <field>Ko.
// Strings need a non-empty string; arrays need an array of the same length.
function ko(obj, where, fields) {
  if (!obj) return;
  for (const field of fields) {
    const en = obj[field];
    if (en === undefined || en === null) continue;
    const k = obj[`${field}Ko`];
    if (Array.isArray(en)) {
      if (!Array.isArray(k) || k.length !== en.length || !k.every(isText)) {
        fail(where, `"${field}Ko" must be an array of ${en.length} Korean strings`);
      }
    } else if (!isText(k)) {
      fail(where, `"${field}Ko" (Korean for "${field}") is missing`);
    }
  }
}
ko(profile, "profile", ["eyebrow", "headline", "thesis", "about"]);
ko(profile.built, "profile.built", ["intro"]);
ko(profile.mentoring, "profile.mentoring", ["heading", "body", "cta", "site", "marketNote", "roadmapNote"]);
(profile.built?.sections ?? []).forEach((s, i) => ko(s, `profile.built.sections[${i}]`, ["heading", "body"]));
ko(market, "market", ["intro", "takeaways", "ukVsUs", "caveats"]);
(market.skills ?? []).forEach((s) => ko(s, `market.skills[${s.skill}]`, ["skill", "note"]));
postings.forEach((p, i) => ko(p, `market.postings[${i}] (${p.company})`, ["summary"]));
ko(reading, "reading", ["intro", "caveats"]);
sources.forEach((s) => ko(s, `reading.sources[${s.id}]`, ["keyPoints"]));
(reading.themes ?? []).forEach((t, i) => ko(t, `reading.themes[${i}]`, ["theme", "evidence"]));
ko(roadmap, "roadmap", ["intro"]);
(roadmap.phases ?? []).forEach((p) => ko(p, `roadmap.phases[${p.id}]`, ["title", "window", "goal"]));
(roadmap.tasks ?? []).forEach((t) => ko(t, `roadmap.tasks[${t.id}]`, ["title", "why", "deliverable"]));
ko(log, "log", ["intro"]);
entries.forEach((e, i) => ko(e, `log.entries[${i}]`, ["title", "body"]));
(profile.links ?? []).forEach((l, i) => ko(l, `profile.links[${i}]`, ["label"]));
entries.forEach((e, i) => (e.links ?? []).forEach((l, j) => ko(l, `log.entries[${i}].links[${j}]`, ["label"])));

if (errors.length) {
  console.error(`Content check failed (${errors.length}):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`Content OK: ${postings.length} postings, ${sources.length} sources, ${(roadmap.tasks ?? []).length} roadmap tasks, ${entries.length} log entries.`);
