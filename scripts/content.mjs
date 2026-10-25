// Loads every content file once. Pages and the checker both read from here,
// so a schema change only has to be made in one place.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const read = (name) => JSON.parse(readFileSync(join(root, "content", name), "utf8"));

export function loadContent() {
  return {
    profile: read("profile.json"),
    market: read("market.json"),
    reading: read("reading.json"),
    roadmap: read("roadmap.json"),
    log: read("log.json"),
  };
}

export const STATUSES = ["todo", "doing", "done"];
export const SOURCE_CATEGORIES = {
  market: ["Market and hiring data", "시장과 채용 데이터"],
  role: ["What an AI engineer is", "AI 엔지니어란 무엇인가"],
  practice: ["Agentic engineering practice", "에이전틱 엔지니어링 실무"],
  transition: ["Data scientist to AI engineer", "데이터 사이언티스트에서 AI 엔지니어로"],
  skeptic: ["The sceptical view", "회의적인 시각"],
};
