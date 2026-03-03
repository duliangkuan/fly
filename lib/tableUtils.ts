import type { TableCell } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// parseRawTableToArray — the universal data-cleaning middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts any raw table representation into a clean string[][].
 * No HTML tags will ever appear in the output.
 *
 * Handles:
 *  1. string[][] or TableCell[][] already passed as an array
 *  2. HTML table strings  (<table>…</table>)
 *  3. Markdown pipe tables (| col | col |)
 *  4. Whitespace-aligned plain-text "pseudo-tables" (2+ spaces as separator)
 */
export function parseRawTableToArray(rawData: unknown): string[][] {
  if (rawData == null) return [['']];

  // ── Already an array ────────────────────────────────────────────────────────
  if (Array.isArray(rawData)) {
    if (rawData.length === 0) return [['']];
    if (Array.isArray(rawData[0])) {
      // 2D array — cells can be plain strings OR TableCell objects
      const result = (rawData as unknown[][]).map((row) =>
        (row as unknown[]).map((cell) => {
          if (cell && typeof cell === 'object' && 'content' in cell) {
            return String((cell as TableCell).content ?? '');
          }
          return String(cell ?? '');
        })
      );
      return normalizeColumnCount(result);
    }
    // 1D array → single row
    return [(rawData as unknown[]).map((c) => String(c ?? ''))];
  }

  const raw = String(rawData).trim();
  if (!raw) return [['']];

  // ── Strategy 1: HTML table ──────────────────────────────────────────────────
  if (/<table[\s\S]*?<\/table>/i.test(raw)) {
    return parseHtmlTable(raw);
  }

  // ── Strategy 2: Markdown pipe table ────────────────────────────────────────
  const lines = raw.split('\n');
  if (lines.some((l) => l.trim().startsWith('|'))) {
    const result = parseMarkdownPipeTable(lines);
    if (result.length > 0 && result[0].length > 1) return result;
  }

  // ── Strategy 3: Whitespace-aligned pseudo-table ─────────────────────────────
  return parseWhitespaceTable(raw);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal parsers
// ─────────────────────────────────────────────────────────────────────────────

function parseHtmlTable(html: string): string[][] {
  // Client-side: DOMParser for accuracy (handles nested tags, entities, etc.)
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const rows = Array.from(doc.querySelectorAll('table tr'));
      if (rows.length > 0) {
        const result = rows.map((row) =>
          Array.from(row.querySelectorAll('td, th')).map((cell) =>
            ((cell as HTMLElement).innerText ?? cell.textContent ?? '').trim()
          )
        );
        return normalizeColumnCount(result.filter((r) => r.length > 0));
      }
    } catch {
      // fall through to regex
    }
  }

  // Server-side / DOMParser failure — regex fallback
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  const result: string[][] = [];
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html)) !== null) {
    const cells: string[] = [];
    let cm: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rm[1])) !== null) {
      cells.push(cm[1].replace(/<[^>]+>/g, '').trim());
    }
    if (cells.length > 0) result.push(cells);
  }
  return result.length > 0 ? normalizeColumnCount(result) : [['']];
}

function parseMarkdownPipeTable(lines: string[]): string[][] {
  const dataLines = lines.filter(
    (l) =>
      l.trim().startsWith('|') &&
      !l.trim().match(/^\|[\s\-:|]+\|[\s\-:|]*$/)
  );
  if (dataLines.length === 0) return [['']];
  const rows = dataLines.map((line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  );
  return normalizeColumnCount(rows);
}

function parseWhitespaceTable(raw: string): string[][] {
  const lines = raw.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [['']];

  // Split by 2+ consecutive spaces or tabs
  const rows = lines.map((line) =>
    line
      .trim()
      .split(/\s{2,}|\t+/)
      .map((c) => c.trim())
      .filter(Boolean)
  );

  // Only treat as multi-column if the split was consistent
  const colCounts = rows.map((r) => r.length);
  const maxCols = Math.max(...colCounts, 1);
  const hasMeaningfulColumns = colCounts.every((c) => c > 1);

  if (hasMeaningfulColumns && maxCols > 1) {
    return normalizeColumnCount(rows);
  }
  return lines.map((l) => [l.trim()]);
}

function normalizeColumnCount(rows: string[][]): string[][] {
  if (rows.length === 0) return [['']];
  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  return rows.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('');
    return padded;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TableCell[][] ↔ string[][] converters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract plain string[][] from TableCell[][] for editing in the input grid.
 */
export function tableCellsToArray(rows: TableCell[][]): string[][] {
  return rows.map((row) => row.map((cell) => cell.content));
}

/**
 * Convert a string[][] back to TableCell[][], preserving existing cell metadata
 * (bold, align) for cells that already exist.
 */
export function tableArrayToTableCells(
  data: string[][],
  existingRows: TableCell[][] = []
): TableCell[][] {
  return data.map((row, ri) =>
    row.map((content, ci) => {
      const existing = existingRows[ri]?.[ci];
      return {
        content,
        ...(existing?.bold !== undefined ? { bold: existing.bold } : {}),
        ...(existing?.align !== undefined ? { align: existing.align } : {}),
      };
    })
  );
}
