'use client';

import { useState } from 'react';

interface Props {
  title: string;
  onClose: () => void;
}

export default function ExportModal({ title, onClose }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'word' | null>(null);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState(title || '飞机日报');

  const handleExportPDF = async () => {
    setLoading('pdf');
    setError('');
    try {
      const { exportToPDF } = await import('@/lib/exportPDF');
      await exportToPDF(`${filename}.pdf`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(null);
    }
  };

  const handleExportWord = async () => {
    setLoading('word');
    setError('');
    try {
      const { exportToWord } = await import('@/lib/exportWord');
      await exportToWord(title, `${filename}.docx`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">导出文档</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              文件名
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* PDF */}
            <button
              onClick={handleExportPDF}
              disabled={!!loading}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">📄</span>
              <span className="font-medium text-sm">导出 PDF</span>
              <span className="text-xs text-gray-400 text-center leading-tight">
                截取页面真实渲染<br />100% 所见即所得
              </span>
              {loading === 'pdf' && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                  生成中...
                </span>
              )}
            </button>

            {/* Word */}
            <button
              onClick={handleExportWord}
              disabled={!!loading}
              className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-2xl">📝</span>
              <span className="font-medium text-sm">导出 Word</span>
              <span className="text-xs text-gray-400 text-center leading-tight">
                基于渲染 HTML 重建<br />表格文字均可编辑
              </span>
              {loading === 'word' && (
                <span className="text-xs text-blue-500 flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                  生成中...
                </span>
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded p-2 border border-red-200">
              ⚠️ {error}
            </p>
          )}

          <p className="text-xs text-gray-400">
            PDF 通过截取页面 DOM 生成，表格与样式与页面完全一致；
            Word 将渲染后的 HTML 转换为可编辑文档。
          </p>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
