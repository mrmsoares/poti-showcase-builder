export function createManifest(job, pages = [], assets = [], errors = []) {
  return {
    job_id: job.id,
    client_name: job.client_name,
    site_url: job.site_url,
    mockup_mode: job.mockup_mode,
    status: job.status,
    generated_at: new Date().toISOString(),
    pages,
    assets,
    errors,
  };
}
