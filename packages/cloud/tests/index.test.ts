import assert from "node:assert/strict";
import test from "node:test";

import {
  isRetryableDriveError,
  readUploadRetryConfig,
} from "../src/index.ts";

test("readUploadRetryConfig usa defaults seguros quando env ausente", () => {
  const config = readUploadRetryConfig({});

  assert.equal(config.maxRetries, 2);
  assert.equal(config.baseDelayMs, 1000);
  assert.equal(config.maxDelayMs, 8000);
});

test("readUploadRetryConfig ignora valores inválidos", () => {
  const config = readUploadRetryConfig({
    GDRIVE_UPLOAD_MAX_RETRIES: "-10",
    GDRIVE_UPLOAD_RETRY_BASE_MS: "abc",
    GDRIVE_UPLOAD_RETRY_MAX_MS: "0",
  });

  assert.equal(config.maxRetries, 2);
  assert.equal(config.baseDelayMs, 1000);
  assert.equal(config.maxDelayMs, 8000);
});

test("isRetryableDriveError retorna true para erros transitórios HTTP 503", () => {
  const error = {
    response: {
      status: 503,
    },
  };

  assert.equal(isRetryableDriveError(error), true);
});

test("isRetryableDriveError retorna false para quota de service account", () => {
  const error = {
    response: {
      status: 403,
      data: {
        error: {
          errors: [{ reason: "storageQuotaExceeded" }],
        },
      },
    },
  };

  assert.equal(isRetryableDriveError(error), false);
});
