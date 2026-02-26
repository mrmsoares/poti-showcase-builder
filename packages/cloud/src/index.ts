import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Define the absolute path to the credentials file (resolved relative to the monorepo root)
const CREDENTIALS_PATH = path.resolve(process.cwd(), 'service-account.json');

/**
 * Initializes and returns the Google Drive API client using the Service Account.
 */
function getDriveClient() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`Google Service Account credentials not found at ${CREDENTIALS_PATH}. Please provide service-account.json in the monorepo root.`);
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    return google.drive({ version: 'v3', auth });
}

/**
 * Uploads a file to a specific Google Drive folder.
 * 
 * @param filePath The absolute path of the file to upload (e.g., zip archive).
 * @param folderId The target Google Drive folder ID.
 * @returns The WebViewLink URL of the uploaded file on Google Drive.
 */
export async function uploadToGoogleDrive(filePath: string, folderId: string): Promise<string> {
    const drive = getDriveClient();
    const fileName = path.basename(filePath);

    if (!fs.existsSync(filePath)) {
        throw new Error(`File to upload not found: ${filePath}`);
    }

    console.log(`[Cloud] Uploading ${fileName} to Google Drive folder: ${folderId}`);

    try {
        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };
        const media = {
            mimeType: 'application/zip',
            body: fs.createReadStream(filePath)
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        if (!response.data.id) {
            throw new Error(`Google Drive returned empty ID for uploaded file ${fileName}`);
        }

        // Set permissions so anyone with the link can view (important for sharing the final showcase export)
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log(`[Cloud] Upload successful! Link: ${response.data.webViewLink}`);
        return response.data.webViewLink as string;

    } catch (error) {
        console.error('[Cloud] Error uploading file to Google Drive:', error);
        throw error;
    }
}
