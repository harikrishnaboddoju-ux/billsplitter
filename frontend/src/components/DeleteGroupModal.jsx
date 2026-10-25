import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { deleteGroup } from '../utils/api';

export default function DeleteGroupModal({
  isOpen,
  onClose,
  group,
  onGroupDeleted
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !group) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteGroup(group.id);
      onGroupDeleted(group.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete group');
      setLoading(false);
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--rose-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--rose)'
            }}>
              <Trash2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Delete Group</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Irreversible action</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              background: 'var(--rose-bg)',
              color: 'var(--rose)',
              border: '1px solid rgba(255, 118, 117, 0.4)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.95rem', margin: '0 0 6px', color: 'var(--text-main)' }}>
              Are you sure you want to delete <strong>"{group.name}"</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
              This will permanently delete all logged bills, settlements, and member links in this group. You can create a fresh group on the spot for faculty review anytime.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
              disabled={loading}
              style={{ background: 'var(--rose)', color: '#ffffff' }}
            >
              <Trash2 size={16} /> {loading ? 'Deleting...' : 'Delete Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
