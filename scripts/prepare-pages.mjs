import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const basePath = `/${(process.env.PAGES_BASE_PATH || '').replace(/^\/+|\/+$/g, '')}`;
if (basePath === '/') {
  console.log('PAGES_BASE_PATH is empty; keeping root-relative URLs unchanged.');
  process.exit(0);
}

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const rootRelativeAttribute = /(\b(?:href|src|action|poster|data-image)=["'])\/(?!\/)/g;
let rewrittenFiles = 0;
let rewrittenUrls = 0;

async function rewriteDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewriteDirectory(absolutePath);
      continue;
    }
    if (path.extname(entry.name).toLowerCase() !== '.html') continue;

    const source = await readFile(absolutePath, 'utf8');
    let matches = 0;
    const output = source.replace(rootRelativeAttribute, (match, attribute) => {
      matches += 1;
      return `${attribute}${basePath}/`;
    });

    if (matches) {
      await writeFile(absolutePath, output);
      rewrittenFiles += 1;
      rewrittenUrls += matches;
    }
  }
}

await rewriteDirectory(distDirectory);
console.log(`Prepared ${rewrittenFiles} HTML files for ${basePath} (${rewrittenUrls} URLs).`);
