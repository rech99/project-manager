import { create } from 'zustand';
import { WS_BASE_URL } from '../services/api';
import { useBoardStore } from './boardStore';

export interface Collaborator {
  id: string;
  username: string;
  name: string;
  cursor?: { x: number; y: number };
  active_card_id?: string | null;
  lastActive: number;
}

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  collaborators: Record<string, Collaborator>;
  
  connectBoard: (boardId: string, token: string) => void;
  disconnectBoard: () => void;
  sendTaskMove: (
    taskId: string,
    sourceColId: string,
    targetColId: string,
    newRank: string,
    sprintId?: string | null
  ) => void;
  sendPresence: (cursor?: { x: number; y: number } | null, activeCardId?: string | null) => void;
}

let reconnectTimeout: any = null;

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  collaborators: {},

  connectBoard: (boardId, token) => {
    // 1. Close existing socket
    get().disconnectBoard();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    // 2. Open new WebSocket connection
    const url = `${WS_BASE_URL}board/${boardId}/?token=${token}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      set({ socket: ws, isConnected: true, collaborators: {} });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { event: wsEvent, payload, user } = data;

        if (wsEvent === 'TASK_MOVED') {
          // Update board store instantly on server confirm or other users' moves
          const boardStore = useBoardStore.getState();
          boardStore.moveTaskLocal(
            payload.task_id,
            payload.source_column_id,
            payload.target_column_id,
            payload.new_rank_order,
            payload.sprint_id
          );
        } else if (wsEvent === 'PRESENCE_UPDATED' && user) {
          // Update collaborator pointer location and active card
          set((state) => {
            const userId = user.id;
            const updatedCollaborators = { ...state.collaborators };
            
            updatedCollaborators[userId] = {
              id: userId,
              username: user.username,
              name: user.name,
              cursor: payload.cursor,
              active_card_id: payload.active_card_id,
              lastActive: Date.now(),
            };

            // Clean up stale collaborators (inactive for > 10 seconds)
            const now = Date.now();
            for (const key in updatedCollaborators) {
              if (now - updatedCollaborators[key].lastActive > 10000) {
                delete updatedCollaborators[key];
              }
            }

            return { collaborators: updatedCollaborators };
          });
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      set({ socket: null, isConnected: false });
      
      // Auto-reconnect if not closed intentionally
      if (event.code !== 1000 && event.code !== 1005) {
        reconnectTimeout = setTimeout(() => {
          get().connectBoard(boardId, token);
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket encountered an error:', err);
      ws.close();
    };
  },

  disconnectBoard: () => {
    const { socket } = get();
    if (socket) {
      socket.close(1000, 'Intentional disconnect');
    }
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    set({ socket: null, isConnected: false, collaborators: {} });
  },

  sendTaskMove: (taskId, sourceColId, targetColId, newRank, sprintId = null) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.send(
        JSON.stringify({
          action: 'task_move',
          payload: {
            task_id: taskId,
            source_column_id: sourceColId,
            target_column_id: targetColId,
            new_rank_order: newRank,
            sprint_id: sprintId,
          },
        })
      );
    }
  },

  sendPresence: (cursor = null, activeCardId = null) => {
    const { socket, isConnected } = get();
    if (socket && isConnected) {
      socket.send(
        JSON.stringify({
          action: 'presence_update',
          payload: {
            cursor,
            active_card_id: activeCardId,
          },
        })
      );
    }
  }
}));
