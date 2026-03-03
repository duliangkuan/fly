'use client';

import { ImageBlock as ImageBlockType } from '@/lib/types';
import { useState } from 'react';
interface Props {
  block: ImageBlockType;
  onChange: (block: ImageBlockType) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function ImageBlock({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const [editingSize, setEditingSize] = useState(false);
  const [w, setW] = useState(block.width || 400);
  const [h, setH] = useState(block.height || 300);

  const applySize = () => {
    onChange({ ...block, width: w, height: h });
    setEditingSize(false);
  };

  return (
    <div className="group relative py-1">
      <div className="flex items-start gap-2">
        <div className="flex-1 flex justify-center">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.src}
              alt={block.alt || '图片'}
              style={{
                width: block.width ? `${block.width}px` : 'auto',
                height: block.height ? `${block.height}px` : 'auto',
                maxWidth: '100%',
              }}
              className="object-contain"
            />
          ) : (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm"
              style={{ width: '400px', height: '200px' }}>
              图片加载失败
            </div>
          )}
        </div>

        {/* Block controls */}
        <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="上移"
            className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded border border-gray-300"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="下移"
            className="px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded border border-gray-300"
          >
            ↓
          </button>
          <button
            onClick={() => setEditingSize(!editingSize)}
            title="调整尺寸"
            className="px-1.5 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-200"
          >
            尺寸
          </button>
          <button
            onClick={onDelete}
            title="删除"
            className="px-1.5 py-0.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Size editor */}
      {editingSize && (
        <div className="mt-1 flex items-center gap-2 text-sm bg-gray-50 rounded p-2 border border-gray-200">
          <label>宽:</label>
          <input
            type="number"
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded px-1 py-0.5"
          />
          <label>高:</label>
          <input
            type="number"
            value={h}
            onChange={(e) => setH(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded px-1 py-0.5"
          />
          <span className="text-xs text-gray-500">px</span>
          <button
            onClick={applySize}
            className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded"
          >
            应用
          </button>
        </div>
      )}
    </div>
  );
}
