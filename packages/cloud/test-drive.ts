import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const CREDENTIALS_PATH = path.resolve(process.cwd(), '../../service-account.json');

async function testUpload() {
    try {
        console.log(`[Test] Carregando credenciais de: ${CREDENTIALS_PATH}`);

        const auth = new google.auth.GoogleAuth({
            keyFile: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const drive = google.drive({ version: 'v3', auth });

        // Crie um arquivo txt em memória para o teste
        const testFile = 'test-upload.txt';
        fs.writeFileSync(testFile, 'Upload com Subject Delegation v3');

        // Um ID aleato'rio apenas para bater na API e ver se passa do erro de cota
        const folderId = '1iTf51gL36c9jowjXlS03r0uC2jYmG7Xw';

        const fileMetadata = {
            name: 'test-upload.txt',
            parents: [folderId]
        };
        const media = {
            mimeType: 'text/plain',
            body: fs.createReadStream(testFile)
        };

        console.log('[Test] Tentando fazer upload com a flag supportsAllDrives & Subject Delegation...');

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            supportsAllDrives: true,
            fields: 'id, webViewLink, webContentLink',
        });

        console.log(`[Test] Upload OK! ID: ${response.data.id}`);
        fs.unlinkSync(testFile);

    } catch (error: any) {
        console.error('[Test] ERRO DE COTA/API:', error.response?.data?.error || error.message);
    }
}

testUpload();
