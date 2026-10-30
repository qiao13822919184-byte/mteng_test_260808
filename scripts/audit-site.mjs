import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'parse5';
import * as yaml from 'js-yaml';
import { checkMigration } from './test-migration.mjs';

// Release contracts, not a search-ranking or real-user performance score.
const origin = 'https://www.mteng.ltd', legalName = '揭阳市裕明兴五金制品有限公司', creditCode = '91445200MA529NQG6E';
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const nodes = n => [n, ...(n.childNodes || []).flatMap(nodes), ...(n.content ? nodes(n.content) : [])];
const attr = (n, k) => n?.attrs?.find(a => a.name === k)?.value;
const text = n => n?.nodeName === '#text' ? n.value : (n?.childNodes || []).map(text).join('');
const byTag = (ns, t) => ns.filter(n => n.tagName === t);
const visible = n => ['script', 'style', 'noscript'].includes(n?.tagName) ? '' : n?.nodeName === '#text' ? n.value : (n?.childNodes || []).map(visible).join(' ');
const normal = p => p === '/' || path.extname(p) || p.endsWith('/') ? p : `${p}/`;
const errors = [], warnings = [], details = [];
const check = (test, message) => { if (!test) errors.push(message); };
const records = new Map();
for (const file of walk('dist').filter(f => f.endsWith('.html'))) {
  const route = '/' + path.relative('dist', file).replaceAll(path.sep, '/').replace(/index\.html$/, '');
  const html = fs.readFileSync(file, 'utf8'), all = nodes(parse(html));
  const refresh = all.find(n => n.tagName === 'meta' && attr(n, 'http-equiv')?.toLowerCase() === 'refresh');
  const rawTarget = attr(refresh, 'content')?.match(/^\s*0\s*;\s*url\s*=\s*["']?([^"']+?)["']?\s*$/i)?.[1];
  let target;
  try { if (rawTarget) target = new URL(rawTarget, origin + route).pathname; } catch { /* Checked below. */ }
  records.set(route, { route, file, html, all, target, refresh, kind: route.startsWith('/admin/') ? 'admin' : route === '/404.html' ? '404' : refresh ? 'redirect' : 'content' });
}
const content = new Map([...records].filter(([, r]) => r.kind === 'content'));
const blogImages = JSON.parse(fs.readFileSync('src/data/blog-image-variants.json', 'utf8'));
const diskPath = p => path.join('dist', decodeURIComponent(p).replace(/^\/+/, ''));
const localExists = p => records.has(normal(p)) || fs.existsSync(diskPath(p));
function readEntries(folder, language, type) {
  return walk(`src/content/${folder}`).filter(f => /\.md$/.test(f)).map(file => {
    const raw = fs.readFileSync(file, 'utf8'), front = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    assert(front, `Missing frontmatter: ${file}`);
    const data = yaml.load(front[1]), id = path.relative(`src/content/${folder}`, file).replaceAll(path.sep, '/').replace(/\.md$/, '');
    const scheduled = data.publishAt || data.date;
    const published = !(data.draft ?? (language === 'en')) && (data.status || (language === 'en' ? 'draft' : 'published')) === 'published' && (!scheduled || (!Number.isNaN(+new Date(scheduled)) && new Date(scheduled) <= new Date()));
    return { file, id, data, body: raw.slice(front[0].length), language, type, published, route: `${language === 'zh-CN' ? '/cn' : ''}/${type}/${data.slug || id}/` };
  });
}
const entries = [...readEntries('products', 'zh-CN', 'products'), ...readEntries('products-en', 'en', 'products'), ...readEntries('blog', 'zh-CN', 'blog'), ...readEntries('blog-en', 'en', 'blog')];
for (const language of ['en', 'zh-CN']) for (const type of ['products', 'blog']) {
  const group = entries.filter(e => e.language === language && e.type === type && e.published);
  const keys = group.map(e => e.data.translationKey || (language === 'zh-CN' ? e.id : null)).filter(Boolean);
  check(new Set(keys).size === keys.length, `${language}/${type}: duplicate published translationKey`);
  check(new Set(group.map(e => e.route)).size === group.length, `${language}/${type}: duplicate published slug`);
}
const pairs = new Map();
function addPair(en, zh) { pairs.set(en, zh); pairs.set(zh, en); }
for (const p of ['/', '/products/', '/blog/', '/about/', '/contact/', '/stainless-steel-cutlery/', '/stainless-steel-kitchen-utensils/']) addPair(p, '/cn' + p);
for (const e of entries.filter(e => e.language === 'en' && e.published && e.data.translationKey)) {
  const matches = entries.filter(z => z.language === 'zh-CN' && z.type === e.type && z.published && (z.data.translationKey || z.id) === e.data.translationKey);
  check(matches.length <= 1, `Ambiguous translationKey: ${e.type}/${e.data.translationKey}`);
  if (matches.length === 1) addPair(e.route, matches[0].route);
}
function jsonObjects(v) { return Array.isArray(v) ? v.flatMap(jsonObjects) : v && typeof v === 'object' ? [v, ...Object.values(v).flatMap(jsonObjects)] : []; }
for (const [route, record] of records) {
  const { all, kind, target } = record;
  const canonical = all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'canonical');
  const robots = all.filter(n => n.tagName === 'meta' && ['robots', 'googlebot', 'bingbot'].includes(attr(n, 'name')?.toLowerCase())).map(n => attr(n, 'content') || '').join(',').toLowerCase();
  if (kind === 'admin' || kind === '404') {
    check(robots.includes('noindex'), `${route}: private/404 page must be noindex`);
    check(canonical.length === 0, `${route}: private/404 page must not declare canonical`);
    continue;
  }
  if (kind === 'redirect') {
    check(!!target, `${route}: static redirect needs immediate meta refresh`);
    check(target !== route && content.has(target), `${route}: redirect must reach final content (${target})`);
    check(canonical.length === 1 && attr(canonical[0], 'href') === origin + target, `${route}: redirect canonical mismatch`);
    check(byTag(all, 'a').some(n => { try { return new URL(attr(n, 'href'), origin + route).pathname === target; } catch { return false; } }), `${route}: missing visible redirect fallback link`);
    continue;
  }
  const title = text(byTag(all, 'title')[0]), cn = route.startsWith('/cn/'), body = byTag(all, 'body')[0], main = byTag(all, 'main')[0];
  check(title.length > 0, `${route}: missing title`);
  check(byTag(all, 'h1').length === 1, `${route}: H1 count must be one`);
  check(canonical.length === 1 && attr(canonical[0], 'href') === origin + route, `${route}: canonical mismatch`);
  check(attr(byTag(all, 'html')[0], 'lang') === (cn ? 'zh-CN' : 'en'), `${route}: incorrect document language`);
  check(all.some(n => n.tagName === 'meta' && attr(n, 'name') === 'description' && attr(n, 'content')?.trim()), `${route}: description missing`);
  check(!/\b(noindex|none|nosnippet)\b/.test(robots), `${route}: content unintentionally excluded from indexing/snippets`);
  check(visible(main).trim().length > 80, `${route}: principal content absent from static HTML`);
  const navLinks = all.filter(n => n.tagName === 'a' && (attr(n, 'class') || '').split(/\s+/).includes('ymx-nav-link'));
  check(JSON.stringify(navLinks.map(text)) === JSON.stringify(cn ? ['首页', '产品', '博客', '关于我们', '联系我们'] : ['Home', 'Product', 'Blog', 'About', 'Contact']), `${route}: navigation labels differ from approved shared structure`);
  check(attr(navLinks[1], 'href') === `${cn ? '/cn' : ''}/products/`, `${route}: Product navigation must be a direct catalogue link`);
  const schemas = [];
  for (const node of byTag(all, 'script').filter(n => attr(n, 'type') === 'application/ld+json')) {
    try { schemas.push(JSON.parse(text(node))); } catch { check(false, `${route}: invalid JSON-LD`); }
  }
  const objects = schemas.flatMap(jsonObjects), org = objects.find(s => s['@type'] === 'Organization' && s['@id'] === origin + '/#organization');
  check(org?.name === 'Yumingxing' && org?.legalName === legalName, `${route}: organization names are inconsistent`);
  check([org?.identifier].flat().map(v => typeof v === 'string' ? v : v?.value).includes(creditCode), `${route}: organization credit code missing`);
  check(!org?.foundingDate, `${route}: business year must not become legal foundingDate`);
  check(!org?.sameAs || org.sameAs.length === 0, `${route}: sameAs needs separately confirmed account evidence`);
  for (const schema of objects) {
    if (schema['@type'] === 'Product') {
      check(!schema.offers && !schema.aggregateRating && !schema.review, `${route}: unsupported offer/rating/review claim`);
      check([schema.image].flat().filter(Boolean).every(i => (typeof i === 'string' ? i : i.url)?.startsWith('https://')), `${route}: relative Product image`);
    }
    for (const k of ['@id', 'url', 'item']) if (typeof schema[k] === 'string' && schema[k].startsWith(origin)) {
      const u = new URL(schema[k]);
      check(!u.pathname.startsWith('/en/') && !u.pathname.includes('/cn/cn/'), `${route}: old/malformed JSON-LD URL ${schema[k]}`);
      check(localExists(u.pathname), `${route}: missing JSON-LD target ${schema[k]}`);
    }
  }
  const alts = all.filter(n => n.tagName === 'link' && attr(n, 'rel') === 'alternate' && attr(n, 'hreflang'));
  const alternateMap = Object.fromEntries(alts.map(n => [attr(n, 'hreflang'), attr(n, 'href')]));
  check(alts.length === Object.keys(alternateMap).length, `${route}: duplicate hreflang`);
  const peer = pairs.get(route);
  if (peer) {
    const expected = { en: origin + (cn ? peer : route), 'zh-CN': origin + (cn ? route : peer), 'x-default': origin + (cn ? peer : route) };
    check(content.has(peer), `${route}: translated content missing (${peer})`);
    for (const [lang, url] of Object.entries(expected)) check(alternateMap[lang] === url, `${route}: ${lang} hreflang mismatch`);
    check(alts.length === 3, `${route}: paired page must have exactly en, zh-CN, x-default`);
  } else check(!alternateMap[cn ? 'en' : 'zh-CN'], `${route}: fabricated translation alternate`);
  for (const node of all) {
    const refs = ['href', 'src', 'poster', 'action'].map(k => attr(node, k)).filter(Boolean);
    if (attr(node, 'srcset')) refs.push(...attr(node, 'srcset').split(',').map(v => v.trim().split(/\s+/)[0]));
    for (const ref of refs) {
      if (ref.startsWith('#') || /^(mailto:|tel:|data:|javascript:)/.test(ref)) continue;
      let u;
      try { u = new URL(ref, origin + route); } catch { check(false, `${route}: malformed URL ${ref}`); continue; }
      if (u.origin !== origin) continue;
      check(!u.pathname.startsWith('/en/') && !u.pathname.includes('/cn/cn/'), `${route}: old/malformed internal URL ${ref}`);
      check(localExists(u.pathname), `${route}: broken ${node.tagName} ${ref}`);
      if (node.tagName === 'a') check(records.get(normal(u.pathname))?.kind !== 'redirect', `${route}: redirect detour ${ref}`);
    }
  }
  for (const image of byTag(all, 'img')) {
    check(attr(image, 'alt') !== undefined, `${route}: image missing alt`);
    if (['/', '/cn/'].includes(route) || /^\/(cn\/)?blog\//.test(route)) check(!blogImages[attr(image, 'src')], `${route}: original blog cover used instead of thumbnail`);
    if (!attr(image, 'data-blog-image')) continue;
    const variants = (attr(image, 'srcset') || '').split(',').map(s => s.trim().split(/\s+/)), detail = attr(image, 'data-blog-image') === 'detail';
    check(!!attr(image, 'sizes') && !!attr(image, 'width') && !!attr(image, 'height'), `${route}: responsive blog dimensions missing`);
    for (const [src, descriptor] of variants) {
      const width = Number(descriptor?.replace(/w$/, '')), asset = diskPath(src);
      check(src.startsWith('/uploads/blog-responsive/') && src.endsWith('.webp'), `${route}: unexpected blog image ${src}`);
      check(width > 0 && width <= (detail ? 1200 : 800), `${route}: oversized blog candidate ${descriptor}`);
      check(fs.existsSync(asset), `${route}: missing srcset asset ${src}`);
      if (fs.existsSync(asset)) check(fs.statSync(asset).size <= (width <= 800 ? 200_000 : 350_000), `${route}: blog image exceeds budget ${src}`);
    }
    check(variants.some(([src]) => src === attr(image, 'src')), `${route}: blog fallback must be optimized`);
    if (detail) check(attr(image, 'loading') === 'eager', `${route}: article cover must not be lazy loaded`);
  }
  if (!cn) {
    const clean = value => value.replaceAll(legalName, '').replaceAll('裕明兴', '').replaceAll('中文', '');
    const chinese = clean(visible(body)).match(/[\u4e00-\u9fff]+/g);
    check(!chinese, `${route}: Chinese UI ${chinese?.join(',')}`);
    for (const node of all.filter(n => attr(n, 'lang') !== 'zh-CN')) for (const key of ['placeholder', 'aria-label']) check(!/[\u4e00-\u9fff]/.test(clean(attr(node, key) || '')), `${route}: untranslated ${key}`);
    check(!/\[TO VERIFY\]|Internal draft|No\.1|SGS certified|FDA certified|Made in Portugal|60\+|20\+/.test(visible(body)), `${route}: forbidden/draft claim`);
  }
  details.push({ route, title, language: cn ? 'zh-CN' : 'en', jsonLd: schemas.map(s => s['@type']), alternates: alts.length });
}
const sitemapFiles = walk('dist').filter(f => /sitemap[^/\\]*\.xml$/.test(f) && !f.endsWith('sitemap-index.xml'));
const sitemapUrls = sitemapFiles.flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]));
check(sitemapUrls.length > 0, 'Sitemap is empty');
check(new Set(sitemapUrls).size === sitemapUrls.length, 'Duplicate sitemap URLs');
for (const route of content.keys()) check(sitemapUrls.includes(origin + route), `${route}: missing from sitemap`);
for (const url of sitemapUrls) {
  const u = new URL(url);
  check(u.origin === origin && content.has(u.pathname) && !u.search && !/今日份|%E4%BB%8A/i.test(url), `Sitemap contains non-content/invalid URL ${url}`);
}
for (const e of entries.filter(e => !e.published)) {
  check(!content.has(e.route), `Unpublished entry leaked: ${e.route}`);
  check(!sitemapUrls.includes(origin + e.route), `Unpublished entry in sitemap: ${e.route}`);
}
for (const page of JSON.parse(fs.readFileSync('src/data/en/pages.json', 'utf8')).pages) {
  if (page.draft || page.status && page.status !== 'published' || page.publishAt && new Date(page.publishAt) > new Date()) check(!content.has(`/${page.slug}/`), `Unpublished landing page leaked: /${page.slug}/`);
}
// Training opt-outs are independent of search and are not release failures.
const robotsText = fs.readFileSync('dist/robots.txt', 'utf8'), groups = []; let group;
for (const raw of robotsText.split(/\r?\n/)) {
  const line = raw.replace(/#.*/, '').trim(), colon = line.indexOf(':');
  if (colon < 0) continue;
  const key = line.slice(0, colon).toLowerCase(), value = line.slice(colon + 1).trim();
  if (key === 'user-agent') { if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); } group.agents.push(value.toLowerCase()); }
  else if (['allow', 'disallow'].includes(key) && group && value) group.rules.push({ allow: key === 'allow', value });
}
function allowed(agent, route) {
  const exact = groups.filter(g => g.agents.some(a => a !== '*' && agent.toLowerCase().includes(a)));
  const selected = exact.length ? exact : groups.filter(g => g.agents.includes('*'));
  const rules = selected.flatMap(g => g.rules).filter(r => new RegExp('^' + r.value.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')).test(route));
  rules.sort((a, b) => b.value.replaceAll('*', '').length - a.value.replaceAll('*', '').length || Number(b.allow) - Number(a.allow));
  return !rules.length || rules[0].allow;
}
check(groups.length > 0, 'robots.txt has no user-agent group');
check(robotsText.includes(`Sitemap: ${origin}/sitemap-index.xml`), 'robots.txt missing production sitemap');
for (const agent of ['Googlebot', 'bingbot', 'OAI-SearchBot']) for (const route of content.keys()) check(allowed(agent, route), `${agent} blocked for ${route}`);
const config = yaml.load(fs.readFileSync('public/admin/config.yml', 'utf8'));
check(config.backend.repo === 'qiao13822919184-byte/mteng_test_260808' && config.backend.branch === 'main', 'CMS backend changed');
for (const name of ['settings', 'products', 'blog', 'englishSettings', 'englishHome', 'englishPages', 'productsEn', 'blogEn']) check(config.collections.some(c => c.name === name), `Missing CMS collection ${name}`);
function checkFields(node, trail = 'CMS') {
  if (!node || typeof node !== 'object') return;
  if (node.fields) { const names = node.fields.map(f => f.name); check(names.length === new Set(names).size, `Duplicate field: ${trail}`); }
  for (const [key, value] of Object.entries(node)) if (Array.isArray(value)) value.forEach(v => checkFields(v, trail + '/' + (v?.name || key))); else if (value && typeof value === 'object') checkFields(value, trail + '/' + key);
}
checkFields(config);
for (const name of ['products', 'productsEn', 'blog', 'blogEn']) {
  const fields = config.collections.find(c => c.name === name)?.fields?.map(f => f.name) || [];
  for (const field of ['draft', 'status', 'publishAt', 'translationKey', 'dateModified']) check(fields.includes(field), `${name}: CMS lacks ${field}`);
  if (['blog', 'blogEn'].includes(name)) for (const field of ['locale', 'slug', 'coverAlt', 'relatedProducts']) check(fields.includes(field), `${name}: CMS loses authored field ${field}`);
}
check(new Set(details.map(p => p.title)).size === details.length, 'Duplicate content-page titles');
const releaseAudit = JSON.parse(fs.readFileSync('docs/release-20261030-audit.json', 'utf8'));
const migration = checkMigration({ records, entries, check, baseline: releaseAudit.routing.historicalBaseline });
const report = { at: new Date().toISOString(), pages: content.size, englishPages: details.filter(p => p.language === 'en').length, chinesePages: details.filter(p => p.language === 'zh-CN').length, staticRedirects: [...records.values()].filter(r => r.kind === 'redirect').length, sitemapUrls: sitemapUrls.length, errors, warnings, migration, details };
fs.mkdirSync('docs/qa', { recursive: true });
fs.writeFileSync('docs/qa/site-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, details: undefined }, null, 2));
assert.equal(errors.length, 0, 'Site audit failed');
