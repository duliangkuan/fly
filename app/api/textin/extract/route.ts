import { NextRequest, NextResponse } from 'next/server';

const TEXTIN_APP_ID = process.env.TEXTIN_APP_ID!;
const TEXTIN_SECRET_CODE = process.env.TEXTIN_SECRET_CODE!;
const TEXTIN_URL = 'https://api.textin.com/ai/service/v1/pdf_to_markdown';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();

    const textinRes = await fetch(TEXTIN_URL, {
      method: 'POST',
      headers: {
        'x-ti-app-id': TEXTIN_APP_ID,
        'x-ti-secret-code': TEXTIN_SECRET_CODE,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!textinRes.ok) {
      const errText = await textinRes.text();
      return NextResponse.json(
        { error: `TextIn API 错误: ${textinRes.status} - ${errText}` },
        { status: 500 }
      );
    }

    const result = await textinRes.json();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
