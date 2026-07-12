import { mkdirSync, createWriteStream, existsSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

const OUTPUT_DIR = join(import.meta.dirname, '..', 'zips');

const FILES = [
    'index.js',
    'config.json',
    'package.json',
    'prisma.config.ts',
    '.env'
];

const FOLDERS = [
    'commands',
    'events',
    'function',
    'utils',
    'prisma',
    'trigger'
];

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
const zipName = `DisBot-${timestamp}.zip`;
const output = createWriteStream(join(OUTPUT_DIR, zipName));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`Archive created: ${zipName}`);
    console.log(`Total bytes: ${archive.pointer()}`);
});

archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn(err.message);
    } else {
        throw err;
    }
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

for (const file of FILES) {
    const filePath = join(__dirname, file);
    if (existsSync(filePath)) {
        archive.file(filePath, { name: file });
    } else {
        // console.warn(`Skipping missing file: ${file}`);
    }
}

for (const folder of FOLDERS) {
    const folderPath = join(__dirname, folder);
    if (existsSync(folderPath)) {
        archive.directory(folderPath, folder);
    } else {
        // console.warn(`Skipping missing folder: ${folder}`);
    }
}

archive.finalize();



