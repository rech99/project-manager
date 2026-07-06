import React, { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import type { Task } from '../../store/boardStore';
import { useWebSocketStore } from '../../store/webSocketStore';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../services/api';
import { MessageSquare, Activity, Edit2, Check } from 'lucide-react';

interface TaskDetailsModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ taskId, isOpen, onClose }) => {
  const { activeProject, updateTaskInBoard } = useBoardStore();
  const { sendPresence, isConnected } = useWebSocketStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Field editing states
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [description, setDescription] = useState('');
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');

  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // 1. Fetch full details when selected taskId changes
  useEffect(() => {
    if (taskId && isOpen) {
      loadTaskDetails();
      
      // Notify other users via WebSocket that I am currently looking at this card
      if (isConnected) {
        sendPresence(null, taskId);
      }
    }
    
    return () => {
      // Clear presence on modal close
      if (isOpen && isConnected) {
        sendPresence(null, null);
      }
    };
  }, [taskId, isOpen]);

  const loadTaskDetails = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const response = await api.get(`tasks/${taskId}/`);
      setTask(response.data);
      setDescription(response.data.description || '');
      setTitle(response.data.title || '');
      setComments(response.data.comments || []);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error("Load task details error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const handleSaveDescription = async () => {
    try {
      const response = await api.patch(`tasks/${task.id}/`, { description });
      setTask(response.data);
      updateTaskInBoard(response.data);
      setIsEditingDesc(false);
      // Reload history to show change log
      loadTaskDetails();
    } catch (err) {
      console.error("Save description error:", err);
    }
  };

  const handleSaveTitle = async () => {
    try {
      const response = await api.patch(`tasks/${task.id}/`, { title });
      setTask(response.data);
      updateTaskInBoard(response.data);
      setIsEditingTitle(false);
      loadTaskDetails();
    } catch (err) {
      console.error("Save title error:", err);
    }
  };

  const handleFieldChange = async (field: string, value: any) => {
    try {
      const response = await api.patch(`tasks/${task.id}/`, { [field]: value });
      setTask(response.data);
      updateTaskInBoard(response.data);
      loadTaskDetails();
    } catch (err) {
      console.error(`Save field ${field} error:`, err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await api.post('comments/', {
        task: task.id,
        content: commentText
      });
      setComments([...comments, response.data]);
      setCommentText('');
    } catch (err) {
      console.error("Add comment failed:", err);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {isLoading && !task ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading task details...</div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', textAlign: 'left' }}>
          
          {/* Left Column: Title, Description, Comments */}
          <div style={{ flex: '2', minWidth: '320px' }}>
            
            {/* Header: Key & Title */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ 
                fontFamily: 'var(--mono)', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: '4px'
              }}>
                {task.key}
              </span>
              
              {isEditingTitle ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    style={{ margin: 0 }}
                  />
                  <Button variant="primary" onClick={handleSaveTitle} style={{ padding: '10px' }}>
                    <Check size={16} />
                  </Button>
                </div>
              ) : (
                <h2 
                  onClick={() => setIsEditingTitle(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="editable-title"
                >
                  {task.title}
                  <Edit2 size={14} color="var(--text-muted)" />
                </h2>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Description</h3>
                {!isEditingDesc && (
                  <button 
                    onClick={() => setIsEditingDesc(true)} 
                    className="btn-text" 
                    style={{ padding: '2px 6px', fontSize: '12px' }}
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditingDesc ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a detailed description for this task..."
                    style={{ 
                      width: '100%', 
                      backgroundColor: 'var(--bg-surface)', 
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveDescription}>Save</Button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  padding: '12px 16px', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  minHeight: '40px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  {task.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided.</span>}
                </div>
              )}
            </div>

            {/* Comments list and input */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} />
                Comments ({comments.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={{ display: 'flex', gap: '10px' }}>
                    <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '10px', flexShrink: 0 }}>
                      {comment.user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-sm)',
                      flex: '1',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{comment.user.first_name ? `${comment.user.first_name} ${comment.user.last_name}` : comment.user.username}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTimeAgo(comment.created_at)}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                <Input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{ margin: 0 }}
                />
                <Button type="submit" variant="primary">Send</Button>
              </form>
            </div>

            {/* Audit History */}
            <div>
              <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} />
                History & Activity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {history.map((log) => {
                  let text = '';
                  if (log.field_changed === 'created') {
                    text = 'created the task';
                  } else if (log.field_changed === 'column') {
                    text = `moved task from ${log.old_value} to ${log.new_value}`;
                  } else if (log.field_changed === 'assignee') {
                    text = `assigned task from ${log.old_value} to ${log.new_value}`;
                  } else if (log.field_changed === 'story_points') {
                    text = `changed story points from ${log.old_value} to ${log.new_value}`;
                  } else {
                    text = `updated ${log.field_changed} from ${log.old_value} to ${log.new_value}`;
                  }

                  return (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>{log.user ? log.user.username : 'System'}</strong> {text}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(log.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
          
          {/* Right Column: Properties Sidebar */}
          <div style={{ flex: '1', minWidth: '200px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '24px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Properties</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Task Type */}
              <div className="form-group">
                <label>Type</label>
                <select
                  value={task.task_type}
                  onChange={(e) => handleFieldChange('task_type', e.target.value)}
                >
                  <option value="TASK">Task</option>
                  <option value="STORY">Story</option>
                  <option value="BUG">Bug</option>
                  <option value="SUBTASK">Subtask</option>
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              {/* Story Points */}
              <div className="form-group">
                <label>Story Points</label>
                <input
                  type="number"
                  value={task.story_points ?? ''}
                  onChange={(e) => handleFieldChange('story_points', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="None"
                />
              </div>

              {/* Assignee */}
              <div className="form-group">
                <label>Assignee</label>
                <select
                  value={task.assignee?.id ?? ''}
                  onChange={(e) => handleFieldChange('assignee_id', e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {activeProject?.members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.first_name ? `${m.user.first_name} ${m.user.last_name}` : m.user.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reporter */}
              <div className="form-group">
                <label>Reporter</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px' }}>
                  <div className="avatar" style={{ width: '22px', height: '22px', fontSize: '9px' }}>
                    {task.reporter.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px' }}>
                    {task.reporter.first_name ? `${task.reporter.first_name} ${task.reporter.last_name}` : task.reporter.username}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <p style={{ marginBottom: '4px' }}>Created: {new Date(task.created_at).toLocaleString()}</p>
                <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
              </div>

            </div>
          </div>

        </div>
      )}
    </Modal>
  );
};
export default TaskDetailsModal;
