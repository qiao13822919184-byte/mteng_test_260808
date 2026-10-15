# 产品上新工作流

本次目录更新：2026-10-16。网站使用 Astro 静态构建，GitHub main 的提交会触发 Pages 部署。后台 `/admin` 通过 Decap CMS 编辑同一仓库中的 Markdown 文件。

## 本次范围

| 来源分组 | 产品条目 | 网站分类 |
| --- | ---: | --- |
| Kitchenware | 11 | kitchenware-sets |
| 410 Featured Flatware | 15 | flatware-sets |
| 304 Featured Flatware | 10 | flatware-sets |
| 410 Serving Utensils | 1（36种组件） | flatware-sets |
| 430 Premium Serving Utensils | 1（25种组件） | flatware-sets |

共38款，每款有中文、英文两个文件。430 Featured Flatware、201 Featured Flatware、304 Bulk Flatware 不在本次范围。

## 内容和后台字段

- 中文：`src/content/products/<id>.md`，后台「产品」。
- 英文：`src/content/products-en/<id>.md`，后台「English — Products」。
- 两份内容使用相同 `translationKey`，英文 `slug` 与中文文件名一致，以生成正确的语言切换与 hreflang。
- 简介写入 `summary`，规格摘要写入 `material`、`finish`、`moq`、`specs`，组件表与询价说明写入 Markdown 正文（后台详细介绍/Body）。
- 中文 `images` 为路径列表；英文为 `{file, alt, originalVerified}` 对象列表，第一张即列表图。
- 公开发布要求 `draft: false`、`status: published`；如填写 `publishAt`，必须已到发布时间并重新构建。
- 中英文内容是独立记录，后台修改一边不会自动翻译另一边，需同步修改并提交。
- Serving Utensils 每套仅保留一张整组主图，正文用组件表说明，不增加拆分主件图片或独立组件产品。

## 图片

- 只上传从目录提取并压缩的 WebP 产品图，原始 PPTX、XLSX 和业务价格记录保留本地。
- 本批图片位于 `public/uploads/catalogue-20261016/`。每款一张1920×1440详情图及480/800宽度列表图；白底完整收纳原图，避免列表裁掉组件。
- `src/data/image-variants.json` 是现有产品响应式图片映射，本批映射与产品图片一并提交。它与自动生成且被忽略的博客图片映射不同。
- 后台选择不带 `-480`、`-800` 的主图路径。列表组件自动通过映射加载小图，详情页使用压缩主图。
- 后续新增或替换图片应使用新文件名，生成对应列表图并更新映射。仅在后台上传一张图片不会自动生成产品缩略图。
- 本批单张详情图小于130KB，800宽度列表图小于50KB。两种语言复用图片，不重复上传。

## 数据核对

- 图片及目录编号取最终英文目录，组件材质、重量以及厨具/Serving Utensils尺寸取指定参数表。
- 参数表存在重复编号：304系列采用目录的 C304-01A/01B、C304-02A/02B 分开管理。
- 餐具图片标注与表格尺寸存在差异，本批餐具文字表仅列组件、钢号和重量。尺寸待逐款核对后添加；不根据照片猜测精确尺寸。
- 304系列刀具按各行实际钢号填写，不能全部写成304。430 Serving Utensils 中蛋糕刀、牛排刀、主餐刀为420。
- 系列按实际组件行描述可选数量，不能把原表标题中的件数直接当成固定装箱套装。
- 保留原始图片上的标注；最终订单规格以确认的样品与报价为准。
- 业务价格、加价比例和内部档案不进入网站仓库。

## 替换及发布

1. 检查 Git 状态并读取最新远程，保留用户修改。
2. 备份旧内容，对同款产品可沿用网址并完整替换内容。此次葡式五件及2011、2032、2041、2142厨具沿用网址；旧2021、2024条目删除。
3. 准备中英文文件与压缩图，核对分类、型号、组件、材质和图片顺序。
4. 检查后台字段兼容、两种语言数量一致、图片预算、站内链接及结构化数据。
5. 阅读 `docs/blog-images.md`，执行 `npm run verify`。不要提交被忽略的博客缩略图和博客映射。
6. 浏览器检查列表、详情、中英文切换及手机显示，再提交并推送 GitHub。
7. 等待 Pages 部署成功，并核对线上HTML及实际图片响应。不能用本地构建成功代替上线确认。

原始资料、图片映射清单与核对记录位于仓库外的 `上新产品_1016`。旧内容备份位于仓库外的 `private-archive/product-replacement-20261016`，历史 Git 提交也可用于恢复。
