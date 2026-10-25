// Minimal static server for previewing dist/ locally (loopback only).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { root } from "./content.mjs";

const dist = join(root, "dist");
const port = Number(process.env.PORT) || 4173;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".txt": "text/plain" };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  else if (!extname(path)) path += ".html"; // clean URLs, as on Cloudflare
  const file = normalize(join(dist, path));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(await readFile(join(dist, "404.html")));
  }
}).listen(port, "127.0.0.1", () => console.log(`Preview at http://localhost:${port}`));
