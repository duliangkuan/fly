'use client';

import { useState } from 'react';
import {
  DocumentBlock,
  TextBlock as TBlock,
  TableBlock as TTable,
  ImageBlock as TImage,
} from '@/lib/types';
import TextBlockComp from './blocks/TextBlock';
import TableBlockComp from './blocks/TableBlock';
import ImageBlockComp from './blocks/ImageBlock';

interface Props {
  blocks: DocumentBlock[];
  onUpdateBlock: (block: DocumentBlock) => void;
  onDeleteBlock: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onReorder: (dragId: string, targetId: string, position: 'above' | 'below') => void;
}

export default function DocumentEditor({
  blocks,
  onUpdateBlock,
  onDeleteBlock,
  onMoveUp,
  onMoveDown,
  onReorder,
}: Props) {
  // Which block is actively being dragged
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Which block the cursor is hovering over as a drop target
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Whether the drop indicator line should be above or below the target
  const [dropPos, setDropPos] = useState<'above' | 'below'>('below');
  // Which block row is mouse-hovered (to show the drag handle)
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Drag source handlers ──────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Use plain text as fallback for some browsers
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  // ── Drop target handlers ──────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id === draggingId) return;
    e.dataTransfer.dropEffect = 'move';

    // Determine above / below the midpoint of this block
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDragOverId(id);
    setDropPos(e.clientY < mid ? 'above' : 'below');
  };

  const onDragLeave = (e: React.DragEvent) => {
    // Ignore synthetic leave events caused by entering child elements
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOverId(null);
  };

  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const dragId = draggingId ?? e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    onReorder(dragId, targetId, dropPos);
    setDraggingId(null);
    setDragOverId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-lg mb-2">文档为空</p>
        <p className="text-sm">
          使用顶部工具栏「导入模板」或「添加表格」「添加文本」开始编辑
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {blocks.map((block, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === blocks.length - 1;
        const isDragging = block.id === draggingId;
        const isOver = block.id === dragOverId && !isDragging;
        const isHovered = block.id === hoveredId;

        const commonProps = {
          onDelete: () => onDeleteBlock(block.id),
          onMoveUp: () => onMoveUp(block.id),
          onMoveDown: () => onMoveDown(block.id),
          isFirst,
          isLast,
        };

        return (
          <div
            key={block.id}
            // ── Drop-target events ──
            onDragOver={(e) => onDragOver(e, block.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, block.id)}
            // ── Hover tracking for drag handle visibility ──
            onMouseEnter={() => setHoveredId(block.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              relative flex items-start gap-0.5
              transition-opacity duration-100
              ${isDragging ? 'opacity-30' : 'opacity-100'}
            `}
          >
            {/* ── Drop-indicator lines ────────────────────────────────── */}
            {isOver && dropPos === 'above' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-20 pointer-events-none rounded" />
            )}
            {isOver && dropPos === 'below' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-20 pointer-events-none rounded" />
            )}

            {/* ── Drag handle ─────────────────────────────────────────── */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, block.id)}
              onDragEnd={onDragEnd}
              title="拖动调整顺序"
              className={`
                mt-2 px-0.5 flex-shrink-0 select-none
                cursor-grab active:cursor-grabbing
                text-gray-400 hover:text-gray-600
                transition-opacity duration-150
                ${isHovered || isDragging ? 'opacity-100' : 'opacity-0'}
              `}
            >
              {/* Six-dot drag-handle icon */}
              <svg
                width="10" height="16" viewBox="0 0 10 16"
                fill="currentColor" className="pointer-events-none"
              >
                <circle cx="2" cy="3"  r="1.5" />
                <circle cx="8" cy="3"  r="1.5" />
                <circle cx="2" cy="8"  r="1.5" />
                <circle cx="8" cy="8"  r="1.5" />
                <circle cx="2" cy="13" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </div>

            {/* ── Block content ────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {block.type === 'text' && (
                <TextBlockComp
                  block={block as TBlock}
                  onChange={(b) => onUpdateBlock(b)}
                  {...commonProps}
                />
              )}
              {block.type === 'table' && (
                <TableBlockComp
                  block={block as TTable}
                  onChange={(b) => onUpdateBlock(b)}
                  {...commonProps}
                />
              )}
              {block.type === 'image' && (
                <ImageBlockComp
                  block={block as TImage}
                  onChange={(b) => onUpdateBlock(b)}
                  {...commonProps}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
