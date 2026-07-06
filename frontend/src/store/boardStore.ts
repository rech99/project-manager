import { create } from 'zustand';
import api from '../services/api';
import type { User } from './authStore';

export interface Project {
  id: string;
  organization: string;
  organization_name: string;
  name: string;
  key: string;
  description: string;
  project_type: 'KANBAN' | 'SCRUM' | 'HYBRID';
  members: ProjectMember[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project: string;
  user: User;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  joined_at: string;
}

export interface Task {
  id: string;
  project: string;
  board: string;
  column: string;
  sprint: string | null;
  parent: string | null;
  key: string;
  title: string;
  description?: string;
  task_type: 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  story_points: number | null;
  rank_order: string;
  assignee: User | null;
  reporter: User;
  time_spent_seconds: number;
  time_estimate_seconds: number;
  subtask_count: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board: string;
  name: string;
  wip_limit: number | null;
  rank_order: string;
  tasks: Task[];
  created_at: string;
}

export interface Board {
  id: string;
  project: string;
  name: string;
  description?: string;
  columns: Column[];
  created_at: string;
}

interface BoardState {
  projects: Project[];
  activeProject: Project | null;
  activeBoard: Board | null;
  isLoading: boolean;
  error: string | null;
  
  fetchProjects: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  
  // Optimistic & WebSocket state management
  moveTaskLocal: (
    taskId: string,
    sourceColId: string,
    targetColId: string,
    newRank: string,
    sprintId?: string | null
  ) => void;
  
  updateTaskInBoard: (task: Task) => void;
  addTaskToColumn: (task: Task) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  projects: [],
  activeProject: null,
  activeBoard: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('projects/');
      set({ projects: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch projects', isLoading: false });
    }
  },

  selectProject: async (projectId) => {
    set({ isLoading: true, activeBoard: null });
    try {
      const response = await api.get(`projects/${projectId}/`);
      set({ activeProject: response.data });
      
      // Auto-fetch the first board of this project
      const boardsResponse = await api.get(`boards/?project=${projectId}`);
      if (boardsResponse.data.length > 0) {
        await get().fetchBoard(boardsResponse.data[0].id);
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: 'Failed to load project details', isLoading: false });
    }
  },

  fetchBoard: async (boardId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`boards/${boardId}/`);
      set({ activeBoard: response.data, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to fetch board columns and tasks', isLoading: false });
    }
  },

  moveTaskLocal: (taskId, sourceColId, targetColId, newRank, sprintId = undefined) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    // Find the task inside source column tasks
    let taskToMove: Task | null = null;
    const updatedColumns = activeBoard.columns.map((col) => {
      if (col.id === sourceColId) {
        // Find task
        const found = col.tasks.find((t) => t.id === taskId);
        if (found) {
          taskToMove = { ...found, column: targetColId, rank_order: newRank };
          if (sprintId !== undefined) {
            taskToMove.sprint = sprintId;
          }
        }
        // Filter out task from source column
        return {
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        };
      }
      return col;
    });

    if (!taskToMove) return;

    // Add task to target column tasks and re-sort by rank_order
    const finalColumns = updatedColumns.map((col) => {
      if (col.id === targetColId) {
        const list = [...col.tasks, taskToMove!];
        // Sort alphabetically by lexorank string
        list.sort((a, b) => a.rank_order.localeCompare(b.rank_order));
        return {
          ...col,
          tasks: list,
        };
      }
      return col;
    });

    set({
      activeBoard: {
        ...activeBoard,
        columns: finalColumns,
      },
    });
  },

  updateTaskInBoard: (task) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const updatedColumns = activeBoard.columns.map((col) => {
      // If task moved column, we filter it out of other columns and insert in col
      if (col.id === task.column) {
        const exists = col.tasks.some((t) => t.id === task.id);
        let list = [];
        if (exists) {
          list = col.tasks.map((t) => (t.id === task.id ? task : t));
        } else {
          list = [...col.tasks, task];
        }
        list.sort((a, b) => a.rank_order.localeCompare(b.rank_order));
        return { ...col, tasks: list };
      } else {
        // Make sure it doesn't exist in other columns
        return {
          ...col,
          tasks: col.tasks.filter((t) => t.id !== task.id),
        };
      }
    });

    set({
      activeBoard: {
        ...activeBoard,
        columns: updatedColumns,
      },
    });
  },

  addTaskToColumn: (task) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const updatedColumns = activeBoard.columns.map((col) => {
      if (col.id === task.column) {
        const list = [...col.tasks, task];
        list.sort((a, b) => a.rank_order.localeCompare(b.rank_order));
        return {
          ...col,
          tasks: list,
        };
      }
      return col;
    });

    set({
      activeBoard: {
        ...activeBoard,
        columns: updatedColumns,
      },
    });
  }
}));
