export const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      site_url TEXT NOT NULL,
      mockup_mode TEXT NOT NULL,
      status TEXT CHECK(status IN ('queued', 'crawling', 'capturing_images', 'capturing_videos', 'post_processing', 'capturing', 'paused', 'cancelled', 'done', 'failed')) NOT NULL,
      total_pages INTEGER DEFAULT 0,
      processed_pages INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME,
      error_message TEXT,
      cloud_url TEXT
  );

  CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      url TEXT NOT NULL,
      slug TEXT NOT NULL,
      depth INTEGER NOT NULL,
      status TEXT NOT NULL,
      skip_reason TEXT,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      type TEXT NOT NULL,
      variant TEXT NOT NULL,
      viewport TEXT NOT NULL,
      fold_index INTEGER,
      path TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      size_bytes INTEGER,
      FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  );

  -- Indexing for performance
  CREATE INDEX IF NOT EXISTS idx_pages_job ON pages(job_id);
  CREATE INDEX IF NOT EXISTS idx_assets_job ON assets(job_id);
  CREATE INDEX IF NOT EXISTS idx_assets_page ON assets(page_id);
`;
