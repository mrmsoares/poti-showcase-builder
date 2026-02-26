import { z } from 'zod';

export const CreateJobSchema = z.object({
    client_name: z.string().min(1, "O nome do cliente é obrigatório"),
    site_url: z.string().url("A URL do site deve ser válida"),
    mockup_mode: z.enum(['all', 'images_only', 'videos_only', 'none', 'individual', 'group']).default('all'),
});

export const JobResponseSchema = z.object({
    job_id: z.string().uuid(),
    status: z.enum(['queued', 'crawling', 'capturing_images', 'capturing_videos', 'post_processing', 'capturing', 'paused', 'cancelled', 'done', 'failed']),
    message: z.string(),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;
