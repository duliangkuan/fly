# 飞机日报编辑器

基于 Next.js 构建的飞机日报在线编辑与导出工具。

## 功能

- **导入模板**：上传 Word/PDF，通过 TextIn API 解析全部内容（文字、表格、图片），直接导入编辑区
- **写入数据**：上传数据来源文档，自动提取数据并填入编辑区表格的对应字段
- **添加表格**：自定义行列数、字段行/字段列，创建空白表格
- **添加文本**：在文档任意位置添加/编辑文本块
- **导出**：一键导出为 PDF（保留排版）或 Word（可继续编辑）

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

### 方法一：Vercel CLI

```bash
npm install -g vercel
vercel
```

### 方法二：GitHub + Vercel Dashboard

1. 将项目推送到 GitHub
2. 在 [Vercel Dashboard](https://vercel.com) 导入仓库
3. 在 Project Settings → Environment Variables 添加以下变量：
   - `TEXTIN_APP_ID`：你的 TextIn App ID
   - `TEXTIN_SECRET_CODE`：你的 TextIn Secret Code
4. 点击 Deploy

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `TEXTIN_APP_ID` | TextIn API 应用 ID |
| `TEXTIN_SECRET_CODE` | TextIn API 密钥 |

本地开发在 `.env.local` 文件中配置（已自动创建，不会上传到 Git）。
