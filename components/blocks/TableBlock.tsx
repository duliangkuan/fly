'use client';

import { useState } from 'react';
import { TableBlock as TableBlockType, TableCell } from '@/lib/types';
import {
  tableCellsToArray,
  tableArrayToTableCells,
} from '@/lib/tableUtils';

// ─────────────────────────────────────────────────────────────────────────────
// VIEW MODE — renders with all-inline styles so PDF / Word export is reliable
// ─────────────────────────────────────────────────────────────────────────────

interface ViewGridProps {
  rows: TableCell[][];
  headerRowIndex: number;
  headerColIndex: number;
}

function TableViewGrid({ rows, headerRowIndex, headerColIndex }: ViewGridProps) {
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
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => {
              const isHeader =
                ri === headerRowIndex || ci === headerColIndex || !!cell.bold;
              const align =
                (cell.align as React.CSSProperties['textAlign']) ?? 'center';
              return (
                <td
                  key={ci}
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: align,
                    fontWeight: isHeader ? 'bold' : 'normal',
                    backgroundColor: isHeader ? '#f3f4f6' : '#ffffff',
                    fontSize: '13px',
                    verticalAlign: 'middle',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {cell.content}
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
// EDIT MODE — Excel-like input grid, no contentEditable anywhere
// ─────────────────────────────────────────────────────────────────────────────

interface EditGridProps {
  data: string[][];
  headerRowIndex: number;
  headerColIndex: number;
  onUpdate: (ri: number, ci: number, value: string) => void;
  onAddRow: () => void;
  onAddCol: () => void;
  onDeleteRow: (ri: number) => void;
  onDeleteCol: (ci: number) => void;
  onToggleHeaderRow: (ri: number) => void;
  onToggleHeaderCol: (ci: number) => void;
}

function TableEditGrid({
  data,
  headerRowIndex,
  headerColIndex,
  onUpdate,
  onAddRow,
  onAddCol,
  onDeleteRow,
  onDeleteCol,
  onToggleHeaderRow,
  onToggleHeaderCol,
}: EditGridProps) {
  const colCount = data[0]?.length ?? 0;

  return (
    <div className="overflow-auto">
      <table className="border-collapse text-sm w-full">
        {/* Column controls row */}
        <thead>
          <tr>
            {/* spacer for the row-controls column */}
            <th className="w-6 p-0" />
            {Array(colCount)
              .fill(null)
              .map((_, ci) => (
                <th key={ci} className="p-0 min-w-[80px]">
                  <div className="flex items-center justify-center gap-0.5 py-0.5">
                    <button
                      onClick={() => onToggleHeaderCol(ci)}
                      title={
                        headerColIndex === ci ? '取消字段列' : '设为字段列'
                      }
                      className={`text-[10px] px-1 py-0.5 rounded leading-tight border ${
                        headerColIndex === ci
                          ? 'bg-yellow-200 text-yellow-800 border-yellow-400'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {headerColIndex === ci ? '✓列' : '列'}
                    </button>
                    <button
                      onClick={() => onDeleteCol(ci)}
                      className="text-[10px] px-1 py-0.5 text-red-400 hover:text-red-600"
                      title="删除此列"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            {/* add-column button */}
            <th className="p-0 w-8">
              <button
                onClick={onAddCol}
                className="text-[10px] text-blue-500 hover:text-blue-700 px-1 py-0.5 w-full"
                title="添加列"
              >
                +列
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}>
              {/* Row controls */}
              <td className="p-0 align-middle w-6">
                <div className="flex flex-col items-center gap-0.5 px-0.5 py-0.5">
                  <button
                    onClick={() => onToggleHeaderRow(ri)}
                    title={
                      headerRowIndex === ri ? '取消字段行' : '设为字段行'
                    }
                    className={`text-[10px] px-1 rounded leading-tight border ${
                      headerRowIndex === ri
                        ? 'bg-yellow-200 text-yellow-800 border-yellow-400'
                        : 'bg-gray-100 text-gray-400 border-gray-200'
                    }`}
                  >
                    {headerRowIndex === ri ? '✓' : '行'}
                  </button>
                  <button
                    onClick={() => onDeleteRow(ri)}
                    className="text-[10px] px-1 text-red-400 hover:text-red-600"
                    title="删除此行"
                  >
                    ✕
                  </button>
                </div>
              </td>

              {/* Data cells — pure <input> grid */}
              {row.map((cell, ci) => {
                const isHeader =
                  ri === headerRowIndex || ci === headerColIndex;
                return (
                  <td
                    key={ci}
                    className={`border border-gray-300 p-0 ${
                      isHeader ? 'bg-yellow-50' : 'bg-white'
                    }`}
                  >
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => onUpdate(ri, ci, e.target.value)}
                      className={`w-full px-2 py-1.5 text-sm outline-none focus:bg-blue-50 min-w-[72px] bg-transparent ${
                        isHeader ? 'font-bold text-center' : 'text-center'
                      }`}
                      placeholder={
                        ri === headerRowIndex || ci === headerColIndex
                          ? '字段名'
                          : ''
                      }
                    />
                  </td>
                );
              })}

              {/* column-count spacer */}
              <td className="w-8" />
            </tr>
          ))}

          {/* Add-row button at the bottom */}
          <tr>
            <td colSpan={colCount + 2} className="p-0">
              <button
                onClick={onAddRow}
                className="w-full text-xs text-blue-500 hover:bg-blue-50 py-1.5 border-t border-dashed border-gray-300 transition-colors"
              >
                + 添加一行
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TableBlock component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  block: TableBlockType;
  onChange: (block: TableBlockType) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function TableBlock({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // Snapshot of string[][] while the user is editing
  const [editData, setEditData] = useState<string[][]>([]);
  const [editHeaderRow, setEditHeaderRow] = useState(block.headerRowIndex);
  const [editHeaderCol, setEditHeaderCol] = useState(block.headerColIndex);

  // ── Enter / exit edit mode ─────────────────────────────────────────────────
  const enterEdit = () => {
    setEditData(tableCellsToArray(block.rows));
    setEditHeaderRow(block.headerRowIndex);
    setEditHeaderCol(block.headerColIndex);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const newRows = tableArrayToTableCells(editData, block.rows);
    // Re-apply bold flag based on header positions
    const finalRows: TableCell[][] = newRows.map((row, ri) =>
      row.map((cell, ci) => ({
        ...cell,
        bold:
          ri === editHeaderRow ||
          ci === editHeaderCol ||
          cell.bold ||
          undefined,
      }))
    );
    onChange({
      ...block,
      rows: finalRows,
      headerRowIndex: editHeaderRow,
      headerColIndex: editHeaderCol,
    });
    setIsEditing(false);
  };

  const cancelEdit = () => setIsEditing(false);

  // ── Cell mutation helpers (operate on editData) ───────────────────────────
  const updateCell = (ri: number, ci: number, value: string) =>
    setEditData((prev) =>
      prev.map((row, r) =>
        r === ri ? row.map((c, col) => (col === ci ? value : c)) : row
      )
    );

  const addRow = () => {
    const cols = editData[0]?.length || 1;
    setEditData((d) => [...d, Array(cols).fill('')]);
  };

  const addCol = () => setEditData((d) => d.map((row) => [...row, '']));

  const deleteRow = (ri: number) => {
    if (editData.length <= 1) return;
    setEditData((d) => d.filter((_, i) => i !== ri));
    if (editHeaderRow === ri) setEditHeaderRow(-1);
    else if (editHeaderRow > ri) setEditHeaderRow((h) => h - 1);
  };

  const deleteCol = (ci: number) => {
    if ((editData[0]?.length ?? 0) <= 1) return;
    setEditData((d) => d.map((row) => row.filter((_, i) => i !== ci)));
    if (editHeaderCol === ci) setEditHeaderCol(-1);
    else if (editHeaderCol > ci) setEditHeaderCol((h) => h - 1);
  };

  const toggleHeaderRow = (ri: number) =>
    setEditHeaderRow((prev) => (prev === ri ? -1 : ri));

  const toggleHeaderCol = (ci: number) =>
    setEditHeaderCol((prev) => (prev === ci ? -1 : ci));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={isEditing ? 'py-1' : 'group relative py-1'}>
      {/* Optional caption */}
      {block.caption && (
        <p className="text-sm font-medium mb-1 text-gray-700">
          {block.caption}
        </p>
      )}

      {isEditing ? (
        /* ════════════════════ EDIT MODE ════════════════════ */
        <div className="border border-blue-400 rounded-md bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 bg-blue-50 border-b border-blue-200 rounded-t-md text-xs text-blue-700">
            <span className="font-semibold">表格编辑</span>
            <span className="text-blue-400 text-[10px] hidden sm:inline">
              直接在格子里输入 · 黄色=字段行/列
            </span>
            <div className="flex-1" />
            <button
              onClick={cancelEdit}
              className="px-2.5 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-600"
            >
              取消
            </button>
            <button
              onClick={saveEdit}
              className="px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              保存
            </button>
          </div>

          {/* Input grid */}
          <div className="p-2">
            <TableEditGrid
              data={editData}
              headerRowIndex={editHeaderRow}
              headerColIndex={editHeaderCol}
              onUpdate={updateCell}
              onAddRow={addRow}
              onAddCol={addCol}
              onDeleteRow={deleteRow}
              onDeleteCol={deleteCol}
              onToggleHeaderRow={toggleHeaderRow}
              onToggleHeaderCol={toggleHeaderCol}
            />
          </div>
        </div>
      ) : (
        /* ════════════════════ VIEW MODE ════════════════════ */
        <div>
          <div className="overflow-x-auto">
            <TableViewGrid
              rows={block.rows}
              headerRowIndex={block.headerRowIndex}
              headerColIndex={block.headerColIndex}
            />
          </div>

          {/* Hover controls */}
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 mt-1 items-center flex-wrap transition-opacity">
            <button
              onClick={enterEdit}
              className="px-2 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
            >
              ✎ 编辑
            </button>
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded border border-gray-300"
            >
              ↑ 上移
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded border border-gray-300"
            >
              ↓ 下移
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-0.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200"
            >
              ✕ 删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
