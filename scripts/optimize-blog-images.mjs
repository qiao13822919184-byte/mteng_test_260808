import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { load } from 'js-yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
export const imageBudget = width => width <= 800 ? 200_000 : 350_000;

// Also used by the daily publisher before it writes either language to the site.
export async function prepareBlogImage(input) {
  const bytes = Buffer.isBuffer(input) ? input : await fs.readFile(input);
  const meta = await sharp(bytes).rotate().toBuffer({ resolveWithObject: true });
  if (meta.info.width < 1 || meta.info.height < 1) throw new Error('Invalid blog image dimensions');
  const widths = [...new Set([480, 800, 1200].map(w => Math.min(w, meta.info.width)))];
  const variants = [];
  for (const width of widths) {
    let result;
    for (const quality of [80, 75, 70, 65]) {
      result = await sharp(bytes).rotate().resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
      if (result.data.length <= imageBudget(width)) break;
    }
    if (result.data.length > imageBudget(width)) throw new Error(`Blog image exceeds ${imageBudget(width)} bytes at ${width}px; simplify the source image`);
    const digest = createHash('sha256').update(result.data).digest('hex').slice(0, 20);
    variants.push({ src: `/uploads/blog-responsive/${digest}-${width}.webp`, width: result.info.width,
      height: result.info.height, bytes: result.data.length, buffer: result.data });
  }
  return variants;
}

async function walk(dir) {
  return (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
}

export async function optimizeBlogImages() {
  const covers = new Set();
  for (const collection of ['blog', 'blog-en']) {
    for (const file of (await walk(path.join(root, 'src/content', collection))).filter(f => /\.mdx?$/.test(f))) {
      const text = await fs.readFile(file, 'utf8');
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) throw new Error(`Missing frontmatter: ${file}`);
      const cover = load(match[1])?.cover;
      if (cover) covers.add(cover);
    }
  }
  const manifest = {};
  const output = path.join(root, 'public/uploads/blog-responsive');
  await fs.mkdir(output, { recursive: true });
  for (const cover of [...covers].sort()) {
    if (typeof cover !== 'string' || !cover.startsWith('/uploads/')) throw new Error(`Blog cover must be a local /uploads/ asset: ${cover}`);
    const input = path.resolve(root, 'public', '.' + decodeURIComponent(cover));
    if (!input.startsWith(path.resolve(root, 'public/uploads') + path.sep)) throw new Error(`Invalid cover path: ${cover}`);
    const variants = await prepareBlogImage(input);
    for (const v of variants) await fs.writeFile(path.join(root, 'public', v.src), v.buffer);
    manifest[cover] = variants.map(({ buffer, ...v }) => v);
  }
  // Only publish the manifest after every cover passes. Originals are never rewritten.
  const manifestFile = path.join(root, 'src/data/blog-image-variants.json');
  const temporary = `${manifestFile}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n');
  await fs.rename(temporary, manifestFile);
  console.log(`Prepared ${covers.size} blog covers; ${Object.values(manifest).flat().length} responsive variants.`);
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await optimizeBlogImages();
