# 博客图片发布流程

2026-10-05：博客封面统一使用构建期生成的 WebP 衍生图。

- 原始封面保存在 `public/uploads/`，文章 `cover` 继续引用原图，兼容 CMS、社交分享和历史链接。
- `npm run dev` / `npm run build` 的前置步骤读取中英全部博客封面，生成 480/800/1200 宽度（不放大）、真实高度和内容哈希 URL。
- 首页、博客列表使用 `BlogImage`，最多 800px；详情设置 `detail`，最多 1200px，首图 eager/high。
- 800px 及以下最多 200,000 字节，1200px 最多 350,000 字节；超限或缺图导致构建失败。保留源稿，修正图片后重跑。
- 生成目录 `public/uploads/blog-responsive/` 和映射 `src/data/blog-image-variants.json` 被 Git 忽略。CI 从提交的原图生成，不需人工提交衍生文件。
- 新增封面后运行 `npm run optimize:blog-images` 可刷新开发预览；发布必须运行 `npm run verify`，不要直接调用 `astro build`。
- `npm run test:site` 检查首页及中英博客页面没有直接展示原封面、srcset 文件存在、尺寸及字节符合限制。社交分享和结构化数据继续使用原图。
- 发布前检查压缩图片主体和文字清晰度；上线后检查真实 HTML 的 src/srcset 和对应 WebP 响应，不能只用本地构建推断上线。

日更主规则：父目录 `YMX_Blog_Content_Kit_20260927/博客存储0929/RULE/可复制提示词.md`。导入工具在写入前调用同一压缩函数预检源图；每次 CI 构建自动执行本流程。
