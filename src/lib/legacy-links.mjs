import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
// Astro bundles this helper into dist/.prerender before generating pages.
// npm scripts run at the project root; source paths must not follow the bundle.
const root=process.cwd();
const origin='https://www.mteng.ltd';
const normalize=p=>p==='/'?'/':p.replace(/\/+$/,'')+'/';
// Match collection schema defaults before deriving the static route inventory.
// English entries require both draft:false and status:published explicitly.
export function isMigrationEntryPublished(data, locale='zh-CN', now=new Date()) {
 const english=locale==='en';
 const draft=data.draft ?? english;
 const status=data.status ?? (english?'draft':'published');
 const scheduled=data.publishAt||data.date;
 return !draft && status==='published' && (!scheduled || (!Number.isNaN(+new Date(scheduled)) && new Date(scheduled)<=now));
}
let cached;
export function migrationRoutes() {
 if(cached)return cached;
 const en=new Set(['/','/about/','/contact/','/products/','/blog/','/stainless-steel-cutlery/','/stainless-steel-kitchen-utensils/']);
 const zh=new Set([...en].map(p=>'/cn'+p));
 const pairs=new Map();for(const p of en){pairs.set(p,'/cn'+p);pairs.set('/cn'+p,p);}
 for(const folder of ['products','blog']) {
  const read=dir=>readdirSync(path.join(root,'src/content',dir)).filter(f=>f.endsWith('.md')).map(f=>{
   const raw=readFileSync(path.join(root,'src/content',dir,f),'utf8');
   const d=yaml.load(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]||'')||{};
   return {id:f.slice(0,-3),data:d,slug:d.slug||f.slice(0,-3)};
  }).filter(p=>isMigrationEntryPublished(p.data,dir.endsWith('-en')?'en':'zh-CN'));
  const left=read(folder),right=read(folder+'-en');
  for(const p of left)zh.add(`/cn/${folder}/${p.slug}/`);
  for(const p of right)en.add(`/${folder}/${p.slug}/`);
  for(const p of right){const z=left.find(x=>(x.data.translationKey||x.id)===p.data.translationKey);if(z){const a=`/${folder}/${p.slug}/`,b=`/cn/${folder}/${z.slug}/`;pairs.set(a,b);pairs.set(b,a);}}
 }
 const pages=JSON.parse(readFileSync(path.join(root,'src/data/en/pages.json'),'utf8')).pages;
 for(const p of pages.filter(p=>isMigrationEntryPublished(p,'en')))if(p.slug!=='factory')en.add(`/${p.slug}/`);
 return cached={en,zh,pairs};
}
export function localizeLink(value,locale='en') {
 if(typeof value!=='string'||!value.startsWith('/')&&!value.startsWith(origin+'/')&&!value.startsWith('https://mteng.ltd/'))return value;
 const u=new URL(value,origin);
 if(!['www.mteng.ltd','mteng.ltd'].includes(u.hostname)||/\.[a-z0-9]+$/i.test(u.pathname))return value;
 if(/^\/(uploads|admin|brand|_astro)\//.test(u.pathname))return value;
 let bare=normalize(u.pathname.replace(/^\/(en|cn)(?=\/|$)/,'')||'/');
 if(bare==='/factory/')bare='/about/';
 if(bare==='/products/'&&['flatware-sets','kitchenware-sets'].includes(u.searchParams.get('cat'))){bare=u.searchParams.get('cat')==='flatware-sets'?'/stainless-steel-cutlery/':'/stainless-steel-kitchen-utensils/';u.searchParams.delete('cat');}
 const {en,zh,pairs}=migrationRoutes();
 let target=locale==='en'?bare:('/cn'+bare);
 if(locale!=='en'&&pairs.has(bare))target=pairs.get(bare);
 if(locale==='en'&&pairs.has('/cn'+bare))target=pairs.get('/cn'+bare);
 if(!en.has(target)&&!zh.has(target))target=en.has(bare)?bare:zh.has('/cn'+bare)?'/cn'+bare:target;
 return target+u.search+u.hash;
}
export default function remarkLocalizedLinks() {
 return (tree,file)=>{
  const locale=String(file.path||'').replaceAll('\\','/').includes('-en/')?'en':'zh-CN';
  const visit=node=>{
   if((node.type==='link'||node.type==='definition')&&node.url)node.url=localizeLink(node.url,locale);
   if(node.type==='html')node.value=node.value.replace(/(href=["'])([^"']+)(["'])/g,(_,a,b,c)=>a+localizeLink(b,locale)+c);
   for(const child of node.children||[])visit(child);
  };visit(tree);
 };
}
