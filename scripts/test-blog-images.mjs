import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareBlogImage, imageBudget } from './optimize-blog-images.mjs';

const source = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#918779' } }).png().toBuffer();
const variants = await prepareBlogImage(source);
assert.deepEqual(variants.map(v => v.width), [480, 800, 1200]);
for (const v of variants) {
  const decoded = await sharp(v.buffer).metadata();
  assert.equal(decoded.format, 'webp');
  assert.equal(decoded.width, v.width);
  assert.equal(decoded.height, v.height);
  assert.ok(v.bytes <= imageBudget(v.width));
}
const small = await sharp(source).resize(320).png().toBuffer();
assert.deepEqual((await prepareBlogImage(small)).map(v => v.width), [320], 'Small originals must never upscale');
assert.deepEqual((await prepareBlogImage(source)).map(v => v.src), variants.map(v => v.src), 'Unchanged inputs must have stable URLs');
const changed = await sharp(source).negate().png().toBuffer();
assert.notEqual((await prepareBlogImage(changed))[0].src, variants[0].src, 'Changed pixels must invalidate cache URLs');
await assert.rejects(() => prepareBlogImage(Buffer.from('broken PNG')), 'Corrupt uploads must block publishing');
console.log('PASS: responsive dimensions, WebP decoding, budgets, no upscaling, stable/cache-busting URLs, corrupt uploads.');
