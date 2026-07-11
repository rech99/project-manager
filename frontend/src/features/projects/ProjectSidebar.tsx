import React, { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useAuthStore } from '../../store/authStore';
import { LogOut, Plus, Layers } from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import api from '../../services/api';
import NotificationBell from '../../components/NotificationBell';

export const ProjectSidebar: React.FC = () => {
  const { projects, activeProject, fetchProjects, selectProject, isLoading } = useBoardStore();
  const { user, logout } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<'KANBAN' | 'SCRUM'>('KANBAN');
  const [orgId, setOrgId] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
    // Load organizations for creation dropdown
    api.get('organizations/')
      .then(res => {
        setOrgs(res.data);
        if (res.data.length > 0) {
          setOrgId(res.data[0].id);
        }
      })
      .catch(err => console.error("Organizations load error:", err));
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !orgId) return;

    try {
      const response = await api.post('projects/', {
        name: projectName,
        project_type: projectType,
        organization: orgId
      });
      
      setProjectName('');
      setIsModalOpen(false);
      
      // Reload and select newly created project
      await fetchProjects();
      await selectProject(response.data.id);
    } catch (err) {
      console.error("Create project failed:", err);
    }
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div style={{
      width: '280px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px var(--primary-glow)'
        }}>
          <Layers size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.03em' }}>PlanFlow</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Workspace</span>
        </div>
      </div>

      {/* Projects List Section */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '0 8px'
        }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Projects ({projects.length})
          </span>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-text" 
            style={{ padding: '4px', borderRadius: '4px' }}
          >
            <Plus size={16} />
          </button>
        </div>

        {isLoading && projects.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px' }}>
            Loading projects...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => selectProject(proj.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--border-subtle)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <div style={{
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                      color: isActive ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {proj.key}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{
                        fontSize: '14px',
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {proj.name}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {proj.project_type}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* User Profile Block */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'hsl(var(--hue), 14%, 8%)'
      }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
            <div className="avatar" style={{ flexShrink: 0 }}>
              {getUserInitials()}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
              </p>
              <span style={{ 
                fontSize: '11px', 
                color: 'var(--text-muted)',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.email}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <NotificationBell />
              <button 
                onClick={logout}
                className="btn-text" 
                style={{ padding: '8px', borderRadius: '50%', color: 'var(--danger)' }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject}>
          <Input 
            label="Project Name" 
            type="text" 
            id="proj-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Apollo Telescope Controller"
            required
          />

          <div className="form-group">
            <label htmlFor="proj-type">Project Methodology</label>
            <select 
              id="proj-type"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as any)}
            >
              <option value="KANBAN">Kanban (Continuous Flow)</option>
              <option value="SCRUM">Scrum (Sprints & Backlogs)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="proj-org">Organization</label>
            <select 
              id="proj-org"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default ProjectSidebar;
