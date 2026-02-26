import { createServer } from "node:http";
import { URL } from "node:url";
import {
  isValidHttpUrl,
  isValidMockupMode,
} from "../../../packages/core/src/contracts.js";
import {
  claimNextJob,
  createJob,
  getJobById,
  getJobManifest,
  updateJobFromWorker,
} from "./job-store.js";

const PORT = Number(process.env.API_PORT ?? 3001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const WORKER_TOKEN = process.env.WORKER_TOKEN ?? "dev-worker-token";
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 1_000_000);

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function applyCorsHeaders(req, res) {
  const requestOrigin = req.headers.origin;

  if (WEB_ORIGIN === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (requestOrigin === WEB_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", WEB_ORIGIN);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Worker-Token");
}

function isAuthorizedWorker(req) {
  const token = req.headers["x-worker-token"];
  return typeof token === "string" && token === WORKER_TOKEN;
}

function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("body_too_large"), { code: "body_too_large" }));
        req.destroy();
        return;
      }
      data += chunk;
    });

    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function safeParseJson(rawBody) {
  try {
    return { ok: true, value: JSON.parse(rawBody || "{}") };
  } catch {
    return { ok: false };
  }
}

function parseJobId(pathname) {
  const match = pathname.match(/^\/jobs\/([^/]+)$/);
  return match ? match[1] : null;
}

function parseManifestJobId(pathname) {
  const match = pathname.match(/^\/jobs\/([^/]+)\/manifest$/);
  return match ? match[1] : null;
}

function parseWorkerUpdateJobId(pathname) {
  const match = pathname.match(/^\/internal\/worker\/jobs\/([^/]+)\/update$/);
  return match ? match[1] : null;
}

async function handlePostJobs(req, res) {
  let rawBody;
  try {
    rawBody = await readBody(req);
  } catch (error) {
    if (error.code === "body_too_large") {
      return jsonResponse(res, 413, { error: "body_too_large" });
    }
    return jsonResponse(res, 400, { error: "invalid_body" });
  }

  const parsed = safeParseJson(rawBody);
  if (!parsed.ok) {
    return jsonResponse(res, 400, { error: "invalid_json" });
  }
  const body = parsed.value;

  if (typeof body.client_name !== "string" || body.client_name.trim() === "") {
    return jsonResponse(res, 400, { error: "invalid_client_name" });
  }

  if (!isValidHttpUrl(body.site_url)) {
    return jsonResponse(res, 400, { error: "invalid_site_url" });
  }

  if (!isValidMockupMode(body.mockup_mode)) {
    return jsonResponse(res, 400, { error: "invalid_mockup_mode" });
  }

  const job = createJob({
    client_name: body.client_name.trim(),
    site_url: body.site_url,
    mockup_mode: body.mockup_mode,
  });

  return jsonResponse(res, 201, {
    job_id: job.id,
    status: job.status,
  });
}

function handleGetJob(jobId, res) {
  const job = getJobById(jobId);
  if (!job) {
    return jsonResponse(res, 404, { error: "job_not_found" });
  }
  return jsonResponse(res, 200, job);
}

function handleGetManifest(jobId, res) {
  const manifest = getJobManifest(jobId);
  if (!manifest) {
    return jsonResponse(res, 404, { error: "manifest_not_ready" });
  }
  return jsonResponse(res, 200, manifest);
}

async function handleWorkerClaim(req, res) {
  if (!isAuthorizedWorker(req)) {
    return jsonResponse(res, 401, { error: "unauthorized_worker" });
  }

  let rawBody = "{}";
  try {
    rawBody = await readBody(req);
  } catch (error) {
    if (error.code === "body_too_large") {
      return jsonResponse(res, 413, { error: "body_too_large" });
    }
    return jsonResponse(res, 400, { error: "invalid_body" });
  }

  const parsed = safeParseJson(rawBody);
  if (!parsed.ok) {
    return jsonResponse(res, 400, { error: "invalid_json" });
  }
  const body = parsed.value;
  const workerId =
    typeof body.worker_id === "string" && body.worker_id.trim().length > 0
      ? body.worker_id.trim()
      : "worker-unknown";

  const job = claimNextJob(workerId);
  if (!job) {
    res.writeHead(204);
    res.end();
    return;
  }

  return jsonResponse(res, 200, job);
}

async function handleWorkerUpdate(req, res, jobId) {
  if (!isAuthorizedWorker(req)) {
    return jsonResponse(res, 401, { error: "unauthorized_worker" });
  }

  let rawBody;
  try {
    rawBody = await readBody(req);
  } catch (error) {
    if (error.code === "body_too_large") {
      return jsonResponse(res, 413, { error: "body_too_large" });
    }
    return jsonResponse(res, 400, { error: "invalid_body" });
  }

  const parsed = safeParseJson(rawBody);
  if (!parsed.ok) {
    return jsonResponse(res, 400, { error: "invalid_json" });
  }

  const updated = updateJobFromWorker(jobId, parsed.value);
  if (!updated) {
    return jsonResponse(res, 404, { error: "job_not_found" });
  }
  return jsonResponse(res, 200, updated);
}

const server = createServer(async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host ?? `localhost:${PORT}`;
  const requestUrl = new URL(req.url ?? "/", `http://${host}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    return jsonResponse(res, 200, { ok: true });
  }

  if (req.method === "POST" && requestUrl.pathname === "/jobs") {
    return handlePostJobs(req, res);
  }

  const getJobId = parseJobId(requestUrl.pathname);
  if (req.method === "GET" && getJobId) {
    return handleGetJob(getJobId, res);
  }

  const getManifestJobId = parseManifestJobId(requestUrl.pathname);
  if (req.method === "GET" && getManifestJobId) {
    return handleGetManifest(getManifestJobId, res);
  }

  if (req.method === "POST" && requestUrl.pathname === "/internal/worker/claim") {
    return handleWorkerClaim(req, res);
  }

  const workerUpdateJobId = parseWorkerUpdateJobId(requestUrl.pathname);
  if (req.method === "POST" && workerUpdateJobId) {
    return handleWorkerUpdate(req, res, workerUpdateJobId);
  }

  return jsonResponse(res, 404, { error: "route_not_found" });
});

server.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
