import { getHeader, getQuery, readBody } from "h3";
import { start } from "workflow/api";
import { guardianRevenueScoutMonitor } from "../../workflows/guardian.js";

let jwksCache = null;
let jwksCacheExpiresAt = 0;

function base64urlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(base64urlToBytes(value)));
}

async function getGitHubJwks() {
  const now = Date.now();
  if (jwksCache && jwksCacheExpiresAt > now) return jwksCache;

  const response = await fetch("https://token.actions.githubusercontent.com/.well-known/jwks");
  if (!response.ok) throw new Error("GitHub OIDC JWKS request failed: " + response.status);
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error("GitHub OIDC JWKS response is invalid");

  jwksCache = body.keys;
  jwksCacheExpiresAt = now + 10 * 60 * 1000;
  return jwksCache;
}

async function verifyGitHubOidc(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const header = decodeJsonPart(parts[0]);
  const payload = decodeJsonPart(parts[1]);

  if (header.alg !== "RS256" || !header.kid) return false;
  if (payload.iss !== "https://token.actions.githubusercontent.com") return false;
  if (payload.aud !== "free-ai-business-builder-guardian") return false;
  if (payload.repository !== "nickolasmims-glitch/free-ai-business-builder") return false;
  if (payload.ref !== "refs/heads/main") return false;
  if (!payload.exp || payload.exp * 1000 <= Date.now()) return false;

  const keys = await getGitHubJwks();
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) return false;

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const data = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const signature = base64urlToBytes(parts[2]);

  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, data);
}

async function authorized(event) {
  const secret = process.env.CRON_SECRET;
  const authorization = getHeader(event, "authorization") || "";
  if (secret && authorization === "Bearer " + secret) return true;
  if (!authorization.startsWith("Bearer ")) return false;

  try {
    return await verifyGitHubOidc(authorization.slice(7));
  } catch (error) {
    console.error("github_oidc_authorization_failed", error?.message || error);
    return false;
  }
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method || "GET";
  if (method !== "GET" && method !== "POST") {
    event.node.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  const configured = {
    cronSecret: Boolean(process.env.CRON_SECRET),
    aiGateway: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
    email: Boolean(
      process.env.RESEND_API_KEY &&
      process.env.FROM_EMAIL &&
      process.env.AUTOPILOT_REPORT_EMAIL
    )
  };

  if (!(await authorized(event))) {
    event.node.res.statusCode = 401;
    return { error: "Unauthorized Guardian request", configured };
  }

  const query = getQuery(event);
  const body = method === "POST" ? await readBody(event).catch(() => ({})) : {};
  const topic = String(
    query.topic ||
    process.env.AUTOPILOT_TOPIC ||
    "AI workflow automation for local service businesses"
  ).slice(0, 180);
  const directCommand = String(query.command || body?.command || "").slice(0, 2000);

  try {
    const run = await start(guardianRevenueScoutMonitor, [{ topic, directCommand }]);

    console.log(JSON.stringify({
      event: "guardian_revenue_scout_started",
      runId: run.runId,
      topic,
      directCommand: directCommand || null,
      enforcement: "NON_BLOCKING",
      commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
      configured
    }));

    return {
      ok: true,
      status: "GUARDIAN_REVENUE_SCOUT_STARTED",
      runId: run.runId,
      topic,
      directCommand: directCommand || null,
      configured,
      enforcement: "NON_BLOCKING",
      commandPriority: "OWNER_DIRECT_COMMANDS_FIRST",
      monitor: "One focused revenue cycle per supervisor trigger; external scheduler keeps AI2/AI3 active.",
      safeguards: [
        "owner-locked goals",
        "owner direct commands take priority over Guardian recommendations",
        "no autonomous spending",
        "no fabricated results",
        "legitimate zero-cost targeted outreach is standing owner-preapproved; financial and irreversible actions require explicit owner approval"
      ]
    };
  } catch (error) {
    console.error("guardian_start_error", error);
    event.node.res.statusCode = 500;
    return {
      ok: false,
      status: "GUARDIAN_START_FAILED",
      error: error?.message || "Failed to start Guardian",
      configured
    };
  }
});
