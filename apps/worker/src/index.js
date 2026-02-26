import {
  IMAGE_VIEWPORTS,
  VIDEO_VIEWPORTS,
} from "../../../packages/core/src/contracts.js";
import { buildAssetName, slugify } from "../../../packages/core/src/naming.js";
import { normalizeUrlForCrawl } from "../../../packages/core/src/url-policy.js";
import { discoverCandidateUrls } from "../../../packages/crawler/src/index.js";
import {
  shouldApplyImageMockup,
  shouldApplyVideoMockup,
} from "../../../packages/mockup/src/index.js";
import { createManifest } from "../../../packages/manifest/src/index.js";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";
const WORKER_TOKEN = process.env.WORKER_TOKEN ?? "dev-worker-token";
const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS ?? 1200);
const MAX_PAGES = Number(process.env.WORKER_MAX_PAGES ?? 20);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pageSlugFromUrl(value) {
  const parsed = new URL(value);
  if (parsed.pathname === "/" || parsed.pathname === "") {
    return "home";
  }
  return slugify(parsed.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-"));
}

function extractHrefs(html) {
  const hrefs = [];
  const regex = /href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    hrefs.push(match[1]);
  }
  return hrefs;
}

async function discoverPublicPages(siteUrl) {
  const unique = new Set([normalizeUrlForCrawl(siteUrl)]);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(siteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const hrefs = extractHrefs(html);
      const candidates = discoverCandidateUrls(siteUrl, hrefs);
      for (const url of candidates) {
        unique.add(url);
      }
    }
  } catch {
    // Fallback to root page only when discovery fails.
  }

  return [...unique].slice(0, MAX_PAGES).map((url) => ({
    url,
    slug: pageSlugFromUrl(url),
  }));
}

function makeImageAssets(job, page) {
  const outputRoot = `output/${slugify(job.client_name)}/${job.id}`;
  const assets = [];
  const imageMockupEnabled = shouldApplyImageMockup(job.mockup_mode);

  for (const viewport of IMAGE_VIEWPORTS) {
    const foldCount = viewport === "mobile" ? 4 : 3;
    for (let i = 1; i <= foldCount; i += 1) {
      const fold = `fold-${String(i).padStart(3, "0")}`;
      assets.push({
        type: "image",
        variant: "raw",
        viewport,
        page_slug: page.slug,
        fold_index: fold,
        path: `${outputRoot}/pages/${page.slug}/images/raw/${viewport}/${buildAssetName({
          clientName: job.client_name,
          pageSlug: page.slug,
          media: "image",
          viewport,
          variant: "raw",
          index: fold,
          extension: "png",
        })}`,
      });

      if (imageMockupEnabled) {
        assets.push({
          type: "image",
          variant: "mockup",
          viewport,
          page_slug: page.slug,
          fold_index: fold,
          path: `${outputRoot}/pages/${page.slug}/images/mockup/${viewport}/${buildAssetName({
            clientName: job.client_name,
            pageSlug: page.slug,
            media: "image",
            viewport,
            variant: "mockup",
            index: fold,
            extension: "png",
          })}`,
        });
      }
    }
  }

  return assets;
}

function makeVideoAssets(job, page) {
  const outputRoot = `output/${slugify(job.client_name)}/${job.id}`;
  const assets = [];
  const videoMockupEnabled = shouldApplyVideoMockup(job.mockup_mode);

  for (const viewport of VIDEO_VIEWPORTS) {
    assets.push({
      type: "video",
      variant: "raw",
      viewport,
      page_slug: page.slug,
      fold_index: null,
      path: `${outputRoot}/pages/${page.slug}/videos/raw/${viewport}/${buildAssetName({
        clientName: job.client_name,
        pageSlug: page.slug,
        media: "video",
        viewport,
        variant: "raw",
        index: "single",
        extension: "webm",
      })}`,
    });

    if (videoMockupEnabled) {
      assets.push({
        type: "video",
        variant: "mockup",
        viewport,
        page_slug: page.slug,
        fold_index: null,
        path: `${outputRoot}/pages/${page.slug}/videos/mockup/${viewport}/${buildAssetName({
          clientName: job.client_name,
          pageSlug: page.slug,
          media: "video",
          viewport,
          variant: "mockup",
          index: "single",
          extension: "mp4",
        })}`,
      });
    }
  }

  return assets;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Token": WORKER_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`API ${path} failed: ${response.status} ${raw}`);
  }

  return response.json();
}

async function claimJob() {
  return apiPost("/internal/worker/claim", { worker_id: WORKER_ID });
}

async function updateJob(jobId, payload) {
  return apiPost(`/internal/worker/jobs/${jobId}/update`, payload);
}

async function processJob(job) {
  const pages = await discoverPublicPages(job.site_url);
  const allAssets = [];

  await updateJob(job.id, {
    status: "crawling",
    pages,
    progress: {
      stage: "crawling",
      pages_discovered: pages.length,
    },
  });
  await sleep(300);

  let imagePageCount = 0;
  await updateJob(job.id, {
    status: "capturing_images",
    progress: {
      stage: "capturing_images",
      pages_discovered: pages.length,
      pages_processed_images: imagePageCount,
    },
  });

  for (const page of pages) {
    const assetsDelta = makeImageAssets(job, page);
    allAssets.push(...assetsDelta);
    imagePageCount += 1;
    await updateJob(job.id, {
      progress: {
        stage: "capturing_images",
        pages_discovered: pages.length,
        pages_processed_images: imagePageCount,
      },
      assets_delta: assetsDelta,
    });
    await sleep(200);
  }

  let videoPageCount = 0;
  await updateJob(job.id, {
    status: "capturing_videos",
    progress: {
      stage: "capturing_videos",
      pages_discovered: pages.length,
      pages_processed_images: imagePageCount,
      pages_processed_videos: videoPageCount,
    },
  });

  for (const page of pages) {
    const assetsDelta = makeVideoAssets(job, page);
    allAssets.push(...assetsDelta);
    videoPageCount += 1;
    await updateJob(job.id, {
      progress: {
        stage: "capturing_videos",
        pages_discovered: pages.length,
        pages_processed_images: imagePageCount,
        pages_processed_videos: videoPageCount,
      },
      assets_delta: assetsDelta,
    });
    await sleep(250);
  }

  await updateJob(job.id, {
    status: "post_processing",
    progress: {
      stage: "post_processing",
      pages_discovered: pages.length,
      pages_processed_images: imagePageCount,
      pages_processed_videos: videoPageCount,
    },
  });
  await sleep(300);

  const manifest = createManifest(
    {
      id: job.id,
      client_name: job.client_name,
      site_url: job.site_url,
      mockup_mode: job.mockup_mode,
      status: "done",
    },
    pages,
    allAssets,
    []
  );

  await updateJob(job.id, {
    status: "done",
    progress: {
      stage: "done",
      pages_discovered: pages.length,
      pages_processed_images: imagePageCount,
      pages_processed_videos: videoPageCount,
    },
    manifest,
  });
}

async function runLoop() {
  console.log(`[worker] online id=${WORKER_ID} api=${API_BASE_URL}`);

  while (true) {
    try {
      const job = await claimJob();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      console.log(`[worker] claimed job ${job.id}`);
      try {
        await processJob(job);
        console.log(`[worker] done job ${job.id}`);
      } catch (error) {
        console.error(`[worker] failed job ${job.id}`, error);
        await updateJob(job.id, {
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "worker_unknown_error",
        });
      }
    } catch (error) {
      console.error("[worker] loop error", error);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

runLoop().catch((error) => {
  console.error("[worker] fatal", error);
  process.exitCode = 1;
});
