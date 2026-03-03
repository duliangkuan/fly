import { NextRequest, NextResponse } from 'next/server';
import HTMLtoDOCX from 'html-to-docx';

export async function POST(req: NextRequest) {
  try {
    const { html, title } = await req.json();

    if (!html) {
      return NextResponse.json({ error: '缺少 HTML 内容' }, { status: 400 });
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${title || '飞机日报'}</title>
  <style>
    body { font-family: "SimSun", Arial, sans-serif; font-size: 13px; color: #000; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 6px 0; }
    th, td { border: 1px solid #000; padding: 4px 8px; text-align: center; vertical-align: middle; }
    th { font-weight: bold; background-color: #f3f4f6; }
    h1 { font-size: 20px; font-weight: bold; margin: 10px 0 6px; }
    h2 { font-size: 16px; font-weight: bold; margin: 8px 0 4px; }
    h3 { font-size: 14px; font-weight: 600; margin: 6px 0 3px; }
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    p { margin: 3px 0; }
    ul { list-style: disc; padding-left: 20px; margin: 4px 0; }
    ol { list-style: decimal; padding-left: 20px; margin: 4px 0; }
    li { margin: 2px 0; }
    hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
    button { display: none; }
  </style>
</head>
<body>${html}</body>
</html>`;

    const buffer = await HTMLtoDOCX(fullHtml, null, {
      orientation: 'portrait',
      pageNumber: false,
      skipFirstHeaderFooter: true,
      font: 'SimSun',
      fontSize: 26,
      table: { row: { cantSplit: false } },
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    });

    // Normalise to Buffer regardless of what html-to-docx returns
    let nodeBuffer: Buffer;
    if (Buffer.isBuffer(buffer)) {
      nodeBuffer = buffer as Buffer;
    } else if (buffer instanceof ArrayBuffer) {
      nodeBuffer = Buffer.from(buffer);
    } else {
      nodeBuffer = Buffer.from(await (buffer as Blob).arrayBuffer());
    }

    // ── Return base64 JSON instead of binary stream ──────────────────────────
    // Reason: ReadableStream / binary responses on localhost HTTP can be
    // intercepted or partially delivered, causing Chrome "network error".
    // JSON is always received fully and correctly by fetch().
    return NextResponse.json({
      base64: nodeBuffer.toString('base64'),
      filename: `${title || '飞机日报'}.docx`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
