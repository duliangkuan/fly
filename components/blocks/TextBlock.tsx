'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { TextBlock as TextBlockType } from '@/lib/types';
import { parseRawTableToArray } from '@/lib/tableUtils';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Global sanitiser — strips HTML comments permanently
// ─────────────────────────────────────────────────────────────────────────────

function cleanRawText(text: string): string {
  return (text || '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Content-type detector
// ─────────────────────────────────────────────────────────────────────────────

type ContentType = 'table' | 'html' | 'markdown';

function detectContentType(content: string): ContentType {
  const t = content.trim();
  if (/<table[\s\S]*?<\/table>/i.test(t)) return 'table';
  if (/^<[a-z]/i.test(t) || /<(p|div|span|h[1-6]|strong|em|br)\b/i.test(t))
    return 'html';
  return 'markdown';
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Serialise a string[][] back to an HTML table string (for saving)
// ─────────────────────────────────────────────────────────────────────────────

function serializeArrayToHtmlTable(data: string[][], headerRowIndex = 0): string {
  const cellStyle =
    'border:1px solid #000000;padding:4px 8px;text-align:center;font-size:13px;vertical-align:middle;';
  const headerStyle = cellStyle + 'font-weight:bold;background-color:#f3f4f6;';

  const rows = data
    .map((row, ri) => {
      const cells = row
        .map((cell) => {
          const tag = ri === headerRowIndex ? 'th' : 'td';
          const style = ri === headerRowIndex ? headerStyle : cellStyle;
          return `<${tag} style="${style}">${cell}</${tag}>`;
        })
        .join('');
      return `  <tr>${cells}</tr>`;
    })
    .join('\n');

  return `<table style="border-collapse:collapse;width:100%;font-size:13px;">\n${rows}\n</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Markdown → editable HTML (for contenteditable seed)
// ─────────────────────────────────────────────────────────────────────────────

function markdownToEditableHtml(content: string): string {
  const cleaned = cleanRawText(content);
  if (/^<[a-z]/i.test(cleaned.trim())) return cleaned;

  let html = cleaned;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return html
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '<p><br></p>';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|div|table)/i.test(t))
        return t;
      return `<p>${line}</p>`;
    })
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Shared ReactMarkdown component map (view mode — text / markdown only)
// ─────────────────────────────────────────────────────────────────────────────

const MD_COMPONENTS: React.ComponentProps<typeof ReactMarkdown>['components'] =
  {
    // Markdown tables rendered with inline styles for export reliability
    table: ({ children }) => (
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: '13px',
        }}
      >
        {children}
      </table>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    th: ({ children }) => (
      <th
        style={{
          border: '1px solid #000000',
          padding: '4px 8px',
          textAlign: 'center',
          fontWeight: 'bold',
          backgroundColor: '#f3f4f6',
          fontSize: '13px',
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        style={{
          border: '1px solid #000000',
          padding: '4px 8px',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        {children}
      </td>
    ),
    tr: ({ children }) => <tr>{children}</tr>,
    h1: ({ children }) => (
      <h1 className="text-xl font-bold my-2">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold my-1.5">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold my-1">{children}</h3>
    ),
    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
    strong: ({ children }) => (
      <strong className="font-bold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="list-disc pl-5 my-1 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-5 my-1 space-y-0.5">{children}</ol>
    ),
    li: ({ children }) => <li className="text-sm">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-3 text-gray-600 my-1 italic">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-gray-100 px-1 rounded text-xs font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-100 rounded p-2 overflow-x-auto my-1 text-xs font-mono">
        {children}
      </pre>
    ),
    hr: () => <hr className="border-gray-300 my-2" />,
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-600 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

// ─────────────────────────────────────────────────────────────────────────────
// 6. TableInlineView — renders a string[][] with all inline styles
//    Used for TextBlock content that contains an HTML table string.
//    This replaces the old rehype-raw path and guarantees border preservation.
// ─────────────────────────────────────────────────────────────────────────────

function TableInlineView({ data }: { data: string[][] }) {
  return (
    <table
      style={{
        borderCollapse: 'collapse',
        width: '100%',
        fontSize: '13px',
        tableLayout: 'auto',
      }}
    >
      <tbody>
        {data.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => {
              const isHeader = ri === 0;
              return (
                <td
                  key={ci}
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: isHeader ? 'bold' : 'normal',
                    backgroundColor: isHeader ? '#f3f4f6' : '#ffffff',
                    fontSize: '13px',
                    verticalAlign: 'middle',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. TableGridEditor — Excel-like input grid for editing HTML-table TextBlocks
//    Saves back as an HTML string so the existing data model is preserved.
// ─────────────────────────────────────────────────────────────────────────────

interface TableGridProps {
  initialData: string[][];
  onSave: (html: string) => void;
  onCancel: () => void;
}

function TableGridEditor({ initialData, onSave, onCancel }: TableGridProps) {
  const [data, setData] = useState<string[][]>(initialData);

  const update = (ri: number, ci: number, value: string) =>
    setData((prev) =>
      prev.map((row, r) =>
        r === ri ? row.map((c, col) => (col === ci ? value : c)) : row
      )
    );

  const addRow = () => {
    const cols = data[0]?.length || 1;
    setData((d) => [...d, Array(cols).fill('')]);
  };

  const addCol = () => setData((d) => d.map((row) => [...row, '']));

  const delRow = (ri: number) => {
    if (data.length <= 1) return;
    setData((d) => d.filter((_, i) => i !== ri));
  };

  const delCol = (ci: number) => {
    if ((data[0]?.length ?? 0) <= 1) return;
    setData((d) => d.map((row) => row.filter((_, i) => i !== ci)));
  };

  const colCount = data[0]?.length ?? 0;

  return (
    <div className="border border-blue-400 rounded-md bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-700 rounded-t-md">
        <span className="font-semibold">表格编辑</span>
        <button
          onClick={addRow}
          className="ml-auto px-2 py-0.5 bg-white border border-blue-300 rounded hover:bg-blue-100"
        >
          + 行
        </button>
        <button
          onClick={addCol}
          className="px-2 py-0.5 bg-white border border-blue-300 rounded hover:bg-blue-100"
        >
          + 列
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-0.5 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-600"
        >
          取消
        </button>
        <button
          onClick={() => onSave(serializeArrayToHtmlTable(data, 0))}
          className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          保存
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-auto p-2">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr>
              <th className="w-5 p-0" />
              {Array(colCount)
                .fill(null)
                .map((_, ci) => (
                  <th key={ci} className="p-0 text-center">
                    <button
                      onClick={() => delCol(ci)}
                      className="text-[10px] text-red-400 hover:text-red-600 px-1 w-full"
                      title="删除此列"
                    >
                      ✕列
                    </button>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri}>
                <td className="p-0 text-center align-middle w-5">
                  <button
                    onClick={() => delRow(ri)}
                    className="text-[10px] text-red-400 hover:text-red-600 px-0.5"
                    title="删除此行"
                  >
                    ✕
                  </button>
                </td>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border border-gray-300 p-0 ${
                      ri === 0 ? 'bg-gray-100' : 'bg-white'
                    }`}
                  >
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => update(ri, ci, e.target.value)}
                      className={`w-full px-2 py-1 text-sm outline-none focus:bg-blue-50 min-w-[72px] bg-transparent ${
                        ri === 0 ? 'font-bold text-center' : 'text-center'
                      }`}
                      placeholder={ri === 0 ? '字段名' : '数据'}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td colSpan={colCount + 1} className="p-0">
                <button
                  onClick={addRow}
                  className="w-full text-xs text-blue-500 hover:bg-blue-50 py-1 border-t border-dashed border-gray-200"
                >
                  + 添加一行
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RichTextEditor — contentEditable WYSIWYG for plain text / HTML paragraphs
// ─────────────────────────────────────────────────────────────────────────────

interface RichEditorProps {
  initialHtml: string;
  onSave: (html: string) => void;
  onCancel: () => void;
}

function RichTextEditor({ initialHtml, onSave, onCancel }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = initialHtml;
    editorRef.current.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value ?? undefined);
    editorRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onSave(editorRef.current?.innerHTML || '');
    }
  };

  const TB_BTN =
    'px-2 py-0.5 text-xs rounded border border-transparent hover:border-gray-300 hover:bg-white select-none';

  return (
    <div className="border border-blue-400 rounded bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 px-1 py-1 bg-gray-100 border-b border-gray-200 rounded-t">
        <button
          onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
          className={`${TB_BTN} font-bold`}
          title="加粗 (Ctrl+B)"
        >B</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
          className={`${TB_BTN} italic`}
          title="斜体 (Ctrl+I)"
        >I</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
          className={`${TB_BTN} underline`}
          title="下划线 (Ctrl+U)"
        >U</button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'h1'); }} className={TB_BTN} title="一级标题">H1</button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'h2'); }} className={TB_BTN} title="二级标题">H2</button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'h3'); }} className={TB_BTN} title="三级标题">H3</button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'p'); }} className={TB_BTN} title="正文段落">¶</button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }} className={TB_BTN} title="左对齐">≡←</button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }} className={TB_BTN} title="居中">≡</button>
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }} className={TB_BTN} title="右对齐">≡→</button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }} className={TB_BTN} title="无序列表">• 列表</button>

        <div className="flex-1" />
        <span className="text-[10px] text-gray-400 hidden sm:inline">
          Esc 取消 · Ctrl+↵ 保存
        </span>
        <button
          onClick={onCancel}
          className="px-2 py-0.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 ml-1"
        >
          取消
        </button>
        <button
          onClick={() => onSave(editorRef.current?.innerHTML || '')}
          className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          保存
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        className="
          min-h-[80px] p-3 outline-none text-sm leading-relaxed
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-1.5
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:my-1
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-0.5
          [&_strong]:font-bold [&_em]:italic [&_u]:underline
          [&_p]:my-0.5
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-1
          [&_th]:border [&_th]:border-black [&_th]:px-2 [&_th]:py-1 [&_th]:text-center [&_th]:font-semibold [&_th]:bg-gray-100
          [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 [&_td]:text-center
        "
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Main TextBlock component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  block: TextBlockType;
  onChange: (block: TextBlockType) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function TextBlock({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  const content = cleanRawText(block.content || '');
  const contentType = detectContentType(content);
  const isEmpty = !content.trim();

  const enterEdit = () => setIsEditing(true);

  const saveContent = (newContent: string) => {
    onChange({ ...block, content: newContent });
    setIsEditing(false);
  };

  const cancelEdit = () => setIsEditing(false);

  // Pre-parse the table data once for the view mode so we don't re-parse on
  // every render keystroke.
  const tableData =
    !isEditing && contentType === 'table'
      ? parseRawTableToArray(content)
      : null;

  return (
    <div className="group relative flex gap-1 py-1">
      {/* ── Main content / editor ── */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          /* ── EDIT MODE ── */
          contentType === 'table' ? (
            // HTML table → pure input grid (no code ever shown to the user)
            <TableGridEditor
              initialData={parseRawTableToArray(content)}
              onSave={saveContent}
              onCancel={cancelEdit}
            />
          ) : (
            // Markdown / HTML text → contentEditable WYSIWYG
            <RichTextEditor
              initialHtml={markdownToEditableHtml(content)}
              onSave={saveContent}
              onCancel={cancelEdit}
            />
          )
        ) : (
          /* ── VIEW MODE ── */
          <div
            onClick={enterEdit}
            title="点击编辑"
            className={`
              cursor-text rounded px-1 py-0.5 min-h-[1.6em]
              hover:bg-gray-50 hover:outline hover:outline-1 hover:outline-dashed hover:outline-gray-300
              ${isEmpty ? 'text-gray-300 italic text-sm' : ''}
            `}
          >
            {isEmpty ? (
              <span>点击编辑文本...</span>
            ) : contentType === 'table' && tableData ? (
              // Render HTML-table TextBlocks with hard-coded inline styles
              // so borders are never lost during PDF / Word export
              <div className="overflow-x-auto">
                <TableInlineView data={tableData} />
              </div>
            ) : (
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                components={MD_COMPONENTS}
              >
                {content}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>

      {/* ── Block controls (visible on hover) ── */}
      <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 ml-1 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="上移"
          className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded border border-gray-300"
        >↑</button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="下移"
          className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded border border-gray-300"
        >↓</button>
        <button
          onClick={enterEdit}
          title="编辑"
          className="px-1.5 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200"
        >✎</button>
        <button
          onClick={onDelete}
          title="删除"
          className="px-1.5 py-0.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200"
        >✕</button>
      </div>
    </div>
  );
}
