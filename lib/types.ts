import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  heading?: 1 | 2 | 3 | null;
}

export interface TableCell {
  content: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  rowSpan?: number;
  colSpan?: number;
}

export interface TableBlock {
  id: string;
  type: 'table';
  rows: TableCell[][];
  headerRowIndex: number; // -1 for none, 0 for first row, etc.
  headerColIndex: number; // -1 for none
  caption?: string;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string; // base64 data URL
  width?: number;
  height?: number;
  alt?: string;
}

export type DocumentBlock = TextBlock | TableBlock | ImageBlock;

export interface DocumentState {
  blocks: DocumentBlock[];
  title: string;
}

export type BlockAction =
  | { type: 'SET_BLOCKS'; blocks: DocumentBlock[] }
  | { type: 'ADD_BLOCK'; block: DocumentBlock }
  | { type: 'INSERT_BLOCK'; block: DocumentBlock; afterId: string }
  | { type: 'UPDATE_BLOCK'; block: DocumentBlock }
  | { type: 'DELETE_BLOCK'; id: string }
  | { type: 'MOVE_UP'; id: string }
  | { type: 'MOVE_DOWN'; id: string }
  | { type: 'REORDER_BLOCK'; dragId: string; targetId: string; position: 'above' | 'below' }
  | { type: 'SET_TITLE'; title: string };

export function documentReducer(
  state: DocumentState,
  action: BlockAction
): DocumentState {
  switch (action.type) {
    case 'SET_BLOCKS':
      return { ...state, blocks: action.blocks };
    case 'ADD_BLOCK':
      return { ...state, blocks: [...state.blocks, action.block] };
    case 'INSERT_BLOCK': {
      const idx = state.blocks.findIndex((b) => b.id === action.afterId);
      if (idx === -1) return { ...state, blocks: [...state.blocks, action.block] };
      const newBlocks = [...state.blocks];
      newBlocks.splice(idx + 1, 0, action.block);
      return { ...state, blocks: newBlocks };
    }
    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.block.id ? action.block : b
        ),
      };
    case 'DELETE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.id),
      };
    case 'MOVE_UP': {
      const idx = state.blocks.findIndex((b) => b.id === action.id);
      if (idx <= 0) return state;
      const newBlocks = [...state.blocks];
      [newBlocks[idx - 1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx - 1]];
      return { ...state, blocks: newBlocks };
    }
    case 'MOVE_DOWN': {
      const idx = state.blocks.findIndex((b) => b.id === action.id);
      if (idx === -1 || idx >= state.blocks.length - 1) return state;
      const newBlocks = [...state.blocks];
      [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
      return { ...state, blocks: newBlocks };
    }
    case 'REORDER_BLOCK': {
      const blocks = [...state.blocks];
      const fromIdx = blocks.findIndex((b) => b.id === action.dragId);
      if (fromIdx === -1) return state;
      // Remove the dragged block first
      const [dragged] = blocks.splice(fromIdx, 1);
      // Find target's new index (may have shifted after removal)
      const toIdx = blocks.findIndex((b) => b.id === action.targetId);
      if (toIdx === -1) return state;
      const insertAt = action.position === 'above' ? toIdx : toIdx + 1;
      blocks.splice(insertAt, 0, dragged);
      return { ...state, blocks };
    }
    case 'SET_TITLE':
      return { ...state, title: action.title };
    default:
      return state;
  }
}
