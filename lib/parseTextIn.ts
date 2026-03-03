import {
  DocumentBlock,
  TableBlock,
  TableCell,
  TextBlock,
  ImageBlock,
  generateId,
} from './types';
import { parseRawTableToArray } from './tableUtils';

/**
 * Parse a TextIn API markdown response into an array of DocumentBlocks.
 *
 * Handles:
 *  - Standard markdown tables (|col|col|) → TableBlock
 *  - HTML tables (<table>...</table>)      → TableBlock (always, via parseRawTableToArray)
 *  - Embedded base64/URL images            → ImageBlock
 *  - Headings (#, ##, ###)                 → TextBlock
 *  - Regular paragraphs                    → TextBlock
 */
export function parseMarkdownToBlocks(markdown: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];

  // 1. Collapse all HTML tables into single-line tokens so they survive line splitting
  //    Replace <table...>...</table> spans with a unique placeholder, then reassemble.
  const htmlTableRegex = /<table[\s\S]*?<\/table>/gi;
  const htmlTables: string[] = [];
  const placeholdered = markdown.replace(htmlTableRegex, (match) => {
    const idx = htmlTables.length;
    htmlTables.push(match);
    return `\n@@HTML_TABLE_${idx}@@\n`;
  });

  const lines = placeholdered.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Skip blank lines ──────────────────────────────────────────────
    if (!trimmed) {
      i++;
      continue;
    }

    // ── HTML table placeholder ────────────────────────────────────────
    const htmlTableMatch = trimmed.match(/^@@HTML_TABLE_(\d+)@@$/);
    if (htmlTableMatch) {
      const tableHtml = htmlTables[Number(htmlTableMatch[1])];
      // Always produce a TableBlock — never store raw HTML inside a TextBlock.
      // parseHtmlTableToBlock is now guaranteed to return a valid block.
      blocks.push(parseHtmlTableToBlock(tableHtml));
      i++;
      continue;
    }

    // ── Markdown table (| col | col |) ───────────────────────────────
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const tableBlock = parseMarkdownTable(tableLines);
      if (tableBlock) blocks.push(tableBlock);
      continue;
    }

    // ── Inline image ─────────────────────────────────────────────────
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((data:[^)]+|https?:[^)]+)\)$/);
    if (imgMatch) {
      const imgBlock: ImageBlock = {
        id: generateId(),
        type: 'image',
        src: imgMatch[2],
        alt: imgMatch[1] || '图片',
      };
      blocks.push(imgBlock);
      i++;
      continue;
    }

    // ── Heading ──────────────────────────────────────────────────────
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        id: generateId(),
        type: 'text',
        content: line, // Keep raw markdown; ReactMarkdown will render the # syntax
        bold: true,
        heading: level,
        fontSize: level === 1 ? 20 : level === 2 ? 16 : 14,
      } as TextBlock);
      i++;
      continue;
    }

    // ── Regular paragraph (accumulate until blank / table / heading) ─
    const paraLines: string[] = [line];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !lines[i + 1].trim().startsWith('|') &&
      !lines[i + 1].trim().startsWith('#') &&
      !lines[i + 1].trim().match(/^!\[/) &&
      !lines[i + 1].trim().match(/^@@HTML_TABLE_/)
    ) {
      i++;
      paraLines.push(lines[i]);
    }

    const paraContent = paraLines.join('\n').trim();
    if (paraContent) {
      blocks.push({
        id: generateId(),
        type: 'text',
        content: paraContent,
      } as TextBlock);
    }
    i++;
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML table → TableBlock (never returns null — always produces a valid block)
// ─────────────────────────────────────────────────────────────────────────────

function parseHtmlTableToBlock(html: string): TableBlock {
  // Use the robust utility that handles DOMParser + regex fallback
  const grid = parseRawTableToArray(html);

  // Detect whether the original HTML used <th> in the first row
  const firstRowHasTh = /<th/i.test(
    (html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i) || [])[1] || ''
  );

  const rows: TableCell[][] = grid.map((row) =>
    row.map((content) => ({ content }))
  );

  return {
    id: generateId(),
    type: 'table',
    rows,
    headerRowIndex: firstRowHasTh ? 0 : rows.length > 1 ? 0 : -1,
    headerColIndex: -1,
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown pipe table → TableBlock
// ─────────────────────────────────────────────────────────────────────────────

function parseMarkdownTable(tableLines: string[]): TableBlock | null {
  if (tableLines.length < 2) return null;

  // Filter separator lines (|---|---|)
  const dataLines = tableLines.filter(
    (line) => !line.trim().match(/^\|[\s\-:|]+\|[\s\-:|]*$/)
  );

  if (dataLines.length === 0) return null;

  const rows: TableCell[][] = dataLines.map((line) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => ({ content: cell.trim() }))
  );

  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((row) => {
    while (row.length < maxCols) row.push({ content: '' });
    return row;
  });

  return {
    id: generateId(),
    type: 'table',
    rows: normalized,
    headerRowIndex: normalized.length > 0 ? 0 : -1,
    headerColIndex: -1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: extract all tables as 2D string arrays (for "写入数据" matching)
// ─────────────────────────────────────────────────────────────────────────────

export function extractTablesFromMarkdown(markdown: string): string[][][] {
  const tables: string[][][] = [];

  // Markdown pipe tables
  const lines = markdown.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const dataLines = tableLines.filter(
        (l) => !l.trim().match(/^\|[\s\-:|]+\|/)
      );
      if (dataLines.length > 0) {
        tables.push(
          dataLines.map((l) =>
            l
              .replace(/^\|/, '')
              .replace(/\|$/, '')
              .split('|')
              .map((c) => c.trim())
          )
        );
      }
    } else {
      i++;
    }
  }

  // HTML tables
  const htmlTableRegex = /<table[\s\S]*?<\/table>/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlTableRegex.exec(markdown)) !== null) {
    const rowMatches = [...match[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rowMatches.length > 0) {
      tables.push(
        rowMatches.map((rm) =>
          [...rm[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cm) =>
            stripTags(cm[1]).trim()
          )
        )
      );
    }
  }

  return tables;
}

/**
 * Extract key-value pairs from markdown text (non-table lines).
 * Looks for "Key: Value" or "Key：Value".
 */
export function extractKeyValuesFromMarkdown(
  markdown: string
): Record<string, string> {
  const pairs: Record<string, string> = {};
  const lines = markdown.split('\n');

  for (const line of lines) {
    if (line.trim().startsWith('|') || line.trim().startsWith('#')) continue;
    const match = line.match(/^(.+?)[:：]\s*(.+)$/);
    if (match) {
      pairs[match[1].trim()] = match[2].trim();
    }
  }

  return pairs;
}
