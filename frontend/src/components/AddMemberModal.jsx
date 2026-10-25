import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check } from 'lucide-react';

export default function AddMemberModal({
  isOpen,
  onClose,
  group,
  users,
  onAddExistingMember,
  onCreateAndAddUser
}) {
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'

  const existingMemberIds = new Set((group?.members || []).map(m => m.id));
  const availableUsers = (users || []).filter(u => !existingMemberIds.has(u.id));

  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState('Member');

  // Sync selected user when modal opens or availableUsers change
  useEffect(() => {
    if (availableUsers.length > 0) {
      if (!selectedUserId || !availableUsers.some(u => u.id === selectedUserId)) {
        setSelectedUserId(availableUsers[0].id);
      }
    } else {
      setSelectedUserId('');
    }
  }, [isOpen, group?.id, availableUsers.length]);

  // New user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUpi, setNewUpi] = useState('');

  if (!isOpen || !group) return null;

  const handleAddExisting = (e) => {
    e.preventDefault();
    const userIdToAdd = selectedUserId || availableUsers[0]?.id;
    if (!userIdToAdd) {
      alert('Please select a user');
      return;
    }
    onAddExistingMember(userIdToAdd, role);
    onClose();
  };

  const handleCreateNew = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Please enter user name');
      return;
    }
    const cleanName = newName.trim();
    const slug = cleanName.toLowerCase().replace(/\s+/g, '');
    await onCreateAndAddUser({
      name: cleanName,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim(),
      upi_id: newUpi.trim() || `${slug}@upi`,
      role
    });
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewUpi('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Add Group Member</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Invite friends or add flatmates to "{group.name}"</p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', padding: '16px 24px 0', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{
              flex: 1,
              justifyContent: 'center',
              fontSize: '0.825rem',
              background: mode === 'existing' ? 'var(--accent-gradient)' : 'var(--bg-glass)',
              color: mode === 'existing' ? '#fff' : 'var(--text-muted)'
            }}
            onClick={() => setMode('existing')}
          >
            Select Existing User
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{
              flex: 1,
              justifyContent: 'center',
              fontSize: '0.825rem',
              background: mode === 'new' ? 'var(--accent-gradient)' : 'var(--bg-glass)',
              color: mode === 'new' ? '#fff' : 'var(--text-muted)'
            }}
            onClick={() => setMode('new')}
          >
            Create New Profile
          </button>
        </div>

        {mode === 'existing' ? (
          <form onSubmit={handleAddExisting} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {availableUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                All registered users are already members of this group!
                <br />
                Switch to "Create New Profile" to add someone new.
              </div>
            ) : (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Select User</label>
                  <select 
                    className="form-select" 
                    value={selectedUserId || availableUsers[0]?.id || ''} 
                    onChange={e => setSelectedUserId(e.target.value)}
                  >
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.upi_id || u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Role in Group</label>
                  <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="Member">Member (Add & View Bills)</option>
                    <option value="Admin">Admin (Manage Group Rules & Roles)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <UserPlus size={16} /> Add to Group
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleCreateNew} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Priyanshu Sen" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">UPI ID for Settlements</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. priyanshu@oksbi" 
                value={newUpi}
                onChange={e => setNewUpi(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number (Optional)</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="+91 98765 43210" 
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Role</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email (Optional)</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="user@example.com" 
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                <Check size={16} /> Create & Join
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
