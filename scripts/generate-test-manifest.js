
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const samplesDir = path.join(__dirname, '../public/test_samples');
const manifestPath = path.join(__dirname, '../public/test_manifest.json');

try {
    if (!fs.existsSync(samplesDir)) {
        console.log('Creating test_samples directory...');
        fs.mkdirSync(samplesDir, { recursive: true });
    }

    const files = fs.readdirSync(samplesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.wav', '.mp3', '.ogg', '.m4a'].includes(ext);
    });

    const manifest = {
        files: files
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generated with ${files.length} files at ${manifestPath}`);
} catch (error) {
    console.error('Error generating manifest:', error);
    process.exit(1);
}
