import React from 'react';
import { Plus, UserPlus, Sparkles, CreditCard, Trash2 } from 'lucide-react';

export default function GroupBanner({
  group,
  onOpenAddBill,
  onOpenSettleModal,
  onOpenAddMember,
  onOpenSmartChat,
  onOpenDeleteGroup
}) {
  if (!group) return null;

  return (
    <div className="group-banner">
      <div className="group-info-wrap">
        <div className="group-avatar-box">
          {group.name ? group.name.charAt(0).toUpperCase() : 'G'}
        </div>
        <div className="group-text">
          <h1>
            {group.name}
            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
              {group.members?.length || 0} Members
            </span>
          </h1>
          <p>{group.description || 'Shared B.Tech student expenses, canteen splits & automated balance tracking.'}</p>
        </div>
      </div>

      {/* Quick Actions & Member Avatars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Member Avatars Stack */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {group.members?.slice(0, 5).map((m, idx) => (
            <div 
              key={m.id}
              title={`${m.name} (${m.role})`}
              className="user-avatar"
              style={{
                marginLeft: idx > 0 ? '-8px' : '0',
                border: '2px solid var(--bg-secondary)',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 10 - idx
              }}
            >
              {m.avatar}
            </div>
          ))}
          {group.members?.length > 5 && (
            <div 
              className="user-avatar"
              style={{
                marginLeft: '-8px',
                background: 'var(--bg-card-solid)',
                border: '2px solid var(--bg-secondary)',
                color: 'var(--text-muted)',
                fontSize: '0.7rem'
              }}
            >
              +{group.members.length - 5}
            </div>
          )}
          <button 
            className="btn-icon" 
            style={{ width: '28px', height: '28px', marginLeft: '6px', borderRadius: '50%' }}
            onClick={onOpenAddMember}
            title="Invite / Add Member"
          >
            <UserPlus size={14} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="group-controls">
          <button className="btn-secondary" onClick={onOpenSettleModal} style={{ gap: '6px' }}>
            <CreditCard size={15} color="var(--accent-secondary)" />
            <span>Settle Up</span>
          </button>

          <button className="btn-secondary" onClick={onOpenSmartChat} style={{ gap: '6px' }}>
            <Sparkles size={15} color="var(--accent-primary)" />
            <span>AI Bill Scan</span>
          </button>

          <button className="btn-primary" onClick={onOpenAddBill}>
            <Plus size={16} /> Add Bill
          </button>

          {/* Delete Group Button */}
          <button 
            className="btn-icon" 
            onClick={onOpenDeleteGroup} 
            title={`Delete "${group.name}"`}
            style={{ 
              color: 'var(--rose)',
              background: 'rgba(255, 118, 117, 0.1)',
              borderColor: 'rgba(255, 118, 117, 0.25)'
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
