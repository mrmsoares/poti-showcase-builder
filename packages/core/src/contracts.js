export const MOCKUP_MODES = Object.freeze([
  "video_with_mockup_image_without",
  "image_with_mockup_video_without",
]);

export const VIDEO_VIEWPORTS = Object.freeze(["desktop", "mobile"]);

export const IMAGE_VIEWPORTS = Object.freeze([
  "desktop",
  "notebook",
  "tablet",
  "mobile",
]);

export function isValidMockupMode(value) {
  return typeof value === "string" && MOCKUP_MODES.includes(value);
}

export function isValidHttpUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
