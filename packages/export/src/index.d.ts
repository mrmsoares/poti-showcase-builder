export interface JobManifest {
    jobId: string;
    clientName: string;
    siteUrl: string;
    metrics: {
        startTime: string;
        endTime: string;
        durationSeconds: number;
        totalBytes: number;
        viewsProcessed: number;
        imagesGenerated: number;
        videosGenerated: number;
        errors: string[];
    };
    views: Record<string, any>;
}
export declare function generateManifest(jobId: string, clientName: string, siteUrl: string, outputDir: string, startTime: Date, errors?: string[]): Promise<void>;
export declare function createArchive(sourceDir: string, jobSlug: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map