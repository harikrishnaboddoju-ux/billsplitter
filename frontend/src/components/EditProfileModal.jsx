import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, QrCode, Check, Sparkles } from 'lucide-react';
import { updateUserProfile } from '../utils/api';

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  onProfileUpdated
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setUpiId(user.upi_id || '');
      setAvatar(user.avatar || '');
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        upi_id: upiId.trim(),
        avatar: avatar.trim()
      });
      onProfileUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}>
              {avatar || (name ? name.slice(0, 2).toUpperCase() : 'U')}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Edit Member Profile</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Update contact, UPI ID, and persona details
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '38px' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chiranjeeva, Hari Krishna"
                required
              />
              <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">UPI ID (For Instant Settle Up) *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '38px' }}
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. username@okhdfc, 9876543210@paytm"
                required
              />
              <QrCode size={16} style={{ position: 'absolute', left: '12px', color: 'var(--accent-secondary)' }} />
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Other group members can pay you directly via GPay, PhonePe, or Paytm using this UPI ID.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">College / Personal Email</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@iare.ac.in"
                />
                <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Phone Number</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
                <Phone size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Initials / Avatar Badge</label>
            <input
              type="text"
              maxLength={3}
              className="form-input"
              style={{ width: '100px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.05em' }}
              value={avatar}
              onChange={(e) => setAvatar(e.target.value.toUpperCase())}
              placeholder="e.g. C"
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Check size={16} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
