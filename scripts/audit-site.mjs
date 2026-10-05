import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
import * as yaml from 'js-yaml';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk('dist').filter(f=>f.endsWith('.html')&&!f.includes(`${path.sep}admin${path.sep}`));
const nodes=n=>[n,...(n.childNodes||[]).flatMap(nodes)];
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const byTag=(ns,t)=>ns.filter(n=>n.tagName===t);
const errors=[],warnings=[],pages=[];
const check=(test,message)=>{if(!test)errors.push(message)};
const origin='https://www.mteng.ltd';
const blogImages=JSON.parse(fs.readFileSync('src/data/blog-image-variants.json','utf8'));
const routes=new Map(files.map(file=>['/'+path.relative('dist',file).replaceAll(path.sep,'/').replace(/index\.html$/,''),file]));
const normal=p=>p.endsWith('/')?p:p+'/';
for(const [route,file] of routes){
 const html=fs.readFileSync(file,'utf8'),all=nodes(parse(html)),title=text(byTag(all,'title')[0]||{}),canonical=all.find(n=>n.tagName==='link'&&attr(n,'rel')==='canonical');
 const is404=route==='/404.html';
 if(is404){check(html.includes('noindex'),'404 must be noindex');check(!canonical,'404 must not declare a canonical');continue;}
 check(title.length>0,`${route}: missing title`);
 check(byTag(all,'h1').length===1,`${route}: H1 count must be one`);
 check(attr(canonical,'href')===origin+route,`${route}: canonical mismatch`);
 check(all.some(n=>n.tagName==='meta'&&attr(n,'name')==='description'&&attr(n,'content')),`${route}: description missing`);
 check(!/noindex/.test(all.filter(n=>n.tagName==='meta'&&attr(n,'name')==='robots').map(n=>attr(n,'content')).join('')),`${route}: unexpected noindex`);
 const schemas=[];
 for(const n of byTag(all,'script').filter(n=>attr(n,'type')==='application/ld+json')){try{schemas.push(JSON.parse(text(n)))}catch{errors.push(`${route}: invalid JSON-LD`)}}
 const org=schemas.find(s=>s['@type']==='Organization');check(org?.['@id']===origin+'/#organization',`${route}: organisation identity missing`);
 for(const schema of schemas){if(schema['@type']==='Product'){check(!schema.offers&&!schema.aggregateRating&&!schema.review,`${route}: unexpected commercial claims`);check(schema.image.every(i=>i.startsWith('https://')),`${route}: relative schema image`);}}
 const alts=all.filter(n=>n.tagName==='link'&&attr(n,'hreflang'));
 for(const alt of alts){const u=new URL(attr(alt,'href'));check(routes.has(u.pathname),`${route}: alternate missing ${u.pathname}`);if(u.pathname!==route&&attr(alt,'hreflang')!=='x-default'&&routes.has(u.pathname)){const peer=fs.readFileSync(routes.get(u.pathname),'utf8');check(peer.includes(`href="${origin+route}"`),`${route}: missing reciprocal alternate`)}}
 for(const n of all.filter(n=>n.tagName==='a'||n.tagName==='img'||n.tagName==='script'||n.tagName==='link')){
   const ref=attr(n,n.tagName==='a'||n.tagName==='link'?'href':'src');if(!ref||ref.startsWith('#')||/^(mailto:|tel:|data:)/.test(ref))continue;
   const u=new URL(ref,origin+route);if(u.origin!==origin)continue;
   const p=decodeURIComponent(u.pathname),exists=routes.has(normal(p))||fs.existsSync(path.join('dist',p));
   check(exists,`${route}: broken ${n.tagName} ${ref}`);
 }
 for(const image of byTag(all,'img')){
   check(attr(image,'alt')!==undefined,`${route}: image missing alt`);
   if(['/','/en/'].includes(route)||/^\/(en\/)?blog\//.test(route))check(!blogImages[attr(image,'src')],`${route}: blog cover is loading its original instead of a thumbnail`);
   if(attr(image,'data-blog-image')){
     const variants=(attr(image,'srcset')||'').split(',').map(s=>s.trim().split(/\s+/));
     check(!!attr(image,'sizes')&&!!attr(image,'width')&&!!attr(image,'height'),`${route}: responsive blog image dimensions missing`);
     const detail=attr(image,'data-blog-image')==='detail';
     for(const [src,descriptor] of variants){
       const width=Number(descriptor?.replace(/w$/,''));
       const asset=path.join('dist',src);
       check(src.startsWith('/uploads/blog-responsive/')&&src.endsWith('.webp'),`${route}: unexpected blog image ${src}`);
       check(width>0&&width<=(detail?1200:800),`${route}: oversized blog image candidate ${descriptor}`);
       check(fs.existsSync(asset),`${route}: missing srcset asset ${src}`);
       if(fs.existsSync(asset))check(fs.statSync(asset).size<=(width<=800?200_000:350_000),`${route}: blog image exceeds transfer budget ${src}`);
     }
     check(variants.some(([src])=>src===attr(image,'src')),`${route}: blog fallback must also be an optimized variant`);
     if(detail)check(attr(image,'loading')==='eager',`${route}: article cover must not be lazy loaded`);
   }
 }
 if(route.startsWith('/en/')){
   check(attr(byTag(all,'html')[0],'lang')==='en',`${route}: incorrect lang`);
   const body=byTag(all,'body')[0];
   function visible(n){if(['script','style','noscript'].includes(n.tagName))return '';if(n.nodeName==='#text')return n.value;return(n.childNodes||[]).map(visible).join(' ')}
   const chinese=visible(body).replaceAll('中文','').match(/[\u4e00-\u9fff]+/g);check(!chinese,`${route}: Chinese UI ${chinese?.join(',')}`);
   check(!/\[TO VERIFY\]|Internal draft|No\.1|SGS certified|FDA certified|Made in Portugal|60\+|20\+/.test(visible(body)),`${route}: forbidden/draft claim`);
 }
 pages.push({route,title,jsonLd:schemas.map(s=>s['@type']),alternates:alts.length});
}
const sitemap=fs.readFileSync('dist/sitemap-0.xml','utf8');
const mapUrls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
for(const route of routes.keys())if(route!=='/404.html')check(mapUrls.includes(origin+route),`${route}: absent from sitemap`);
for(const url of mapUrls)check(routes.has(new URL(url).pathname)&&!/admin|今日份|%E4%BB%8A|\?/.test(url),`Sitemap has invalid URL: ${url}`);
for(const dir of ['products-en','blog-en'])for(const f of walk(`src/content/${dir}`)){
 const d=yaml.load(fs.readFileSync(f,'utf8').split('---')[1]),url=`/en/${dir==='products-en'?'products':'blog'}/${d.slug}/`;
 if(d.draft||d.status!=='published'||(d.publishAt&&new Date(d.publishAt)>new Date()))check(!routes.has(url),`Unpublished entry leaked: ${url}`);
}
const config=yaml.load(fs.readFileSync('public/admin/config.yml','utf8'));
check(config.backend.repo==='qiao13822919184-byte/mteng_test_260808'&&config.backend.branch==='main','CMS backend changed');
for(const name of ['settings','products','blog','englishSettings','englishHome','englishPages','productsEn','blogEn'])check(config.collections.some(c=>c.name===name),`Missing CMS collection ${name}`);
function checkFields(node,trail='CMS'){if(!node||typeof node!=='object')return;if(node.fields){const names=node.fields.map(f=>f.name);check(names.length===new Set(names).size,`Duplicate field: ${trail}`);}for(const [key,value] of Object.entries(node)){if(Array.isArray(value))value.forEach(v=>checkFields(v,trail+'/'+(v?.name||key)));else if(value&&typeof value==='object')checkFields(value,trail+'/'+key);}}
checkFields(config);
const titles=pages.map(p=>p.title);check(new Set(titles).size===titles.length,'Duplicate page titles');
const report={at:new Date().toISOString(),pages:pages.length,englishPages:pages.filter(p=>p.route.startsWith('/en/')).length,sitemapUrls:mapUrls.length,errors,warnings,details:pages};
fs.mkdirSync('docs/qa',{recursive:true});fs.writeFileSync('docs/qa/site-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({pages:report.pages,englishPages:report.englishPages,sitemapUrls:report.sitemapUrls,errors,warnings},null,2));
assert.equal(errors.length,0,'Site audit failed');

