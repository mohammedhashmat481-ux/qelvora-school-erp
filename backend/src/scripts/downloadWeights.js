import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const weightsDir = path.resolve(__dirname, '../models/face-weights');

// Ensure directories exist
if (!fs.existsSync(weightsDir)) {
  fs.mkdirSync(weightsDir, { recursive: true });
}

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1'
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading face-api.js model weights to:', weightsDir);
  for (const filename of files) {
    const fileUrl = `${BASE_URL}/${filename}`;
    const destPath = path.join(weightsDir, filename);
    
    if (fs.existsSync(destPath)) {
      console.log(`- ${filename} already exists, skipping.`);
      continue;
    }
    
    console.log(`- Downloading ${filename}...`);
    try {
      await downloadFile(fileUrl, destPath);
      console.log(`  Successfully downloaded ${filename}`);
    } catch (e) {
      console.error(`  Error downloading ${filename}:`, e.message);
      process.exit(1);
    }
  }
  console.log('All weights downloaded successfully.');
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default main;
