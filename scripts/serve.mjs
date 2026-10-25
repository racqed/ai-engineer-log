// Minimal static server for previewing dist/ locally (loopback only).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { root } from "./content.mjs";

const dist = join(root, "dist");
const port = Number(process.env.PORT) || 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".txt": "text/plain" };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/en") return res.writeHead(307, { location: "/en/" }).end();
  // Clean URLs, as on Cloudflare: /market serves market.html, /en/ serves en/index.html.
  const candidate = path.endsWith("/") ? path + "index.html" : extname(path) ? path : path + ".html";
  const file = normalize(join(dist, candidate));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    const notFound = path.startsWith("/en/") ? join(dist, "en", "404.html") : join(dist, "404.html");
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(await readFile(notFound));
  }
}).listen(port, "127.0.0.1", () => console.log(`Preview at http://localhost:${port}`));
