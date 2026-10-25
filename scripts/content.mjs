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
  market: "Market and hiring data",
  role: "What an AI engineer is",
  practice: "Agentic engineering practice",
  transition: "Data scientist to AI engineer",
  skeptic: "The sceptical view",
};
