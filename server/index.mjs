import http from "node:http";
import { mkdirSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { RewardStore } from "./rewards/store.mjs";
import { BossAuthority } from "./rewards/bosses.mjs";
import {
  SandboxProvider,
  CollectorCryptDevelopment,
} from "./providers/collector-crypt.mjs";
import { serveStatic } from "../scripts/serve.mjs";

// Deliberately loopback-only: device sessions are for local development, not public accounts.
const mode = process.env.REWARDS_PROVIDER || "sandbox";
if (!["sandbox", "collector-crypt-development"].includes(mode))
  throw Error("Live rewards are disabled. See docs/REWARDS.md");
mkdirSync(new URL("../.data/", import.meta.url), { recursive: true });
const store = new RewardStore(
  process.env.REWARDS_DB ||
    new URL("../.data/rewards.sqlite", import.meta.url).pathname,
);
const authority = new BossAuthority(store);
const provider =
  mode === "sandbox"
    ? new SandboxProvider()
    : new CollectorCryptDevelopment({
        apiKey: process.env.CC_API_KEY,
        packType: process.env.CC_PACK_TYPE,
      });
const json = (res, status, body) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
};
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("Invalid PORT");
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/api/")) return serveStatic(req, res);
  try {
    const base = `http://127.0.0.1:${port}`;
    // Reject DNS rebinding, cross-site POSTs and oversized requests. No permissive CORS.
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host))
      return json(res, 403, { error: "Local requests only" });
    if (
      req.headers.origin &&
      ![base, `http://localhost:${port}`].includes(req.headers.origin)
    )
      return json(res, 403, { error: "Origin refused" });
    if (
      req.method !== "GET" &&
      req.headers["content-type"] !== "application/json"
    )
      return json(res, 415, { error: "JSON required" });
    if (!["GET", "POST"].includes(req.method))
      return json(res, 405, { error: "Method not allowed" });
    let token = req.headers.cookie?.match(
      /(?:^|; )kanto_reward_session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    if (!token) {
      token = randomBytes(32).toString("hex");
      res.setHeader(
        "Set-Cookie",
        `kanto_reward_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=31536000`,
      );
    }
    const owner = createHash("sha256").update(token).digest("hex");
    const url = new URL(req.url, base);
    let raw = "",
      body = {};
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 4096)
        return json(res, 413, { error: "Request too large" });
    }
    if (raw) body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json(res, 400, { error: "Invalid request" });
    const route = `${req.method} ${url.pathname}`;
    let result;
    switch (route) {
      case "GET /api/rewards":
        authority.prune();
        result = {
          ...store.snapshot(owner),
          provider: mode,
          fight: authority.current(owner),
        };
        break;
      case "POST /api/challenges/start":
        authority.prune();
        result = authority.start(owner, body.starter);
        break;
      case "POST /api/challenges/action":
        result = authority.action(owner, body);
        break;
      case "POST /api/challenges/leave":
        authority.abandon(owner);
        result = { ok: true };
        break;
      case "POST /api/packs/open":
        result = store.open(owner, body.id);
        break;
      case "POST /api/packs/reveal":
        store.reveal(owner, body.id);
        result = { ok: true };
        break;
      case "POST /api/redeem":
        result = store.redeem(owner, body.key);
        break;
      case "POST /api/fulfill":
        result = await store.fulfill(owner, body.id, provider);
        break;
      default:
        return json(res, 404, { error: "Endpoint not found" });
    }
    json(res, 200, result);
  } catch (e) {
    json(res, 400, {
      error: e.message.startsWith("Unexpected") ? "Invalid request" : e.message,
    });
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Kanto game + ${mode} rewards: http://127.0.0.1:${port}/`),
);
server.on("error", (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
