'use client';

import { useState, useRef } from 'react';
import { TableBlock, DocumentBlock, TableCell, generateId } from '@/lib/types';
import {
  extractTablesFromMarkdown,
  extractKeyValuesFromMarkdown,
} from '@/lib/parseTextIn';

interface Props {
  blocks: DocumentBlock[];
  onWrite: (updatedBlocks: DocumentBlock[]) => void;
  onClose: () => void;
}

interface MatchResult {
  editorTableId: string;
  matchedRows: { rowIdx: number; values: string[] }[];
  fillCount: number;
}

export default function WriteDataModal({ blocks, onWrite, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'select' | 'preview'>('upload');
  const [selectedTableId, setSelectedTableId] = useState<string>('all');
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [parsedMarkdown, setParsedMarkdown] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB

  const acceptFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      setError(`文件过大（${(f.size / 1024 / 1024).toFixed(1)} MB），请上传小于 4 MB 的文件`);
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const editorTables = blocks.filter(
    (b): b is TableBlock => b.type === 'table'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const handleNextStep = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/textin/extract', {
        method: 'POST',
        body: formData,
      });

      const rawText = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (res.status === 413) {
          throw new Error('文件过大，请上传小于 4 MB 的文件');
        }
        throw new Error(`服务器返回异常响应（${res.status}）`);
      }

      if (!res.ok || data.error) {
        throw new Error((data.error as string) || '解析失败');
      }

      const markdown: string =
        data?.result?.markdown ||
        data?.result?.text ||
        data?.data?.markdown ||
        '';

      if (!markdown) {
        throw new Error('未能从文档中提取数据，请确认文件格式');
      }

      setParsedMarkdown(markdown);

      if (editorTables.length === 0) {
        throw new Error('当前编辑区没有表格，请先添加表格再写入数据');
      }

      setStep('select');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '解析失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const results = computeMatches();
    setMatchResults(results);
    setStep('preview');
  };

  const computeMatches = (): MatchResult[] => {
    const sourceTables = extractTablesFromMarkdown(parsedMarkdown);
    const sourceKV = extractKeyValuesFromMarkdown(parsedMarkdown);

    const targetTables =
      selectedTableId === 'all'
        ? editorTables
        : editorTables.filter((t) => t.id === selectedTableId);

    const results: MatchResult[] = [];

    for (const editorTable of targetTables) {
      const headerRowIdx = editorTable.headerRowIndex;
      if (headerRowIdx < 0 || !editorTable.rows[headerRowIdx]) {
        // No header — try key-value matching
        const matchedRows: { rowIdx: number; values: string[] }[] = [];
        let fillCount = 0;

        editorTable.rows.forEach((row, rowIdx) => {
          if (rowIdx === headerRowIdx) return;
          const newValues = row.map((cell) => {
            if (!cell.content) return cell.content;
            const val = sourceKV[cell.content.trim()];
            if (val) fillCount++;
            return val || cell.content;
          });
          matchedRows.push({ rowIdx, values: newValues });
        });

        results.push({ editorTableId: editorTable.id, matchedRows, fillCount });
        continue;
      }

      const headers = editorTable.rows[headerRowIdx].map((c) =>
        c.content.trim().toLowerCase()
      );

      // Find best matching source table
      let bestMatch: string[][] | null = null;
      let bestScore = 0;

      for (const srcTable of sourceTables) {
        if (srcTable.length === 0) continue;
        const srcHeaders = srcTable[0].map((c) => c.trim().toLowerCase());
        const score = headers.filter((h) => srcHeaders.includes(h)).length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = srcTable;
        }
      }

      const matchedRows: { rowIdx: number; values: string[] }[] = [];
      let fillCount = 0;

      if (bestMatch && bestScore > 0) {
        const srcHeaders = bestMatch[0].map((c) => c.trim().toLowerCase());
        // Map editor header → source column index
        const colMapping = headers.map((h) => srcHeaders.indexOf(h));

        // Fill data rows from source (skip header row of source)
        const srcDataRows = bestMatch.slice(1);
        srcDataRows.forEach((srcRow, dataRowIdx) => {
          const targetRowIdx = headerRowIdx + 1 + dataRowIdx;
          if (targetRowIdx >= editorTable.rows.length) return;

          const newValues = headers.map((_, hi) => {
            const srcColIdx = colMapping[hi];
            if (srcColIdx >= 0 && srcRow[srcColIdx]) {
              fillCount++;
              return srcRow[srcColIdx];
            }
            return editorTable.rows[targetRowIdx]?.[hi]?.content || '';
          });
          matchedRows.push({ rowIdx: targetRowIdx, values: newValues });
        });

        // Also try key-value for unmapped cells
        if (matchedRows.length === 0) {
          editorTable.rows.forEach((row, rowIdx) => {
            if (rowIdx === headerRowIdx) return;
            const newValues = row.map((cell) => {
              const val = sourceKV[cell.content.trim()];
              if (val) fillCount++;
              return val || cell.content;
            });
            matchedRows.push({ rowIdx, values: newValues });
          });
        }
      }

      results.push({ editorTableId: editorTable.id, matchedRows, fillCount });
    }

    return results;
  };

  const handleApply = () => {
    const newBlocks = blocks.map((block) => {
      if (block.type !== 'table') return block;
      const result = matchResults.find((r) => r.editorTableId === block.id);
      if (!result) return block;

      const tb = block as TableBlock;
      const newRows = tb.rows.map((row, rowIdx) => {
        const matchedRow = result.matchedRows.find((mr) => mr.rowIdx === rowIdx);
        if (!matchedRow) return row;
        return row.map((cell, colIdx) => ({
          ...cell,
          content: matchedRow.values[colIdx] ?? cell.content,
        }));
      });

      return { ...tb, rows: newRows };
    });

    onWrite(newBlocks);
  };

  const totalFillCount = matchResults.reduce((sum, r) => sum + r.fillCount, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* ── Sticky header ── */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">写入数据</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                上传数据来源文档（支持 PDF、Word 等），系统将提取其中的数据并自动填入编辑区的表格。
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all select-none
                  ${isDragging
                    ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                    : file
                      ? 'border-green-400 bg-green-50 hover:border-green-500'
                      : 'border-gray-300 hover:border-blue-400 bg-white'
                  }`}
              >
                {isDragging ? (
                  <div>
                    <p className="text-blue-600 font-medium text-lg">松开即可上传 📂</p>
                  </div>
                ) : file ? (
                  <div>
                    <p className="text-green-600 font-medium">✓ {file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB — 点击或拖拽更换
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500">点击选择或将文件拖拽到此处</p>
                    <p className="text-xs text-gray-400 mt-1">
                      支持 .pdf、.docx、.doc、.xlsx、.xls 等格式
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  取消
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!file || loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      解析中...
                    </>
                  ) : (
                    '下一步'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select target table */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                请选择要填入数据的表格（默认填入所有表格）：
              </p>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-transparent hover:border-blue-200 hover:bg-blue-50">
                  <input
                    type="radio"
                    name="tableSelect"
                    value="all"
                    checked={selectedTableId === 'all'}
                    onChange={() => setSelectedTableId('all')}
                  />
                  <span className="text-sm font-medium">所有表格</span>
                  <span className="text-xs text-gray-400">
                    ({editorTables.length} 个表格)
                  </span>
                </label>

                {editorTables.map((table, idx) => {
                  const headerRow =
                    table.headerRowIndex >= 0
                      ? table.rows[table.headerRowIndex]
                      : null;
                  const headerText = headerRow
                    ? headerRow
                        .map((c) => c.content)
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(' | ')
                    : `表格 ${idx + 1}`;

                  return (
                    <label
                      key={table.id}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded border border-transparent hover:border-blue-200 hover:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name="tableSelect"
                        value={table.id}
                        checked={selectedTableId === table.id}
                        onChange={() => setSelectedTableId(table.id)}
                      />
                      <span className="text-sm">
                        表格 {idx + 1}
                        {headerText && (
                          <span className="text-gray-400 text-xs ml-2">
                            ({headerText})
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  上一步
                </button>
                <button
                  onClick={handlePreview}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  预览匹配结果
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {totalFillCount > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-700 font-medium">
                    ✓ 共匹配到 {totalFillCount} 个数据项可写入
                  </p>
                  <ul className="text-xs text-green-600 mt-1 space-y-0.5">
                    {matchResults.map((r, i) => {
                      const tableIdx = editorTables.findIndex(
                        (t) => t.id === r.editorTableId
                      );
                      return (
                        <li key={i}>
                          表格 {tableIdx + 1}: {r.fillCount} 项匹配
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-700">
                    未能匹配到合适的数据。请检查数据来源文档的表头是否与编辑区表格的字段名一致。
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500">
                系统通过比对表格字段名（表头）来匹配数据。若匹配率低，请确保数据源文档中的字段名与编辑区表格字段名一致。
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  上一步
                </button>
                <button
                  onClick={handleApply}
                  disabled={totalFillCount === 0}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  确认写入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
