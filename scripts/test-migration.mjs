// Release-specific contracts run by audit-site.mjs after Astro builds dist.
const attr = (n, k) => n?.attrs?.find(a => a.name === k)?.value;
const nodes = n => [n, ...(n?.childNodes || []).flatMap(nodes)];
const byId = (record, id) => record?.all.find(n => attr(n, 'id') === id);
const tags = (node, tag) => node ? nodes(node).filter(n => n.tagName === tag) : [];
const text = node => node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(text).join('');
// Exclude the translated component-name column before comparing physical data.
const cells = body => body.split(/\r?\n/).filter(line => /^\s*\|/.test(line)).map(line => line.trim().split('|').slice(2, -1).map(cell => (cell.match(/\d+(?:[.,]\d+)?/g) || []).join(','))).filter(row => row.some(Boolean));
const numbers = value => (String(value || '').replace(/(\d),(?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) || []).map(Number);

export function checkMigration({ records, entries, check, baseline = [] }) {
  const bodyPages = new Map([...records].filter(([, r]) => r.kind === 'content'));
  const redirectTargets = new Map([...records].filter(([, r]) => r.kind === 'redirect').map(([p, r]) => [p, r.target]));
  const ensureRedirect = (from, target) => check(redirectTargets.get(from) === target, `${from}: expected direct static redirect to ${target}`);
  const titles = {
    '/': 'Stainless Steel Cutlery Manufacturer in China | Yumingxing',
    '/products/': 'Cutlery & Kitchen Utensil Catalogue | Yumingxing',
    '/stainless-steel-cutlery/': 'Wholesale Stainless Steel Cutlery | Yumingxing',
    '/stainless-steel-kitchen-utensils/': 'Stainless Steel Kitchen Utensils Manufacturer | Yumingxing',
    '/about/': 'Company & Manufacturing Information | Yumingxing',
    '/contact/': 'Request a Wholesale Cutlery Quote | Yumingxing',
    '/blog/': 'Cutlery Sourcing Guides for Importers | Yumingxing',
    '/oem-odm-cutlery/': 'OEM & Private Label Cutlery | Yumingxing',
    '/quality-compliance/': 'Cutlery Specifications & Documents | Yumingxing',
    '/products/c304-00-304-flatware/': 'Matte Stainless Steel Flatware C304-00 | Yumingxing',
  };
  for (const [route, title] of Object.entries(titles)) check(text(records.get(route)?.all.find(n => n.tagName === 'title')) === title, `${route}: approved SEO title differs`);
  for (const old of baseline) {
    if (old.kind === 'content') check(bodyPages.has(old.old), `${old.old}: historical Chinese URL must be reused by English content, not redirected`);
    else ensureRedirect(old.old, old.final);
  }
  ensureRedirect('/en/', '/');
  ensureRedirect('/en/about/', '/about/');
  ensureRedirect('/en/factory/', '/about/');
  ensureRedirect('/factory/', '/about/');
  for (const [from, target] of redirectTargets) if (from.startsWith('/en/')) check(target === (from === '/en/factory/' ? '/about/' : from.slice(3)), `${from}: wrong English migration target`);
  for (const slug of ['how-to-choose-stainless-steel-flatware', 'oem-odm-cutlery-customization', 'stainless-flatware-wholesale-faq']) ensureRedirect(`/blog/${slug}/`, `/cn/blog/${slug}/`);
  for (const route of bodyPages.keys()) check(!route.startsWith('/en/') && !route.includes('/cn/cn/'), `${route}: obsolete content route`);
  // Assert each original English content path has a working historical alias.
  for (const e of entries.filter(e => e.language === 'en' && e.published)) ensureRedirect('/en' + e.route, e.route);
  const productPairs = [];
  for (const en of entries.filter(e => e.language === 'en' && e.type === 'products' && e.published)) {
    const zh = entries.find(e => e.language === 'zh-CN' && e.type === 'products' && e.published && (e.data.translationKey || e.id) === en.data.translationKey);
    check(!!zh, `${en.route}: missing published Chinese product counterpart`);
    if (!zh) continue;
    check(en.data.category === zh.data.category, `${en.route}: bilingual category mismatch`);
    check(JSON.stringify(cells(en.body)) === JSON.stringify(cells(zh.body)), `${en.route}: bilingual physical table values differ`);
    check(JSON.stringify(numbers(en.data.moq)) === JSON.stringify(numbers(zh.data.moq)), `${en.route}: bilingual MOQ numbers differ`);
    check(JSON.stringify(numbers(en.data.material)) === JSON.stringify(numbers(zh.data.material)), `${en.route}: bilingual material grades differ`);
    check(bodyPages.has(en.route) && bodyPages.has(zh.route), `${en.route}: product counterpart not generated`);
    productPairs.push(en.data.translationKey);
  }
  const featured = [];
  for (const prefix of ['', '/cn']) {
    const home = records.get(prefix + '/'), main = home?.all.find(n => n.tagName === 'main');
    check((main?.childNodes || []).filter(n => n.tagName === 'section').length === 11, `${prefix || '/'}: expected eleven homepage sections`);
    const cards = tags(byId(home, 'featured-products'), 'a').filter(n => /\/products\/[^/]+\/$/.test(attr(n, 'href') || ''));
    check(cards.length === 8, `${prefix || '/'}: expected eight homepage product cards, found ${cards.length}`);
    featured.push(cards.map(n => attr(n, 'href').replace(/^\/cn\//, '/')));
    const about = records.get(prefix + '/about/');
    check(tags(byId(about, 'manufacturing-capabilities'), 'img').length === 6, `${prefix}/about/: expected six process photographs`);
    const form = byId(records.get(prefix + '/contact/'), 'inquiry-form');
    const fields = [...tags(form, 'input'), ...tags(form, 'textarea')].map(n => attr(n, 'name')).sort();
    check(JSON.stringify(fields) === JSON.stringify(['company', 'message', 'name', 'product', 'qty']), `${prefix}/contact/: original five-field form changed`);
    check(tags(form, 'button').filter(n => attr(n, 'type') === 'submit').length === 1, `${prefix}/contact/: expected one WhatsApp submit action`);
    const language = prefix ? 'zh-CN' : 'en';
    for (const [slug, category] of [['products', null], ['stainless-steel-cutlery', 'flatware-sets'], ['stainless-steel-kitchen-utensils', 'kitchenware-sets']]) {
      const page = records.get(`${prefix}/${slug}/`), main = page?.all.find(n => n.tagName === 'main');
      const productCards = tags(main, 'a').filter(n => (attr(n, 'class') || '').split(/\s+/).includes('card-hover') && /\/products\/[^/]+\/$/.test(attr(n, 'href') || ''));
      const expected = entries.filter(e => e.type === 'products' && e.language === language && e.published && (!category || e.data.category === category)).length;
      check(productCards.length === expected, `${prefix}/${slug}/: catalog count ${productCards.length}, expected ${expected}`);
      check(!tags(main, 'button').some(n => ['All', '全部'].includes(text(n).trim())), `${prefix}/${slug}/: removed All filter returned`);
    }
  }
  check(JSON.stringify(featured[0]) === JSON.stringify(featured[1]), 'Homepage versions show different featured product models/order');
  return { historicalUrlsChecked: baseline.length, historicalChineseUrlsReused: baseline.filter(r => r.kind === 'content').length, productPairsChecked: productPairs.length, featuredModels: featured[0], redirectMethod: 'static meta refresh; files do not implement HTTP 301/308' };
}
