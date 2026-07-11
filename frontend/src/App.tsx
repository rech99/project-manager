import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useBoardStore } from './store/boardStore';
import type { Task } from './store/boardStore';
import AuthViews from './features/auth/AuthViews';
import ProjectSidebar from './features/projects/ProjectSidebar';
import BoardView from './features/boards/BoardView';
import TaskDetailsModal from './features/tasks/TaskDetailsModal';
import SprintsView from './features/sprints/SprintsView';

function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const { activeProject } = useBoardStore();
  
  // Selection and navigation state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Initialize Auth from localStorage on startup
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen to open_task_details events from notification clicks
  useEffect(() => {
    const handleOpenTask = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.taskId) {
        setSelectedTaskId(customEvent.detail.taskId);
        setIsTaskDetailsOpen(true);
      }
    };
    window.addEventListener('open_task_details', handleOpenTask);
    return () => window.removeEventListener('open_task_details', handleOpenTask);
  }, []);

  // Reset charts view when active project changes
  useEffect(() => {
    setShowCharts(false);
  }, [activeProject?.id]);

  const handleSelectTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsTaskDetailsOpen(true);
  };

  const handleCloseTaskDetails = () => {
    setIsTaskDetailsOpen(false);
    setSelectedTaskId(null);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--primary)', display: 'block', margin: '0 auto 16px auto' }}></div>
          <p style={{ fontSize: '15px' }}>Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthViews />;
  }

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <ProjectSidebar />

      {/* Main Panel */}
      <div className="main-content">
        {activeProject ? (
          showCharts ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ padding: '24px 24px 0 24px' }}>
                <button 
                  onClick={() => setShowCharts(false)} 
                  className="btn-text"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: '6px 12px', background: 'var(--border-subtle)', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  &larr; Back to Kanban Board
                </button>
              </div>
              <SprintsView />
            </div>
          ) : (
            <BoardView 
              onSelectTask={handleSelectTask}
              onToggleCharts={() => setShowCharts(!showCharts)}
              showCharts={showCharts}
            />
          )
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--text-secondary)',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h2 style={{ fontWeight: '500' }}>No Project Selected</h2>
            <p>Select a project from the left sidebar to start managing your sprint board.</p>
          </div>
        )}
      </div>

      {/* Shared Task Details Modal */}
      <TaskDetailsModal 
        isOpen={isTaskDetailsOpen} 
        onClose={handleCloseTaskDetails} 
        taskId={selectedTaskId}
      />
    </div>
  );
}

export default App;
