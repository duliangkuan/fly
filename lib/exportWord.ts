'use client';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Convert a base64 string to a Blob with the correct MIME type.
 */
function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Trigger a file download via FileReader data URL.
 *
 * Why not createObjectURL?
 * Chrome on HTTP (localhost included) sometimes blocks blob:// URL downloads
 * with "没有权限" or "network error" because the user-gesture context is lost
 * after an async fetch. A data: URL is resolved synchronously by the browser
 * and is not subject to the same security gate.
 */
function downloadViaDataUrl(blob: Blob, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.setAttribute('href', reader.result as string);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          resolve();
        }, 200);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('FileReader 读取失败'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Export Word by:
 *  1. Cloning the live DOM of #report-render-canvas and stripping editor UI
 *  2. POSTing the HTML to /api/export/word
 *  3. Receiving a base64-encoded docx string (JSON, always complete)
 *  4. Decoding → Blob → FileReader data URL download (no blob:// security issues)
 */
export async function exportToWord(
  title: string = '飞机日报',
  filename: string = '飞机日报.docx'
) {
  const element = document.getElementById('report-render-canvas');
  if (!element) {
    throw new Error('未找到渲染画布（#report-render-canvas），请确保文档已加载');
  }

  // ── Strip editor-only nodes from a DOM clone ──
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('button').forEach((btn) => btn.remove());
  clone.querySelectorAll('[contenteditable]').forEach((el) => {
    (el as HTMLElement).removeAttribute('contenteditable');
  });
  clone.querySelectorAll('[data-placeholder]').forEach((el) => {
    if (!(el as HTMLElement).innerText?.trim()) el.remove();
  });

  const html = clone.innerHTML;

  // ── Send to server-side converter ──
  const res = await fetch('/api/export/word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, title }),
  });

  const payload = await res.json();

  if (!res.ok || payload.error) {
    throw new Error(payload.error || `导出失败（HTTP ${res.status}）`);
  }

  // ── Decode base64 → Blob → data URL download ──
  const blob = base64ToBlob(payload.base64, DOCX_MIME);
  await downloadViaDataUrl(blob, filename || payload.filename);
}
