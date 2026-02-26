const EXCLUDED_PATH_PATTERNS = [
  /^\/blog(\/|$)/,
  /^\/categoria(\/|$)/,
  /^\/tag(\/|$)/,
  /^\/author(\/|$)/,
  /^\/wp-admin(\/|$)/,
  /^\/wp-login(\.php)?(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/login(\/|$)/,
  /^\/dashboard(\/|$)/,
];

const EXCLUDED_EXTENSIONS = [
  ".pdf",
  ".zip",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".svg",
  ".gif",
  ".mp4",
  ".webm",
];

export function normalizeUrlForCrawl(value) {
  const parsed = new URL(value);
  parsed.hash = "";
  parsed.search = "";

  // Normalize duplicate route forms: "/about/" => "/about"
  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  return parsed.toString();
}

export function shouldExcludePath(pathname) {
  let path = pathname.toLowerCase();
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    return true;
  }

  return EXCLUDED_EXTENSIONS.some((extension) => path.endsWith(extension));
}

export function isInternalPublicPage(baseUrl, candidateUrl) {
  try {
    const base = new URL(baseUrl);
    const candidate = new URL(candidateUrl, base);

    const sameHost =
      candidate.hostname.toLowerCase() === base.hostname.toLowerCase();
    const sameProtocol = candidate.protocol === base.protocol;

    if (!sameHost || !sameProtocol) {
      return false;
    }

    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") {
      return false;
    }

    if (shouldExcludePath(candidate.pathname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function buildCrawlKey(baseUrl, candidateUrl) {
  const absolute = new URL(candidateUrl, baseUrl).toString();
  return normalizeUrlForCrawl(absolute);
}
