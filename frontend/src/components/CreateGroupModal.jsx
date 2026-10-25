import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function CreateGroupModal({
  isOpen,
  onClose,
  users,
  currentUser,
  onCreateGroup
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [monthlyBudget, setMonthlyBudget] = useState('8000');
  
  const hariUser = users?.find(u => u.name?.toLowerCase().includes('hari krishna')) || users?.[0];
  const creatorId = currentUser?.id || hariUser?.id || 'u_1';

  const [selectedMembers, setSelectedMembers] = useState(
    () => new Set([creatorId].filter(Boolean))
  );

  if (!isOpen) return null;

  const handleToggleMember = (userId) => {
    const updated = new Set(selectedMembers);
    if (updated.has(userId)) {
      if (updated.size > 1) updated.delete(userId);
    } else {
      updated.add(userId);
    }
    setSelectedMembers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }

    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      currency,
      monthly_budget: parseFloat(monthlyBudget) || 8000,
      created_by: creatorId,
      member_ids: Array.from(selectedMembers)
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Create New Group</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Set up shared expenses for flatmates, trips, or projects</p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Group Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Flat 301 Roommates, Manali Trip 2026..." 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Description (Optional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Shared rent, utilities, food, and road trip costs" 
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Currency</label>
              <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="₹">₹ INR (Rupee)</option>
                <option value="$">$ USD (Dollar)</option>
                <option value="€">€ EUR (Euro)</option>
                <option value="£">£ GBP (Pound)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Monthly Target Budget</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="40000" 
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
              Select Initial Group Members
            </label>
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              {users.map(u => {
                const isSelected = selectedMembers.has(u.id);
                return (
                  <label 
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(9, 132, 227, 0.12)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleMember(u.id)}
                        style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                      />
                      <span className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>{u.avatar}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{u.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.upi_id || u.email}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} /> Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
