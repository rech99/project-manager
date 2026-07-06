import React, { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import type { Task, Column } from '../../store/boardStore';
import { useWebSocketStore } from '../../store/webSocketStore';
import { useAuthStore } from '../../store/authStore';
import { Plus, BarChart2, Users, AlertTriangle } from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import api from '../../services/api';

// A simple client-side Lexorank calculator matching our Python implementation
const getMidpointChar = (char1: string, char2: string): string => {
  const code1 = char1.charCodeAt(0);
  const code2 = char2.charCodeAt(0);
  return String.fromCharCode(Math.floor((code1 + code2) / 2));
};

const calculateRankBetween = (prev: string | null, next: string | null): string => {
  const min = 'a';
  const max = 'z';
  const mid = 'n';
  
  if (!prev && !next) return mid;
  if (!prev) {
    if (!next) return min;
    if (next[0] > min) return getMidpointChar(min, next[0]);
    const res = [min];
    let i = 1;
    while (i < next.length) {
      if (next[i] > min) {
        res.push(getMidpointChar(min, next[i]));
        return res.join('');
      }
      res.push(min);
      i++;
    }
    res.push(mid);
    return res.join('');
  }
  if (!next) {
    const last = prev[prev.length - 1];
    if (last < max) return prev.slice(0, -1) + getMidpointChar(last, max);
    return prev + mid;
  }
  
  const maxLen = Math.max(prev.length, next.length);
  const padP = prev.padEnd(maxLen, min);
  const padN = next.padEnd(maxLen, min);
  
  let i = 0;
  while (i < maxLen) {
    if (padP[i] !== padN[i]) break;
    i++;
  }
  
  if (i === maxLen) return prev + mid;
  
  const charP = padP[i];
  const charN = padN[i];
  
  if (charN.charCodeAt(0) - charP.charCodeAt(0) > 1) {
    return prev.slice(0, i) + getMidpointChar(charP, charN);
  } else {
    return prev.slice(0, i) + charP + calculateRankBetween(prev.slice(i + 1) || null, null);
  }
};

interface BoardViewProps {
  onSelectTask: (task: Task) => void;
  onToggleCharts: () => void;
  showCharts: boolean;
}

export const BoardView: React.FC<BoardViewProps> = ({ onSelectTask, onToggleCharts, showCharts }) => {
  const { activeProject, activeBoard, updateTaskInBoard, addTaskToColumn } = useBoardStore();
  const { token, user } = useAuthStore();
  const { connectBoard, disconnectBoard, sendTaskMove, isConnected, collaborators } = useWebSocketStore();
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'STORY' | 'TASK' | 'BUG'>('TASK');
  const [targetColumnId, setTargetColumnId] = useState('');
  
  // Track dragging locally
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // 1. WebSocket Connection lifecycle
  useEffect(() => {
    if (activeBoard && token) {
      connectBoard(activeBoard.id, token);
    }
    return () => {
      disconnectBoard();
    };
  }, [activeBoard?.id]);

  if (!activeProject || !activeBoard) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Select a project from the sidebar to view its Kanban board.
      </div>
    );
  }

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId, sourceColId }));
    setDraggingTaskId(taskId);
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle Drop
  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDraggingTaskId(null);
    
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { taskId, sourceColId } = JSON.parse(dataStr);
      
      if (sourceColId === targetColId) return;

      const targetCol = activeBoard.columns.find((c) => c.id === targetColId);
      if (!targetCol) return;

      // Find the drop location inside target column
      // To keep it simple, we put it at the end of the column:
      const lastTask = targetCol.tasks[targetCol.tasks.length - 1] || null;
      const newRank = calculateRankBetween(lastTask ? lastTask.rank_order : null, null);

      // Perform move via WebSockets (which broadcasts to all users and updates local state)
      if (isConnected) {
        sendTaskMove(taskId, sourceColId, targetColId, newRank);
      } else {
        // Fallback to REST API if WebSocket not connected
        api.patch(`tasks/${taskId}/move/`, {
          target_column_id: targetColId,
          prev_task_rank: lastTask ? lastTask.rank_order : null,
          next_task_rank: null
        }).then((res) => {
          updateTaskInBoard(res.data);
        }).catch(err => console.error("REST move fallback failed:", err));
      }
    } catch (err) {
      console.error("Drop failed:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !targetColumnId) return;

    try {
      const response = await api.post('tasks/', {
        project: activeProject.id,
        board: activeBoard.id,
        column: targetColumnId,
        title: newTaskTitle,
        task_type: newTaskType,
      });

      addTaskToColumn(response.data);
      setNewTaskTitle('');
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error("Task creation failed:", err);
    }
  };

  // Check if a column exceeds its WIP limit
  const isWipExceeded = (col: Column) => {
    return col.wip_limit !== null && col.tasks.length > col.wip_limit;
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Board Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
            {activeBoard.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {activeProject.name} &bull; {activeProject.project_type}
          </p>
        </div>

        {/* Action Controls & Presence Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Active Collaborators list */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} color="var(--text-muted)" />
            <div style={{ display: 'flex', position: 'relative' }}>
              <div 
                className="avatar" 
                style={{ backgroundColor: 'var(--secondary)', fontSize: '11px', width: '28px', height: '28px' }}
                title={`${user?.username} (You)`}
              >
                You
              </div>
              {Object.values(collaborators).map((c) => (
                <div
                  key={c.id}
                  className="avatar"
                  style={{
                    backgroundColor: 'var(--primary)',
                    fontSize: '11px',
                    width: '28px',
                    height: '28px',
                    marginLeft: '-8px',
                    border: '2px solid var(--bg-surface)'
                  }}
                  title={c.name}
                >
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {activeProject.project_type === 'SCRUM' && (
            <Button variant={showCharts ? 'primary' : 'secondary'} onClick={onToggleCharts}>
              <BarChart2 size={16} />
              {showCharts ? 'Hide Sprint Analytics' : 'Sprint Analytics'}
            </Button>
          )}
        </div>
      </div>

      {/* Board Columns container */}
      <div className="board-container">
        {activeBoard.columns.map((col) => {
          const colExceeded = isWipExceeded(col);
          return (
            <div
              key={col.id}
              className={`column-wrapper ${colExceeded ? 'column-wip-exceeded' : ''}`}
            >
              <div className="column-header">
                <div className="column-title">
                  <span>{col.name}</span>
                  <span className="column-count">{col.tasks.length}</span>
                  {col.wip_limit !== null && (
                    <span className="column-wip-badge" title="Work In Progress Limit">
                      WIP: {col.wip_limit}
                    </span>
                  )}
                </div>
                
                {/* Add task button */}
                <button
                  onClick={() => {
                    setTargetColumnId(col.id);
                    setIsTaskModalOpen(true);
                  }}
                  className="btn-text"
                  style={{ padding: '4px', borderRadius: '4px' }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* WIP Limit warnings */}
              {colExceeded && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--danger-glow)',
                  borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--danger)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '500'
                }}>
                  <AlertTriangle size={14} />
                  <span>WIP Limit exceeded! (Max: {col.wip_limit})</span>
                </div>
              )}

              {/* Column Cards Drop Target */}
              <div
                className="cards-container"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {col.tasks.map((task) => {
                  const isDragging = draggingTaskId === task.id;
                  
                  // Collect collaborators looking at this task
                  const activeViewers = Object.values(collaborators).filter(
                    (c) => c.active_card_id === task.id
                  );

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                      onClick={() => onSelectTask(task)}
                      className={`task-card ${isDragging ? 'dragging' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className={`badge badge-${task.task_type.toLowerCase()}`}>
                          {task.task_type}
                        </span>
                        <span className={`badge badge-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '12px', lineHeight: '1.3' }}>
                        {task.title}
                      </h4>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                      }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: '600' }}>
                          {task.key}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Collaborator details looking at this card */}
                          {activeViewers.length > 0 && (
                            <div style={{ display: 'flex', marginRight: '4px' }}>
                              {activeViewers.map(v => (
                                <div
                                  key={v.id}
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--primary)',
                                    border: '1px solid var(--bg-surface)',
                                    marginLeft: '-2px'
                                  }}
                                  title={`${v.name} is looking at this card`}
                                />
                              ))}
                            </div>
                          )}

                          {task.story_points !== null && (
                            <span style={{
                              backgroundColor: 'var(--bg-surface-elevated)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              {task.story_points}
                            </span>
                          )}

                          {task.assignee && (
                            <div
                              className="avatar"
                              style={{ width: '22px', height: '22px', fontSize: '9px' }}
                              title={`Assigned to ${task.assignee.username}`}
                            >
                              {(task.assignee.first_name?.[0] || task.assignee.username[0]).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Create New Task">
        <form onSubmit={handleCreateTask}>
          <Input
            label="Task Title"
            type="text"
            id="task-title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="e.g. Implement WebSocket reconnection retry"
            required
          />

          <div className="form-group">
            <label htmlFor="task-type">Task Type</label>
            <select
              id="task-type"
              value={newTaskType}
              onChange={(e) => setNewTaskType(e.target.value as any)}
            >
              <option value="TASK">Task (General Work)</option>
              <option value="STORY">User Story (Feature)</option>
              <option value="BUG">Bug (Issue)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default BoardView;
