import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const input='public/uploads',output=path.join(input,'responsive');
await fs.mkdir(output,{recursive:true});
// Existing catalogue images only: never generate evidence of factories or certificates.
const files=(await fs.readdir(input)).filter(f=>/^(flatware-portuguese-|kitchenware-ymx-)/.test(f)&&f.endsWith('.webp'));
const manifest={};
for(const file of files){
 const meta=await sharp(path.join(input,file)).metadata();
 manifest['/uploads/'+file]=[];
 for(const width of [...new Set([480,800,1200].map(w=>Math.min(w,meta.width)))]){
 const target=path.join(output,file.replace(/\.webp$/,`-${width}.webp`));
 await sharp(path.join(input,file)).resize({width,withoutEnlargement:true}).webp({quality:80}).toFile(target);
 manifest['/uploads/'+file].push({src:'/uploads/responsive/'+path.basename(target),width});
 }
}
await fs.writeFile('src/data/image-variants.json',JSON.stringify(manifest,null,2));
console.log(`Prepared responsive sizes for ${files.length} existing catalogue images.`);
