'use client';

import { useState, useRef } from 'react';
import { DocumentBlock } from '@/lib/types';
import { parseMarkdownToBlocks } from '@/lib/parseTextIn';

interface Props {
  onImport: (blocks: DocumentBlock[], mode: 'replace' | 'append') => void;
  onClose: () => void;
}

export default function ImportTemplateModal({ onImport, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [replaceOrAppend, setReplaceOrAppend] = useState<'replace' | 'append'>(
    'replace'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File) => {
    setFile(f);
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
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

  const handleImport = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/textin/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || '解析失败');
      }

      // Extract markdown from response
      const markdown: string =
        data?.result?.markdown ||
        data?.result?.text ||
        data?.data?.markdown ||
        '';

      if (!markdown) {
        throw new Error('未能从文档中提取内容，请确认文件格式正确');
      }

      const blocks = parseMarkdownToBlocks(markdown);

      if (blocks.length === 0) {
        throw new Error('未能解析出任何内容');
      }

      onImport(blocks, replaceOrAppend);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '导入失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">导入模板</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600">
            上传 Word（.docx）或 PDF 文件，系统将解析全部内容（包含表格、图片、文字）并直接导入到编辑区。
          </p>

          {/* File upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none
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
                  支持 .pdf、.docx、.doc、.xlsx、.xls、.png、.jpg 等格式
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.bmp,.tiff"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Replace or append */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="replace"
                checked={replaceOrAppend === 'replace'}
                onChange={() => setReplaceOrAppend('replace')}
              />
              替换当前内容
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="append"
                checked={replaceOrAppend === 'append'}
                onChange={() => setReplaceOrAppend('append')}
              />
              追加到末尾
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                解析中...
              </>
            ) : (
              '开始导入'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
