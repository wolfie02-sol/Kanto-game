import http from "node:http";
import { readFile, stat, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const contained = (target) =>
  target === root || target.startsWith(root + path.sep);
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("PORT must be an integer from 1 to 65535.");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
export async function serveStatic(req, res) {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end("Method not allowed");
    }
    let url = new URL(req.url, "http://localhost"),
      pathname = decodeURIComponent(url.pathname),
      target = path.resolve(root, "." + pathname);
    if (!contained(target)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    let st = await stat(target);
    if (st.isDirectory()) target = path.join(target, "index.html");
    let canonical = await realpath(target);
    if (!contained(canonical)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    let bytes = await readFile(canonical);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": bytes.length,
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}
const server = http.createServer(serveStatic);
server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Set PORT to another port and retry.`
      : e.message,
  );
  process.exitCode = 1;
});
if (process.argv[1] === fileURLToPath(import.meta.url))
  server.listen(port, "127.0.0.1", () =>
    console.log(`Kanto Journey: http://127.0.0.1:${port}/`),
  );
