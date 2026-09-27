import zh from '../data/site.json';
import en from '../data/en/site.json';
import { getCollection } from 'astro:content';
import { canonicalPath, entrySlug, isPublished } from './publishing';
export const getSite = (locale = 'zh-CN') => locale === 'en' ? en : zh;
export const prefix = (locale = 'zh-CN') => locale === 'en' ? '/en' : '';
export const labels = (locale = 'zh-CN') => locale === 'en'
  ? { home:'Home', products:'Products', blog:'Buyer Guides', about:'About', contact:'Contact', quote:'Request a Quote', details:'View details', phone:'Phone', wechat:'WeChat', rights:'All rights reserved.', menu:'Open menu', wa:'WhatsApp Yumingxing' }
  : { home:'首页', products:'产品', blog:'博客', about:'关于我们', contact:'联系我们', quote:'询价', details:'查看详情', phone:'电话', wechat:'微信', rights:'版权所有.', menu:'打开菜单', wa:'WhatsApp 询价' };

// Product/guide alternates are emitted only when both published collections contain
// an explicit shared identity. An untranslated page has a homepage switch only.
let pairPromise: Promise<Map<string,string>> | undefined;
async function pairs() {
  if (!pairPromise) pairPromise = (async () => {
    const map = new Map<string,string>();
    for (const [a,b] of [['/','/en/'],['/products/','/en/products/'],['/blog/','/en/blog/'],['/about/','/en/about/'],['/contact/','/en/contact/']]) { map.set(a,b); map.set(b,a); }
    for (const [zhName,enName,folder] of [['products','productsEn','products'],['blog','blogEn','blog']] as const) {
      const [left,right] = await Promise.all([getCollection(zhName,isPublished),getCollection(enName,isPublished)]);
      for (const item of right) {
        if (!item.data.translationKey) continue;
        const match=left.find(p => (p.data.translationKey || p.id) === item.data.translationKey);
        if (!match) continue;
        const a=`/${folder}/${match.id}/`, b=`/en/${folder}/${entrySlug(item)}/`;
        map.set(a,b); map.set(b,a);
      }
    }
    return map;
  })();
  return pairPromise;
}
export async function localeLinks(path: string, locale: string) {
  const current=canonicalPath(path), alternate=(await pairs()).get(current);
  return { alternate, switchUrl: alternate || (locale === 'en' ? '/' : '/en/'),
    zh: locale === 'en' ? alternate : current, en: locale === 'en' ? current : alternate };
}
