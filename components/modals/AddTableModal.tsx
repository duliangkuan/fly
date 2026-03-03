'use client';

import { useState } from 'react';
import { TableBlock, TableCell, generateId } from '@/lib/types';

interface Props {
  onAdd: (block: TableBlock) => void;
  onClose: () => void;
}

export default function AddTableModal({ onAdd, onClose }: Props) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [headerMode, setHeaderMode] = useState<'row' | 'col' | 'both' | 'none'>(
    'row'
  );
  const [caption, setCaption] = useState('');

  const handleAdd = () => {
    const tableRows: TableCell[][] = Array(rows)
      .fill(null)
      .map((_, rowIdx) =>
        Array(cols)
          .fill(null)
          .map((_, colIdx) => {
            const isHeaderRow =
              (headerMode === 'row' || headerMode === 'both') && rowIdx === 0;
            const isHeaderCol =
              (headerMode === 'col' || headerMode === 'both') && colIdx === 0;
            let content = '';
            if (isHeaderRow) content = `字段${colIdx + 1}`;
            else if (isHeaderCol && rowIdx > 0) content = `字段${rowIdx}`;
            return { content, bold: isHeaderRow || isHeaderCol };
          })
      );

    const block: TableBlock = {
      id: generateId(),
      type: 'table',
      rows: tableRows,
      headerRowIndex: headerMode === 'row' || headerMode === 'both' ? 0 : -1,
      headerColIndex: headerMode === 'col' || headerMode === 'both' ? 0 : -1,
      caption: caption || undefined,
    };

    onAdd(block);
  };

  const previewRows = Math.min(rows, 5);
  const previewCols = Math.min(cols, 6);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">添加自定义表格</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Rows and Cols */}
          <div className="flex gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                行数
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRows(Math.max(1, rows - 1))}
                  className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={rows}
                  onChange={(e) =>
                    setRows(Math.max(1, Math.min(50, Number(e.target.value))))
                  }
                  className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                />
                <button
                  onClick={() => setRows(Math.min(50, rows + 1))}
                  className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                列数
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCols(Math.max(1, cols - 1))}
                  className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={cols}
                  onChange={(e) =>
                    setCols(Math.max(1, Math.min(20, Number(e.target.value))))
                  }
                  className="w-16 text-center border border-gray-300 rounded px-2 py-1"
                />
                <button
                  onClick={() => setCols(Math.min(20, cols + 1))}
                  className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Header mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              字段标识方式
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'row', label: '首行为字段行（默认）' },
                  { value: 'col', label: '首列为字段列' },
                  { value: 'both', label: '首行+首列均为字段' },
                  { value: 'none', label: '无字段标识' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    headerMode === opt.value
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="headerMode"
                    value={opt.value}
                    checked={headerMode === opt.value}
                    onChange={() => setHeaderMode(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表格标题（可选）
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="如：飞行记录表"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs text-gray-500 mb-1">预览（显示前 {previewRows} 行 × {previewCols} 列）：</p>
            <div className="overflow-auto">
              <table className="border-collapse text-xs">
                <tbody>
                  {Array(previewRows)
                    .fill(null)
                    .map((_, rowIdx) => (
                      <tr key={rowIdx}>
                        {Array(previewCols)
                          .fill(null)
                          .map((_, colIdx) => {
                            const isHeaderRow =
                              (headerMode === 'row' || headerMode === 'both') &&
                              rowIdx === 0;
                            const isHeaderCol =
                              (headerMode === 'col' || headerMode === 'both') &&
                              colIdx === 0;
                            return (
                              <td
                                key={colIdx}
                                className={`border border-gray-300 px-2 py-1 ${
                                  isHeaderRow || isHeaderCol
                                    ? 'bg-gray-100 font-bold'
                                    : 'bg-white'
                                }`}
                              >
                                {isHeaderRow && !isHeaderCol
                                  ? `字段${colIdx + 1}`
                                  : isHeaderCol && !isHeaderRow
                                  ? `字段${rowIdx}`
                                  : isHeaderRow && isHeaderCol
                                  ? ''
                                  : ''}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                </tbody>
              </table>
              {(rows > previewRows || cols > previewCols) && (
                <p className="text-xs text-gray-400 mt-1">
                  ...实际将创建 {rows} 行 × {cols} 列
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            添加表格
          </button>
        </div>
      </div>
    </div>
  );
}
