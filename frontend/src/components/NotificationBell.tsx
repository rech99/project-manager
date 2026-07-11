import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Circle } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = (id: string, taskId: string) => {
    // 1. Mark as read
    markAsRead(id);
    // 2. Dispatch custom event to open task details modal in App.tsx
    window.dispatchEvent(new CustomEvent('open_task_details', { detail: { taskId } }));
    // 3. Close dropdown
    setIsOpen(false);
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="btn-text"
        style={{
          padding: '8px',
          borderRadius: '50%',
          color: isOpen ? 'var(--primary)' : 'var(--text-secondary)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isOpen ? 'var(--border-subtle)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)'
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: 'var(--danger)',
            color: 'white',
            borderRadius: '50%',
            width: '15px',
            height: '15px',
            fontSize: '9px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-surface)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '0',
          width: '320px',
          backgroundColor: 'hsla(var(--hue), 12%, 14%, 0.96)',
          backdropFilter: 'var(--backdrop-blur)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInUp 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'hsla(var(--hue), 12%, 11%, 0.5)'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Check size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div style={{
            maxHeight: '280px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}>
                <Bell size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '13px' }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id, n.task_id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'background var(--transition-fast)',
                    background: n.is_read ? 'transparent' : 'hsla(235, 78%, 61%, 0.04)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : 'hsla(235, 78%, 61%, 0.04)'}
                >
                  {/* Unread indicator dot */}
                  {!n.is_read && (
                    <div style={{
                      position: 'absolute',
                      left: '6px',
                      top: '18px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)'
                    }} />
                  )}

                  {/* Icon of verb type */}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: n.verb === 'commented_on_task' ? 'var(--secondary-glow)' : 'var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: n.verb === 'commented_on_task' ? 'var(--secondary)' : 'var(--primary)'
                  }}>
                    <Circle size={10} fill="currentColor" />
                  </div>

                  {/* Body text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '12px',
                      lineHeight: '1.4',
                      color: 'var(--text-primary)',
                      margin: 0
                    }}>
                      <span style={{ fontWeight: '600' }}>{n.actor_name}</span>{' '}
                      {n.verb === 'commented_on_task' ? 'commented on' : 'assigned you to'}{' '}
                      <span style={{ color: 'var(--primary)', fontWeight: '500' }}>{n.task_key}</span>: {n.task_title}
                    </p>
                    <span style={{
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                      display: 'block'
                    }}>
                      {formatTimestamp(n.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
