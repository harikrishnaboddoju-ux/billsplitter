import React, { useState, useRef, useEffect } from 'react';
import { 
  Receipt, 
  Users, 
  Plus, 
  Bell, 
  Sun, 
  Moon, 
  Download, 
  ChevronDown, 
  Check,
  Edit2
} from 'lucide-react';
import { markNotificationsRead } from '../utils/api';

export default function Navbar({
  groups,
  currentGroup,
  onSelectGroup,
  users,
  currentUser,
  onSelectUser,
  theme,
  onToggleTheme,
  onOpenCreateGroup,
  notifications,
  onRefreshNotifications,
  onOpenEditProfile
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const groupRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifPopover(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (groupRef.current && !groupRef.current.contains(event.target)) {
        setShowGroupDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async () => {
    if (currentUser?.id) {
      try {
        await markNotificationsRead(currentUser.id);
        onRefreshNotifications();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExportCSV = () => {
    if (currentGroup?.id) {
      window.open(`/api/groups/${currentGroup.id}/export`, '_blank');
    }
  };

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-logo">
          <Receipt size={24} />
        </div>
        <div>
          <div className="brand-title">BillSplitter AI</div>
          <div className="brand-subtitle">Smart Splits &bull; ML Forecasting</div>
        </div>
      </div>

      {/* Middle Group Selector */}
      <div style={{ position: 'relative' }} ref={groupRef}>
        <button 
          className="btn-secondary" 
          onClick={() => setShowGroupDropdown(!showGroupDropdown)}
          style={{ padding: '8px 14px', borderRadius: '999px', fontSize: '0.875rem' }}
        >
          <Users size={16} className="text-muted" />
          <span style={{ fontWeight: 700 }}>{currentGroup ? currentGroup.name : 'Select Group'}</span>
          <ChevronDown size={14} />
        </button>

        {showGroupDropdown && (
          <div className="glass-card" style={{
            position: 'absolute',
            top: '46px',
            left: 0,
            width: '280px',
            zIndex: 110,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Your Active Groups
            </div>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => {
                  onSelectGroup(g.id);
                  setShowGroupDropdown(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: currentGroup?.id === g.id ? 'var(--accent-gradient)' : 'transparent',
                  color: currentGroup?.id === g.id ? '#fff' : 'var(--text-main)',
                  textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{g.members?.length || 0} members &bull; {g.currency}{Number(g.monthly_budget).toLocaleString()} budget</div>
                </div>
                {currentGroup?.id === g.id && <Check size={16} />}
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '6px 0' }} />

            <button
              className="btn-secondary"
              onClick={() => {
                setShowGroupDropdown(false);
                onOpenCreateGroup();
              }}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
            >
              <Plus size={15} /> Create New Group
            </button>
          </div>
        )}
      </div>

      {/* Header Right Actions */}
      <div className="header-actions">
        {/* Export Data Button */}
        <button 
          className="btn-icon" 
          title="Export Group Expenses as CSV"
          onClick={handleExportCSV}
        >
          <Download size={18} />
        </button>

        {/* Theme Toggle Button */}
        <button 
          className="btn-icon" 
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            className="btn-icon" 
            style={{ position: 'relative' }}
            onClick={() => {
              setShowNotifPopover(!showNotifPopover);
              if (!showNotifPopover && unreadCount > 0) {
                handleMarkRead();
              }
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                background: 'var(--rose)',
                borderRadius: '50%',
                boxShadow: '0 0 8px var(--rose)'
              }} />
            )}
          </button>

          {showNotifPopover && (
            <div className="glass-card" style={{
              position: 'absolute',
              top: '46px',
              right: 0,
              width: '340px',
              zIndex: 120,
              padding: '16px',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkRead}
                    style={{ background: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: n.is_read ? 'var(--bg-glass)' : 'rgba(9, 132, 227, 0.12)',
                        borderLeft: `3px solid ${n.type === 'alert' ? 'var(--rose)' : n.type === 'settle' ? 'var(--emerald)' : 'var(--accent-primary)'}`
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{n.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Switcher Pill */}
        <div style={{ position: 'relative' }} ref={userRef}>
          <div 
            className="user-selector-pill"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="user-avatar">{currentUser?.avatar || 'U'}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, lineHeight: 1.1 }}>{currentUser?.name || 'User'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Viewing as</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />
          </div>

          {showUserDropdown && (
            <div className="glass-card" style={{
              position: 'absolute',
              top: '48px',
              right: 0,
              width: '240px',
              zIndex: 110,
              padding: '8px'
            }}>
              <div style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Switch Member Persona
              </div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    setShowUserDropdown(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: currentUser?.id === u.id ? 'rgba(9, 132, 227, 0.18)' : 'transparent',
                    color: 'var(--text-main)',
                    textAlign: 'left'
                  }}
                >
                  <div className="user-avatar" style={{ width: '26px', height: '26px', fontSize: '0.7rem' }}>{u.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{u.upi_id || u.email}</div>
                  </div>
                  {currentUser?.id === u.id && <Check size={14} color="var(--accent-primary)" />}
                </button>
              ))}
              
              {/* Quick Profile Edit Action */}
              {currentUser && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      if (onOpenEditProfile) onOpenEditProfile(currentUser);
                    }}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      padding: '6px 10px',
                      gap: '6px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <Edit2 size={13} color="var(--accent-primary)" /> Edit My Profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
