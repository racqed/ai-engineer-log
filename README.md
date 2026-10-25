# AI Engineer Log

An open, agent-built career log: what UK and US employers ask of AI engineers, the evidence behind it, a six-month roadmap from applied data science to AI engineering, and a dated record of what's been done.

Live: https://ai-engineer-log.latteboo99.workers.dev (Korean) · https://ai-engineer-log.latteboo99.workers.dev/en/ (English)

Pages: **Overview** · **Market** (job postings with skill counts and filters) · **Reading** (themes and cited sources) · **Roadmap** (tasks with status and proof of work) · **Log** (journal) · **How it's built**.

## Use

```bash
npm run dev      # build and preview at http://localhost:4173
npm run check    # validate content/*.json
npm run build    # check, then render to dist/ (Korean) and dist/en/ (English)
npm run deploy   # build and publish to Cloudflare Workers (needs `npm install` and a wrangler login)
```

Node 22+. The build needs no dependencies; `wrangler` is only for deploying.

## Updating

Everything you see comes from four files in `content/`: `market.json`, `reading.json`, `roadmap.json` and `log.json`, plus `profile.json` for the bio and colophon. The easiest way to update them is to ask Claude Code or Codex, for example "log that I finished the eval harness, evidence is <url>". `AGENTS.md` tells them which file to edit and what the rules are, and `npm run check` rejects malformed or uncited content.

## Layout

```
content/          site data (the only thing that changes often)
scripts/build.mjs renders each page in Korean (dist/) and English (dist/en/)
scripts/check.mjs content validation, run before every build
scripts/serve.mjs local preview server
src/              styles.css, market.js (postings filters)
AGENTS.md         rules for coding agents (CLAUDE.md imports it)
wrangler.jsonc    Cloudflare Workers static-assets config
```
