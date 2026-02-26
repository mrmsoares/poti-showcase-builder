import { randomUUID } from "node:crypto";

const jobs = new Map();
const queue = [];

function nowIso() {
  return new Date().toISOString();
}

function createInitialProgress() {
  return {
    stage: "queued",
    pages_discovered: 0,
    pages_processed_images: 0,
    pages_processed_videos: 0,
    images_generated: 0,
    videos_generated: 0,
  };
}

function createInitialJob(input) {
  const now = nowIso();
  return {
    id: randomUUID(),
    client_name: input.client_name,
    site_url: input.site_url,
    mockup_mode: input.mockup_mode,
    status: "queued",
    created_at: now,
    started_at: null,
    finished_at: null,
    updated_at: now,
    error_message: null,
    claimed_by: null,
    progress: createInitialProgress(),
    pages: [],
    assets: [],
    manifest: null,
  };
}

function recalculateCounters(job) {
  job.progress.pages_discovered = job.pages.length;

  job.progress.images_generated = job.assets.filter(
    (asset) => asset.type === "image"
  ).length;
  job.progress.videos_generated = job.assets.filter(
    (asset) => asset.type === "video"
  ).length;
}

function sanitizeJob(job) {
  return {
    id: job.id,
    client_name: job.client_name,
    site_url: job.site_url,
    mockup_mode: job.mockup_mode,
    status: job.status,
    created_at: job.created_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
    updated_at: job.updated_at,
    error_message: job.error_message,
    progress: job.progress,
    pages_count: job.pages.length,
    assets_count: job.assets.length,
  };
}

export function createJob(input) {
  const job = createInitialJob(input);
  jobs.set(job.id, job);
  queue.push(job.id);
  return sanitizeJob(job);
}

export function getJobById(id) {
  const job = jobs.get(id);
  if (!job) {
    return null;
  }
  return sanitizeJob(job);
}

export function getRawJobById(id) {
  return jobs.get(id) ?? null;
}

export function claimNextJob(workerId) {
  while (queue.length > 0) {
    const jobId = queue.shift();
    const job = jobs.get(jobId);
    if (!job || job.status !== "queued") {
      continue;
    }

    const now = nowIso();
    job.status = "crawling";
    job.started_at = now;
    job.updated_at = now;
    job.claimed_by = workerId;
    job.progress.stage = "crawling";

    return {
      id: job.id,
      client_name: job.client_name,
      site_url: job.site_url,
      mockup_mode: job.mockup_mode,
      created_at: job.created_at,
    };
  }

  return null;
}

export function updateJobFromWorker(jobId, update) {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }

  if (typeof update.status === "string") {
    job.status = update.status;
    job.progress.stage = update.status;
  }

  if (typeof update.error_message === "string" && update.error_message.length > 0) {
    job.error_message = update.error_message;
  }

  if (update.progress && typeof update.progress === "object") {
    job.progress = {
      ...job.progress,
      ...update.progress,
    };
  }

  if (Array.isArray(update.pages)) {
    job.pages = update.pages;
  }

  if (Array.isArray(update.assets_delta) && update.assets_delta.length > 0) {
    job.assets.push(...update.assets_delta);
  }

  if (update.manifest && typeof update.manifest === "object") {
    job.manifest = update.manifest;
  }

  if (job.status === "done" || job.status === "failed") {
    job.finished_at = nowIso();
  }

  recalculateCounters(job);
  job.updated_at = nowIso();
  return sanitizeJob(job);
}

export function getJobManifest(id) {
  const job = jobs.get(id);
  if (!job || !job.manifest) {
    return null;
  }
  return job.manifest;
}
