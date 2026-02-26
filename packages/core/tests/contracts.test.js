import test from "node:test";
import assert from "node:assert/strict";
import { isValidMockupMode, VIDEO_VIEWPORTS } from "../src/contracts.js";

test("accepts the two MVP mockup modes", () => {
  assert.equal(isValidMockupMode("video_with_mockup_image_without"), true);
  assert.equal(isValidMockupMode("image_with_mockup_video_without"), true);
});

test("rejects unsupported mockup modes", () => {
  assert.equal(isValidMockupMode("both_with_mockup"), false);
  assert.equal(isValidMockupMode("none"), false);
  assert.equal(isValidMockupMode(""), false);
});

test("video viewports are only desktop and mobile", () => {
  assert.deepEqual(VIDEO_VIEWPORTS, ["desktop", "mobile"]);
});
