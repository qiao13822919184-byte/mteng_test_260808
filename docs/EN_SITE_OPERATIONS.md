# 裕明兴英文站运维与发布手册

## 本轮交付

代码位于 `feat/en-seo-foundation` 分支。正式网站由 GitHub `main` 推送后自动构建并部署；CMS 也写入 `main`。审阅本分支时请勿在正式后台改同名英文数据，避免后续合并冲突。本地 Node 22.12+ 执行 `npm ci`、`npm run verify`、`npm run preview -- --host 127.0.0.1`。`verify` 运行发布逻辑测试、Astro 构建和静态全站审计。CMS 本地地址 `/admin/`，依赖浏览器授权本地仓库；测试库仅验证字段和保存，不能替代 GitHub 写入测试。

## 页面与内容

英文基础路由：`/en/`、`/en/products/`、`/en/stainless-steel-cutlery/`、`/en/stainless-steel-kitchen-utensils/`、`/en/hotel-restaurant-cutlery/`、`/en/oem-odm-cutlery/`、`/en/factory/`、`/en/quality-compliance/`、`/en/about/`、`/en/contact/`、`/en/blog/`。另有 7 个英文产品详情和首篇采购指南。首页、核心页、产品及文章分别从 `src/data/en`、`src/content/products-en`、`src/content/blog-en` 读取。CMS 提供对应英文 collection，中文 collection 保留。`status=published`、`draft=false` 且 `publishAt` 不在未来时，才进入页面和 sitemap。未来时间不会自动触发 GitHub Pages 构建，届时需新提交或手动触发部署流程。

每篇英文文章写清适用采购问题、具体型号/材料部件、决策步骤、内部相关链接、作者、事实来源及审核日期；避免每日批量泛文。产品上新优先补齐 SKU、各部件材质/尺寸/重量、图片英文 alt、可核实 MOQ/交期、包装与目的市场文件。CMS 中保存草稿后先看预览、检查采购事实、再转 published。中英文互为翻译的条目才填写相同 `translationKey`；非对译页使用语言切换到另一语言首页。

## 询价

目前 `/en/contact/` 只组装邮件或 WhatsApp 内容，客户仍须在自己的客户端点击发送；没有持久化表单服务、附件接收、服务端回执或已交付统计。页面已如实提示。若选择独立表单服务，需明确接收地址、附件限制、反垃圾、隐私告知和回执，再改为真正的提交事件。当前统计名称 `rfq_handoff_en` 仅代表开始交接，不代表成交或已收到询盘。

## 发布流程

1. 在分支查看 `git diff main...feat/en-seo-foundation` 和本轮审核报告，核实事实登记表。
2. 推送分支、审阅 PR 和构建检查；确认没有公开私人物料和秘密。合并 `main` 会立即触发生产部署。
3. 合并后检查 GitHub Pages workflow 成功，抽查 `/`、`/en/`、英文产品、文章、联系页、`/admin/`；提交 `https://www.mteng.ltd/sitemap-index.xml` 至 Search Console 与 Bing Webmaster Tools。
4. 在正式 CMS 建一条英文草稿，核对保存到 GitHub 与预览；需要发布时完成审核并监控部署。
5. 每周按 Search Console 查询/页面/国家、有效索引、真实询盘质量回顾；每月复核过期报告、MOQ/交期、断链、图片权属和语言对应。

## 增长实验（8–12 周）

先补第一方证据：工厂过程和真实照片、检测文件适用范围、分部件规格、包装与样品过程。再按 cutlery / flatware / silverware、kitchenware / kitchen utensils 与目标买家场景扩展栏目，不做同义词换词薄页。采购指南每篇回答一个真实问题，关联具体产品及询价。外部档案（LinkedIn、展会、行业平台）统一法定主体、品牌、地址和官网，能核实再发表。衡量展示量、合格访问、产品/目录/样品操作和合格 RFQ；排名和 AI 推荐不是可保证结果。

当前生产合并前必须由站主审阅，因为 `main` 自动上线。证据未到时，Factory 与 Quality 页面保持谨慎表述；后续补证据时再增强，而非先写数字或认证。
