export function slugify(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildAssetName({
  clientName,
  pageSlug,
  media,
  viewport,
  variant,
  index,
  extension,
}) {
  const safeClient = slugify(clientName);
  const safePage = slugify(pageSlug);
  const safeExt = extension.startsWith(".") ? extension.slice(1) : extension;

  return `${safeClient}__${safePage}__${media}__${viewport}__${variant}__${index}.${safeExt}`;
}
