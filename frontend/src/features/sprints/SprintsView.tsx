import React, { useEffect, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import api from '../../services/api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Calendar, Target, Award, Download } from 'lucide-react';

interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  start_date: string | null;
  end_date: string | null;
}

export const SprintsView: React.FC = () => {
  const { activeProject } = useBoardStore();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [velocityData, setVelocityData] = useState<any[]>([]);

  useEffect(() => {
    if (activeProject) {
      loadSprintsData();
    }
  }, [activeProject?.id]);

  const loadSprintsData = async () => {
    if (!activeProject) return;
    try {
      const response = await api.get(`sprints/?project=${activeProject.id}`);
      const list = response.data;
      
      const active = list.find((s: Sprint) => s.status === 'ACTIVE') || null;
      setActiveSprint(active);

      if (active) {
        generateBurnDownData(active.id);
      }
      
      generateVelocityData();
    } catch (err) {
      console.error("Load sprints details failed:", err);
    }
  };

  const generateBurnDownData = async (sprintId: string) => {
    try {
      const response = await api.get(`sprints/${sprintId}/burndown/`);
      setChartData(response.data);
    } catch (err) {
      console.error("Load burndown failed:", err);
    }
  };

  const generateVelocityData = async () => {
    try {
      const response = await api.get(`sprints/velocity/?project=${activeProject!.id}`);
      setVelocityData(response.data);
    } catch (err) {
      console.error("Load velocity failed:", err);
    }
  };

  const handleExportCSV = async () => {
    if (!activeSprint) return;
    try {
      const response = await api.get(`tasks/?sprint=${activeSprint.id}`);
      const tasks = response.data;
      
      // Convert to CSV
      const headers = ['Key', 'Title', 'Type', 'Priority', 'Story Points', 'Status', 'Assignee', 'Created At'];
      const rows = tasks.map((t: any) => [
        t.key,
        `"${t.title.replace(/"/g, '""')}"`,
        t.task_type,
        t.priority,
        t.story_points ?? 'None',
        t.column_name || t.column?.name || 'Unknown',
        t.assignee ? (t.assignee.first_name ? `${t.assignee.first_name} ${t.assignee.last_name}` : t.assignee.username) : 'Unassigned',
        new Date(t.created_at).toLocaleDateString()
      ]);
      
      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      
      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sprint_Report_${activeSprint.name.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export CSV failed:", err);
      alert("Failed to export sprint data to CSV.");
    }
  };

  if (!activeProject) return null;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>
      
      {/* Sprints Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={18} color="var(--primary)" />
            Sprint Metrics & Active Goal
          </h3>
          {activeSprint && (
            <button 
              onClick={handleExportCSV}
              className="btn-text"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px', background: 'var(--border-subtle)', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              <Download size={14} />
              Export CSV Report
            </button>
          )}
        </div>
        
        {activeSprint ? (
          <div>
            <h4 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
              {activeSprint.name}
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <strong>Goal:</strong> {activeSprint.goal}
            </p>
            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                Start: {activeSprint.start_date ? new Date(activeSprint.start_date).toLocaleDateString() : 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                End: {activeSprint.end_date ? new Date(activeSprint.end_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No active sprint found. Sprints can be started from the backlog.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Burn-down Chart Card */}
        {activeSprint && (
          <div className="card" style={{ flex: '2', minWidth: '320px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--secondary)" />
              Sprint Burn-down Chart (Remaining Story Points)
            </h3>
            
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-surface-elevated)', 
                      borderColor: 'var(--border-medium)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Ideal" 
                    stroke="var(--text-muted)" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Actual" 
                    stroke="var(--secondary)" 
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'var(--secondary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Velocity Chart Card */}
        <div className="card" style={{ flex: '1', minWidth: '280px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="var(--warning)" />
            Team Velocity (Sprint Comparison)
          </h3>
          
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={velocityData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-surface-elevated)', 
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Planned" 
                  stroke="var(--primary)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Completed" 
                  stroke="var(--secondary)" 
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
export default SprintsView;
