'use client';

interface Props {
  title: string;
  onTitleChange: (t: string) => void;
  onImportTemplate: () => void;
  onWriteData: () => void;
  onAddTable: () => void;
  onAddText: () => void;
  onExport: () => void;
  onClearAll: () => void;
  blockCount: number;
}

export default function Toolbar({
  title,
  onTitleChange,
  onImportTemplate,
  onWriteData,
  onAddTable,
  onAddText,
  onExport,
  onClearAll,
  blockCount,
}: Props) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-300 shadow-sm print:hidden">
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="font-semibold text-sm border border-transparent hover:border-gray-300 focus:border-blue-400 rounded px-2 py-1 outline-none min-w-[120px] max-w-[200px]"
          placeholder="文档标题"
        />

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Main action buttons */}
        <button
          onClick={onImportTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          title="上传Word/PDF，将完整内容（含表格、图片、文字）导入到编辑区"
        >
          <span>📥</span> 导入模板
        </button>

        <button
          onClick={onWriteData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          title="上传数据源文档，自动提取数据填入表格字段"
        >
          <span>✏️</span> 写入数据
        </button>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Edit tools */}
        <button
          onClick={onAddTable}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
          title="添加自定义空白表格"
        >
          <span>📊</span> 添加表格
        </button>

        <button
          onClick={onAddText}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded"
          title="在文档末尾添加文本块"
        >
          <span>📝</span> 添加文本
        </button>

        <div className="h-5 w-px bg-gray-300 mx-1" />

        {/* Export */}
        <button
          onClick={onExport}
          disabled={blockCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          title="导出为PDF或Word文档"
        >
          <span>💾</span> 导出
        </button>

        <div className="flex-1" />

        {/* Block count */}
        {blockCount > 0 && (
          <span className="text-xs text-gray-400">
            共 {blockCount} 个内容块
          </span>
        )}

        {/* Clear */}
        {blockCount > 0 && (
          <button
            onClick={() => {
              if (confirm('确定清空所有内容吗？此操作不可撤销。')) {
                onClearAll();
              }
            }}
            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded"
            title="清空所有内容"
          >
            清空
          </button>
        )}
      </div>

      {/* Tips bar */}
      <div className="px-4 py-1 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
        <span>💡 将鼠标悬停在内容块上可显示操作按钮（移动/删除）</span>
        <span>表格单元格直接点击即可编辑</span>
      </div>
    </div>
  );
}
