# Agent guide

A static site: `content/*.json` → `scripts/build.mjs` → `dist/`. No framework, no runtime dependencies. Node 22+.

## Open only the file you need

| Request | File |
| --- | --- |
| "log that I did X", a new journal entry | `content/log.json` (add at the **top**; newest first) |
| Roadmap task added, started or finished | `content/roadmap.json` |
| A job posting | `content/market.json` → `postings`; tag only with names from `skills` (counts are computed at build) |
| An article, report or guide | `content/reading.json` → `sources` (next free id `sN`) |
| Bio, links, colophon text | `content/profile.json` |
| Page layout or markup | `scripts/build.mjs` |
| Styling | `src/styles.css` |
| Validation rules | `scripts/check.mjs` |

Don't read `dist/`, `node_modules/` or the whole repo to answer a content request.

## Rules

1. **Never invent** a posting, source, quote, salary, statistic, date or URL. If you can't verify it, leave it out or say so in `caveats`.
2. Cite sources by id (`"sourceIds": ["s3"]`). Ids must exist in `reading.json`.
3. When finishing a roadmap task: set `"status": "done"`, add `"done": "YYYY-MM-DD"`, add `"evidence"` (https URL) if there is one, and add a matching log entry.
4. Bump `updated` (`profile.json` and/or `market.json`) when content changes materially.
5. Write in plain British English. Short, factual entries; no hype or invented results.
6. Text fields allow `**bold**`, `` `code` ``, `[label](https://...)`, `- ` lists, and blank lines between paragraphs. No HTML.
7. Don't publish anything private: no real names other than "K.Wright", no employer-confidential detail, no links to private sites.

## Before you finish

Run `npm run build`. It runs `npm run check` first and fails with the exact field to fix. Don't hand back work while the build is failing. Don't deploy (`npm run deploy`) unless asked.
