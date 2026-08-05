// One-off/occasional script (not part of the build) — extracts a representative
// poster frame for each gallery video into src/assets/gallery/reels-posters/,
// matched by filename to src/assets/gallery/reels/. Re-run after adding new
// videos: `npm run generate:posters`. Requires ffmpeg installed locally
// (`brew install ffmpeg`) — not a Cloudflare Pages build dependency.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videosDir = path.join(__dirname, '../src/assets/gallery/reels');
const postersDir = path.join(__dirname, '../src/assets/gallery/reels-posters');

mkdirSync(postersDir, { recursive: true });

const videoFiles = readdirSync(videosDir).filter((f) => f.toLowerCase().endsWith('.mp4'));

for (const file of videoFiles) {
  const base = file.replace(/\.mp4$/i, '');
  const outPath = path.join(postersDir, `${base}.jpg`);
  if (existsSync(outPath)) {
    console.log(`skip (exists): ${base}.jpg`);
    continue;
  }
  // "thumbnail" filter scans a batch of frames and picks a representative
  // one, avoiding black/fade-in intro frames common in Reels exports.
  execFileSync('ffmpeg', [
    '-i', path.join(videosDir, file),
    '-vf', 'thumbnail,scale=640:-1',
    '-frames:v', '1',
    '-q:v', '4',
    '-y',
    outPath,
  ], { stdio: 'inherit' });
  console.log(`generated: ${base}.jpg`);
}
