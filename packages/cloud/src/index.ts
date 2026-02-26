import fs from "fs";
import path from "path";
import { drive_v3, google } from "googleapis";

const DEFAULT_CREDENTIALS_PATH = path.resolve(process.cwd(), "service-account.json");
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded", "backendError", "internalError"]);
const NON_RETRYABLE_REASONS = new Set([
    "storageQuotaExceeded",
    "insufficientPermissions",
    "insufficientFilePermissions",
    "notFound",
    "fileNotFound",
    "cannotShareAcrossDomains",
    "domainPolicy",
]);

export interface UploadRetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

export interface UploadToGoogleDriveResult {
    cloudUrl: string;
    warnings: string[];
}

function resolveCredentialsPath(env: NodeJS.ProcessEnv = process.env): string {
    const explicitPath = env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (!explicitPath) {
        return DEFAULT_CREDENTIALS_PATH;
    }

    return path.isAbsolute(explicitPath) ? explicitPath : path.resolve(process.cwd(), explicitPath);
}

function getDriveClient(): drive_v3.Drive {
    const credentialsPath = resolveCredentialsPath();

    if (!fs.existsSync(credentialsPath)) {
        throw new Error(
            `[Cloud] Credenciais Google não encontradas em ${credentialsPath}. Defina GOOGLE_APPLICATION_CREDENTIALS ou forneça service-account.json na raiz do projeto.`,
        );
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
}

function parseInteger(rawValue: string | undefined, fallback: number): number {
    if (!rawValue) {
        return fallback;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

export function readUploadRetryConfig(env: NodeJS.ProcessEnv = process.env): UploadRetryConfig {
    const maxRetriesRaw = env.GDRIVE_UPLOAD_MAX_RETRIES;
    const maxRetriesParsed = Number.parseInt(maxRetriesRaw ?? "", 10);
    const maxRetries = Number.isFinite(maxRetriesParsed) && maxRetriesParsed >= 0 ? maxRetriesParsed : 2;

    const baseDelayMs = parseInteger(env.GDRIVE_UPLOAD_RETRY_BASE_MS, 1000);
    const maxDelayMsCandidate = parseInteger(env.GDRIVE_UPLOAD_RETRY_MAX_MS, 8000);
    const maxDelayMs = Math.max(baseDelayMs, maxDelayMsCandidate);

    return {
        maxRetries,
        baseDelayMs,
        maxDelayMs,
    };
}

function extractErrorReasons(error: unknown): string[] {
    const apiErrors = (error as any)?.response?.data?.error?.errors;
    if (!Array.isArray(apiErrors)) {
        return [];
    }

    return apiErrors
        .map((item: any) => (typeof item?.reason === "string" ? item.reason : ""))
        .filter((reason: string) => reason.length > 0);
}

function getErrorStatus(error: unknown): number | undefined {
    const status = (error as any)?.response?.status;
    return typeof status === "number" ? status : undefined;
}

function errorToMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export function isRetryableDriveError(error: unknown): boolean {
    const reasons = extractErrorReasons(error);
    if (reasons.some((reason) => NON_RETRYABLE_REASONS.has(reason))) {
        return false;
    }

    const status = getErrorStatus(error);
    if (status && RETRYABLE_STATUS_CODES.has(status)) {
        return true;
    }

    if (reasons.some((reason) => RETRYABLE_REASONS.has(reason))) {
        return true;
    }

    const message = errorToMessage(error).toLowerCase();
    if (message.includes("etimedout") || message.includes("econnreset") || message.includes("socket hang up")) {
        return true;
    }

    return false;
}

function computeBackoffDelayMs(retryIndex: number, config: UploadRetryConfig): number {
    const exponential = config.baseDelayMs * (2 ** Math.max(retryIndex - 1, 0));
    const bounded = Math.min(config.maxDelayMs, exponential);
    const jitter = Math.floor(Math.random() * Math.floor(config.baseDelayMs / 2));
    return bounded + jitter;
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry<T>(label: string, config: UploadRetryConfig, operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const canRetry = isRetryableDriveError(error) && attempt < config.maxRetries;
            if (!canRetry) {
                throw error;
            }

            const delay = computeBackoffDelayMs(attempt + 1, config);
            console.warn(
                `[Cloud] ${label} falhou (${attempt + 1}/${config.maxRetries + 1}). Retentando em ${delay}ms. Motivo: ${errorToMessage(error)}`,
            );
            await sleep(delay);
        }
    }

    throw new Error("[Cloud] Falha inesperada na rotina de retry.");
}

async function validateSharedDriveFolder(
    drive: drive_v3.Drive,
    folderId: string,
    retryConfig: UploadRetryConfig,
): Promise<void> {
    const response = await runWithRetry("Validação da pasta de destino no Drive", retryConfig, async () => {
        return drive.files.get({
            fileId: folderId,
            supportsAllDrives: true,
            fields: "id,name,mimeType,driveId",
        });
    });

    if (response.data.mimeType !== FOLDER_MIME_TYPE) {
        throw new Error(`[Cloud] O destino ${folderId} não é uma pasta do Google Drive.`);
    }

    if (!response.data.driveId) {
        throw new Error(
            `[Cloud] A pasta ${folderId} não pertence a um Shared Drive. Service Accounts não possuem quota em My Drive. Use Shared Drive e adicione a conta de serviço como membro.`,
        );
    }
}

export async function uploadToGoogleDrive(filePath: string, folderId: string): Promise<UploadToGoogleDriveResult> {
    const drive = getDriveClient();
    const fileName = path.basename(filePath);
    const retryConfig = readUploadRetryConfig();
    const warnings: string[] = [];

    if (!fs.existsSync(filePath)) {
        throw new Error(`[Cloud] Arquivo para upload não encontrado: ${filePath}`);
    }

    await validateSharedDriveFolder(drive, folderId, retryConfig);

    console.log(`[Cloud] Uploading ${fileName} to Google Drive folder: ${folderId}`);

    const uploadResponse = await runWithRetry("Upload do arquivo no Google Drive", retryConfig, async () => {
        return drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media: {
                mimeType: "application/zip",
                body: fs.createReadStream(filePath),
            },
            supportsAllDrives: true,
            fields: "id,webViewLink,webContentLink",
        });
    });

    const fileId = uploadResponse.data.id;
    if (!fileId) {
        throw new Error(`[Cloud] Google Drive retornou ID vazio para ${fileName}.`);
    }

    const cloudUrl =
        uploadResponse.data.webViewLink ??
        uploadResponse.data.webContentLink ??
        `https://drive.google.com/file/d/${fileId}/view`;

    try {
        await runWithRetry("Aplicação de permissão pública no Google Drive", retryConfig, async () => {
            await drive.permissions.create({
                fileId,
                supportsAllDrives: true,
                requestBody: {
                    role: "reader",
                    type: "anyone",
                },
            });
        });
    } catch (error) {
        const warning =
            `[Cloud] Upload concluído, mas não foi possível habilitar permissão pública (anyone-reader). ` +
            `O domínio pode bloquear compartilhamento público. Detalhe: ${errorToMessage(error)}`;
        warnings.push(warning);
        console.warn(warning);
    }

    console.log(`[Cloud] Upload successful! Link: ${cloudUrl}`);
    return { cloudUrl, warnings };
}
