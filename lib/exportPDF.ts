'use client';

/**
 * Export PDF via html2pdf.js (DOM-based, 100% WYSIWYG).
 *
 * Fix: html2canvas reads the DOM at paint time but Tailwind's utility classes
 * rely on an external stylesheet that html2canvas may not fully resolve.
 * Solution: temporarily inject a <style> tag with !important inline rules
 * directly inside the canvas element before capture, then remove it after.
 */
export async function exportToPDF(filename: string = '飞机日报.pdf') {
  const element = document.getElementById('report-render-canvas');
  if (!element) {
    throw new Error('未找到渲染画布（#report-render-canvas），请确保文档已加载');
  }

  // ── Step 1: add the export class and inject guaranteed table styles ──
  element.classList.add('export-canvas');

  const styleTag = document.createElement('style');
  styleTag.id = '__export-pdf-style__';
  styleTag.textContent = `
    /* Force table borders for html2canvas – Tailwind classes are not
       always resolved by the canvas renderer, so we write them inline. */
    .export-canvas table {
      border-collapse: collapse !important;
      width: 100% !important;
      font-size: 13px !important;
    }
    .export-canvas th,
    .export-canvas td {
      border: 1px solid #000000 !important;
      padding: 8px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
    .export-canvas th {
      font-weight: bold !important;
      background-color: #f3f4f6 !important;
    }
    /* Hide all editor-only buttons and controls */
    .export-canvas button {
      display: none !important;
    }
    /* Headings */
    .export-canvas h1 { font-size: 20px !important; font-weight: bold !important; }
    .export-canvas h2 { font-size: 16px !important; font-weight: bold !important; }
    .export-canvas h3 { font-size: 14px !important; font-weight: 600  !important; }
    /* Remove hover dashes that appear on editable blocks */
    .export-canvas [contenteditable] {
      outline: none !important;
    }
  `;
  // Inject inside the canvas so html2canvas definitely picks it up
  element.insertBefore(styleTag, element.firstChild);

  try {
    // ── Step 2: run html2pdf ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2pdf: any = (await import('html2pdf.js')).default;

    const opt = {
      margin: 10,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        // Tell html2canvas to also read inline <style> tags
        onclone: (clonedDoc: Document) => {
          // Ensure the injected style survives the clone
          const canvas = clonedDoc.getElementById('report-render-canvas');
          if (canvas) canvas.classList.add('export-canvas');
        },
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
    };

    await html2pdf().from(element).set(opt).save();
  } finally {
    // ── Step 3: always clean up, even on error ──
    styleTag.remove();
    element.classList.remove('export-canvas');
  }
}
