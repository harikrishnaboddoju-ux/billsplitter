import React from 'react';
import { Crown, Shield, User, UserPlus, Mail, Phone, QrCode, Edit2 } from 'lucide-react';

export default function GroupMembersView({
  group,
  currentUser,
  onOpenAddMember,
  onOpenEditProfile,
  onUpdateMemberRole
}) {
  if (!group) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="section-header">
        <div>
          <h2>Group Members & Student Profiles</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage student roles, admin permissions, and UPI settlement profiles
          </p>
        </div>

        <button className="btn-primary" onClick={onOpenAddMember}>
          <UserPlus size={16} /> Invite / Add Member
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        {group.members?.map(m => {
          const isAdmin = m.role === 'Admin';
          const isCurrentUser = currentUser?.id === m.id;

          return (
            <div key={m.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="user-avatar" style={{ width: '42px', height: '42px', fontSize: '1.05rem' }}>
                    {m.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {m.name} 
                      {isAdmin && <Crown size={14} color="#00CEC9" title="Admin" />}
                      {isCurrentUser && <span style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Joined {m.joined_at?.slice(0, 10)}
                    </div>
                  </div>
                </div>

                <span 
                  className={`badge ${isAdmin ? 'badge-purple' : 'badge-emerald'}`}
                  style={isAdmin ? { background: 'rgba(9, 132, 227, 0.2)', border: '1px solid var(--accent-primary)', color: 'var(--accent-secondary)' } : {}}
                >
                  {isAdmin ? <Crown size={12} /> : <User size={12} />}
                  <span>{m.role}</span>
                </span>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                  <QrCode size={14} color="var(--accent-secondary)" />
                  <span>UPI:</span>
                  <strong style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>{m.upi_id || 'Not set'}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                  <Mail size={14} />
                  <span>Email:</span>
                  <span style={{ color: 'var(--text-main)' }}>{m.email || 'N/A'}</span>
                </div>

                {m.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <Phone size={14} />
                    <span>Phone:</span>
                    <span style={{ color: 'var(--text-main)' }}>{m.phone}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Make Admin & Edit Profile */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                {onUpdateMemberRole && (
                  !isAdmin ? (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px', borderColor: 'rgba(0, 206, 201, 0.3)' }}
                      onClick={() => onUpdateMemberRole(m.id, 'Admin')}
                      title="Promote member to Group Admin"
                    >
                      <Crown size={13} color="var(--accent-secondary)" /> Make Admin
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Shield size={12} /> Group Admin
                    </span>
                  )
                )}

                <button 
                  className="btn-secondary" 
                  style={{ padding: '6px 14px', fontSize: '0.8rem', gap: '6px', marginLeft: 'auto' }}
                  onClick={() => onOpenEditProfile(m)}
                >
                  <Edit2 size={13} color="var(--accent-primary)" /> Edit Profile
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
