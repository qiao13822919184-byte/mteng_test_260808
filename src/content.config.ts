import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 产品集合：每个产品 = src/content/products 下的一个 .md 文件
// 后台 (/admin) 以「文件夹集合」方式管理，可单独新增/删除/上传图片

const optionalDate=z.preprocess(v=>v===''||v===null?undefined:v,z.coerce.date().optional());
const publishing = {
 draft:z.boolean().default(false), status:z.enum(['draft','approved','published']).default('published'), publishAt:optionalDate, translationKey:z.string().optional(), dateModified:optionalDate,
};
const documentSchema=z.object({name:z.string(),number:z.string(),date:z.string(),scope:z.string(),issuer:z.string().optional(),expiry:z.string().optional(),sku:z.string().optional(),material:z.string().optional(),market:z.string().optional(),file:z.string().optional(),url:z.string().optional(),visibility:z.enum(['internal','public']).default('internal'),status:z.enum(['current','archived']).default('current')});
const enBase={...publishing,draft:z.boolean().default(true),status:z.enum(['draft','approved','published']).default('draft'),locale:z.literal('en').default('en'),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string(),description:z.string().optional(),...Object.fromEntries(["sku","model","seoTitle","metaDescription","h1","lastReviewed","color","edge","tine","handleConstruction","logoPosition","pcsPerCarton","cartonSize","grossWeight","netWeight","cbm","moqStock","moqLogo","moqCustomMold","sampleAvailability","sampleFee","sampleLeadTime","toolingFee","toolingRefundPolicy","productionLeadTime","paymentTerms","loadingPort","aql","tolerances"].map(k=>[k,z.string().optional()]))};
const productsEn=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/products-en'}),schema:z.object({...enBase,summary:z.string(),category:z.enum(['flatware-sets','kitchenware-sets']),images:z.array(z.object({file:z.string(),alt:z.string().min(3),caption:z.string().optional(),originalVerified:z.boolean().default(false)})).min(1),material:z.string().optional(),finish:z.string().optional(),moq:z.string().optional(),countryOfOrigin:z.string().optional(),...Object.fromEntries(["buyerSegments","useCases","setComposition","logoMethods","artworkFormats","packagingOptions","incoterms","qcCheckpoints","relatedProducts"].map(k=>[k,z.array(z.string()).default([])])),components:z.array(z.object({name:z.string(),materialGrade:z.string().optional(),length:z.string().optional(),width:z.string().optional(),thickness:z.string().optional(),weight:z.string().optional()})).default([]),specs:z.array(z.object({label:z.string(),value:z.string()})).default([]),documents:z.array(documentSchema).default([]),faq:z.array(z.object({q:z.string(),a:z.string()})).default([]),featured:z.boolean().default(false),order:z.number().default(99)})});
const blogEn=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/blog-en'}),schema:z.object({...enBase,date:z.coerce.date(),author:z.string().default('Yumingxing'),reviewer:z.string().optional(),cover:z.string().optional(),coverAlt:z.string().optional(),tags:z.array(z.string()).default([]),topic:z.string().optional(),sources:z.array(z.object({label:z.string(),url:z.string().url()})).default([]),relatedProducts:z.array(z.string()).default([])})});

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    ...publishing,
    title: z.string(),
    category: z.string(), // 对应 src/data/categories.json 的 slug
    summary: z.string(),
    images: z.array(z.string()).default([]),
    material: z.string().optional(),
    moq: z.string().optional(),
    leadTime: z.string().optional(),
    finish: z.string().optional(),
    // 额外规格行（可选）：[{ label: "容量", value: "..." }]
    specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

// 博客集合：每篇文章 = src/content/blog 下的一个 .md 文件
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    ...publishing,
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    author: z.string().default('Yumingxing'),
    cover: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { products, blog, productsEn, blogEn };
