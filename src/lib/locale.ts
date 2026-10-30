import zh from '../data/site.json';
import en from '../data/en/site.json';
import identity from '../data/identity.json';
import { getCollection } from 'astro:content';
import { canonicalPath, entrySlug, isPublished } from './publishing';
export function getSite(locale = 'en') {
 const english=locale==='en',language=english?'en':'zh',data=english?en:zh;
 return {...data,brand:english?identity.brandEn:identity.brandZh,logoText:identity.brandEn,companyName:english?identity.companyNameEn:identity.legalNameZh,companyShort:english?identity.brandEn:identity.brandZh,creditCode:identity.creditCode,businessStartYear:identity.businessStartYear,foundedYear:String(identity.businessStartYear),description:data.description.replaceAll('裕明兴五金制品厂','裕明兴'),contact:{...data.contact,...identity.contact,addressLine:identity.address[language],addressFull:identity.address[language],businessHours:identity.businessHours[language]}};
}
export const prefix = (locale = 'en') => locale === 'en' ? '' : '/cn';
export const labels = (locale = 'zh-CN') => locale === 'en'
  ? { home:'Home', products:'Product', blog:'Blog', about:'About', contact:'Contact', quote:'Enquire', details:'View details', phone:'Phone', wechat:'WeChat', rights:'All rights reserved.', menu:'Open menu', wa:'WhatsApp Yumingxing' }
  : { home:'首页', products:'产品', blog:'博客', about:'关于我们', contact:'联系我们', quote:'询价', details:'查看详情', phone:'电话', wechat:'微信', rights:'版权所有.', menu:'打开菜单', wa:'WhatsApp 询价' };

// Product/guide alternates are emitted only when both published collections contain
// an explicit shared identity. An untranslated page has a homepage switch only.
let pairPromise: Promise<Map<string,string>> | undefined;
async function pairs() {
  if (!pairPromise) pairPromise = (async () => {
    const map = new Map<string,string>();
    for (const p of ['/','/products/','/blog/','/about/','/contact/','/stainless-steel-cutlery/','/stainless-steel-kitchen-utensils/']) { map.set(p,'/cn'+p); map.set('/cn'+p,p); }
    for (const [zhName,enName,folder] of [['products','productsEn','products'],['blog','blogEn','blog']] as const) {
      const [left,right] = await Promise.all([getCollection(zhName,isPublished),getCollection(enName,isPublished)]);
      for (const item of right) {
        if (!item.data.translationKey) continue;
        const match=left.find(p => (p.data.translationKey || p.id) === item.data.translationKey);
        if (!match) continue;
        const a=`/cn/${folder}/${entrySlug(match)}/`, b=`/${folder}/${entrySlug(item)}/`;
        map.set(a,b); map.set(b,a);
      }
    }
    return map;
  })();
  return pairPromise;
}
export async function localeLinks(path: string, locale: string) {
  const current=canonicalPath(path), alternate=(await pairs()).get(current);
  const fallback=current.includes('/blog/')?(locale==='en'?'/cn/blog/':'/blog/'):(locale==='en'?'/cn/':'/');
  return { alternate, switchUrl: alternate || fallback,
    zh: locale === 'en' ? alternate : current, en: locale === 'en' ? current : alternate };
}
