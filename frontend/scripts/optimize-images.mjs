/**
 * Reads generated assets from repo root, writes optimized copies to public/images.
 * Run from frontend: node scripts/optimize-images.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outDir = path.resolve(__dirname, '..', 'public', 'images');

const sources = [
  {
    from: path.join(repoRoot, 'hero-background.webp'),
    to: 'hero-background.webp',
    pipeline: (img) =>
      img
        .resize({ width: 2048, withoutEnlargement: true })
        .webp({ quality: 88, effort: 6 }),
  },
  {
    from: path.join(repoRoot, 'logo.png'),
    to: 'logo.webp',
    pipeline: (img) =>
      img.resize({ width: 256, withoutEnlargement: true }).webp({ quality: 90, effort: 6 }),
  },
  {
    from: path.join(repoRoot, 'logo.png'),
    to: 'favicon-32.png',
    pipeline: (img) =>
      img.resize({ width: 32, height: 32, fit: 'cover', position: 'centre' }).png({ compressionLevel: 9 }),
  },
  {
    from: path.join(repoRoot, 'pattern.jpeg'),
    to: 'pattern-tile.webp',
    pipeline: (img) =>
      img
        .resize({ width: 1024, height: 1024, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 90, effort: 6, smartSubsample: true }),
  },
  {
    from: path.join(repoRoot, 'add-new.png'),
    to: 'empty-promocode.webp',
    pipeline: (img) =>
      img.resize({ width: 560, withoutEnlargement: true }).webp({ quality: 85, effort: 6 }),
  },
  {
    from: path.join(repoRoot, 'shopping-bag.png'),
    to: 'empty-order.webp',
    pipeline: (img) =>
      img.resize({ width: 560, withoutEnlargement: true }).webp({ quality: 85, effort: 6 }),
  },
];

async function main() {
  const fs = await import('node:fs/promises');
  await fs.mkdir(outDir, { recursive: true });

  for (const { from, to, pipeline } of sources) {
    const img = sharp(from);
    const dest = path.join(outDir, to);
    await pipeline(img).toFile(dest);
    const st = await fs.stat(dest);
    console.log(`${to}\t${(st.size / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
