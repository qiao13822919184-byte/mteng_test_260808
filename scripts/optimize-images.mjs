import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const uploadsDirectory = fileURLToPath(new URL('../public/uploads/', import.meta.url));
const imageNames = (await readdir(uploadsDirectory)).filter(
  (name) => path.extname(name).toLowerCase() === '.png',
);

if (!imageNames.length) {
  console.log('No PNG images found in public/uploads.');
  process.exit(0);
}

for (const name of imageNames) {
  const input = path.join(uploadsDirectory, name);
  const output = path.join(uploadsDirectory, `${path.basename(name, path.extname(name))}.webp`);
  const before = (await stat(input)).size;

  await sharp(input)
    .rotate()
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(output);

  const after = (await stat(output)).size;
  const saved = Math.round((1 - after / before) * 100);
  console.log(`${name} -> ${path.basename(output)} (${saved}% smaller)`);
}
