'use client';

import { useReducer, useState } from 'react';
import { documentReducer, generateId, DocumentBlock, TextBlock } from '@/lib/types';
import Toolbar from '@/components/Toolbar';
import DocumentEditor from '@/components/DocumentEditor';
import ImportTemplateModal from '@/components/modals/ImportTemplateModal';
import WriteDataModal from '@/components/modals/WriteDataModal';
import AddTableModal from '@/components/modals/AddTableModal';
import ExportModal from '@/components/modals/ExportModal';

type ModalType = 'import' | 'writeData' | 'addTable' | 'export' | null;

const initialState = {
  blocks: [] as DocumentBlock[],
  title: '飞机日报',
};

export default function Home() {
  const [state, dispatch] = useReducer(documentReducer, initialState);
  const [modal, setModal] = useState<ModalType>(null);

  const handleImport = (blocks: DocumentBlock[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      dispatch({ type: 'SET_BLOCKS', blocks });
    } else {
      blocks.forEach((block) => dispatch({ type: 'ADD_BLOCK', block }));
    }
    setModal(null);
  };

  const handleWriteData = (updatedBlocks: DocumentBlock[]) => {
    dispatch({ type: 'SET_BLOCKS', blocks: updatedBlocks });
    setModal(null);
  };

  const handleAddTable = (block: DocumentBlock) => {
    dispatch({ type: 'ADD_BLOCK', block });
    setModal(null);
  };

  const handleAddText = () => {
    const block: TextBlock = {
      id: generateId(),
      type: 'text',
      content: '',
    };
    dispatch({ type: 'ADD_BLOCK', block });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Toolbar
        title={state.title}
        onTitleChange={(t) => dispatch({ type: 'SET_TITLE', title: t })}
        onImportTemplate={() => setModal('import')}
        onWriteData={() => setModal('writeData')}
        onAddTable={() => setModal('addTable')}
        onAddText={handleAddText}
        onExport={() => setModal('export')}
        onClearAll={() => dispatch({ type: 'SET_BLOCKS', blocks: [] })}
        blockCount={state.blocks.length}
      />

      {/* Document area */}
      <main className="flex-1 overflow-y-auto py-6 px-4">
        <div
          id="report-render-canvas"
          className="bg-white mx-auto shadow-md"
          style={{
            width: '794px',
            maxWidth: '100%',
            minHeight: '1123px', // A4 height in px at 96dpi
            padding: '40px 50px',
          }}
        >
          {/* Document title */}
          {state.title && (
            <h1 className="text-xl font-bold text-center mb-6 border-b pb-3">
              {state.title}
            </h1>
          )}

          <DocumentEditor
            blocks={state.blocks}
            onUpdateBlock={(block) => dispatch({ type: 'UPDATE_BLOCK', block })}
            onDeleteBlock={(id) => dispatch({ type: 'DELETE_BLOCK', id })}
            onMoveUp={(id) => dispatch({ type: 'MOVE_UP', id })}
            onMoveDown={(id) => dispatch({ type: 'MOVE_DOWN', id })}
            onReorder={(dragId, targetId, position) =>
              dispatch({ type: 'REORDER_BLOCK', dragId, targetId, position })
            }
          />
        </div>
      </main>

      {/* Modals */}
      {modal === 'import' && (
        <ImportTemplateModal
          onImport={handleImport}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'writeData' && (
        <WriteDataModal
          blocks={state.blocks}
          onWrite={handleWriteData}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'addTable' && (
        <AddTableModal
          onAdd={handleAddTable}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'export' && (
        <ExportModal
          title={state.title}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
