import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  CreditCard, 
  X, 
  ExternalLink, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SettleUpView({
  group,
  currentUser,
  currency,
  onRecordSettlement
}) {
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('Settled via BillSplitter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!group) return null;

  const membersMap = {};
  group.members?.forEach(m => {
    membersMap[m.id] = m;
  });

  const balances = group.balances || {};
  const simplifiedDebts = group.simplified_debts || [];
  const settlements = group.settlements || [];

  const handleOpenSettle = (debt) => {
    setSelectedSettlement(debt);
    setPaymentMethod('UPI');
    setNotes(`Settlement from ${debt.from_name} to ${debt.to_name}`);
  };

  const handleConfirmSettle = async (e) => {
    e.preventDefault();
    if (!selectedSettlement) return;

    setIsSubmitting(true);
    try {
      await onRecordSettlement({
        from_id: selectedSettlement.from_id,
        to_id: selectedSettlement.to_id,
        amount: selectedSettlement.amount,
        payment_method: paymentMethod,
        notes: notes
      });

      // Trigger Confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      setSelectedSettlement(null);
    } catch (err) {
      alert('Failed to record settlement: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. Member Balances Summary */}
      <div>
        <div className="section-header">
          <div>
            <h2>Individual Net Balances</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Green indicates amount owed to member; red indicates amount to pay
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {group.members?.map(m => {
            const bal = balances[m.id] || 0;
            const isCurrent = currentUser?.id === m.id;
            return (
              <div 
                key={m.id} 
                className="glass-card" 
                style={{
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  borderLeft: `4px solid ${bal > 0 ? 'var(--emerald)' : bal < 0 ? 'var(--rose)' : 'var(--border-medium)'}`
                }}
              >
                <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                  {m.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {m.name} {isCurrent && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(You)</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    UPI: {m.upi_id || 'Not set'}
                  </div>
                  <div style={{
                    marginTop: '6px',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-display)',
                    color: bal > 0 ? 'var(--emerald)' : bal < 0 ? 'var(--rose)' : 'var(--text-dim)'
                  }}>
                    {bal > 0 ? `+${currency}${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                     bal < 0 ? `-${currency}${Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                     'Settled'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Min-Cash-Flow Smart Debt Simplification */}
      <div>
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="var(--accent-secondary)" />
            <div>
              <h2>Smart Min-Cash-Flow Settlements</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Greedy algorithm reduces complex debts into the minimum number of direct payments
              </p>
            </div>
          </div>
        </div>

        {simplifiedDebts.length === 0 ? (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
            <CheckCircle2 size={44} style={{ color: 'var(--emerald)', marginBottom: '8px' }} />
            <h3 style={{ fontSize: '1.15rem' }}>All Group Debts Are Settled!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No outstanding transactions required. Everyone's balance is at zero.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {simplifiedDebts.map((debt, idx) => {
              const isDebtorCurrent = currentUser?.id === debt.from_id;
              const isCreditorCurrent = currentUser?.id === debt.to_id;

              return (
                <div key={idx} className="glass-card" style={{
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="user-avatar" style={{ width: '28px', height: '28px' }}>
                        {membersMap[debt.from_id]?.avatar || 'U'}
                      </span>
                      <strong style={{ color: isDebtorCurrent ? 'var(--rose)' : 'inherit' }}>
                        {isDebtorCurrent ? 'You' : debt.from_name}
                      </strong>
                    </div>

                    <ArrowRight size={18} color="var(--accent-primary)" />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="user-avatar" style={{ width: '28px', height: '28px' }}>
                        {membersMap[debt.to_id]?.avatar || 'U'}
                      </span>
                      <strong style={{ color: isCreditorCurrent ? 'var(--emerald)' : 'inherit' }}>
                        {isCreditorCurrent ? 'You' : debt.to_name}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                        ({debt.to_upi})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
                        {currency}{Number(debt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <button 
                      className="btn-success" 
                      onClick={() => handleOpenSettle(debt)}
                    >
                      <CreditCard size={16} /> Settle Up
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Settlement History Log */}
      <div>
        <div className="section-header">
          <h2>Settlement & Payment Log</h2>
        </div>

        {settlements.length === 0 ? (
          <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No past settlements recorded yet.
          </div>
        ) : (
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '14px 18px' }}>Date</th>
                  <th style={{ padding: '14px 18px' }}>Payer</th>
                  <th style={{ padding: '14px 18px' }}>Receiver</th>
                  <th style={{ padding: '14px 18px' }}>Amount</th>
                  <th style={{ padding: '14px 18px' }}>Method</th>
                  <th style={{ padding: '14px 18px' }}>Transaction Ref</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map(s => {
                  const fromUser = membersMap[s.from_id] || { name: 'Member', avatar: 'M' };
                  const toUser = membersMap[s.to_id] || { name: 'Member', avatar: 'M' };

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                        {s.settled_at?.slice(0, 10)}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600 }}>{fromUser.name}</td>
                      <td style={{ padding: '14px 18px', fontWeight: 600 }}>{toUser.name}</td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--emerald)' }}>
                        {currency}{Number(s.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-purple">{s.payment_method}</span>
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {s.transaction_ref}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={12} /> Confirmed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settle Up Action Modal */}
      {selectedSettlement && (
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
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Record Settlement</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confirm payment between group members</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedSettlement(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Payment Summary Box */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount to Transfer</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--emerald)', margin: '6px 0' }}>
                  {currency}{Number(selectedSettlement.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem' }}>
                  <span>{selectedSettlement.from_name}</span>
                  <ArrowRight size={16} color="var(--accent-primary)" />
                  <strong>{selectedSettlement.to_name}</strong>
                </div>

                <div style={{ marginTop: '14px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-dim)' }}>Recipient UPI ID:</div>
                  <strong style={{ color: 'var(--text-main)', wordBreak: 'break-all' }}>{selectedSettlement.to_upi}</strong>
                </div>

                {/* Direct UPI Trigger Link */}
                {selectedSettlement.upi_link && (
                  <div style={{ marginTop: '12px' }}>
                    <a 
                      href={selectedSettlement.upi_link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-secondary"
                      style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
                    >
                      <ExternalLink size={14} /> Open in UPI App (GPay/PhonePe/Paytm)
                    </a>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Payment Mode Used</label>
                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Net Banking">Net Banking / IMPS</option>
                  <option value="Cash">Cash Handover</option>
                  <option value="Debit/Credit Card">Card Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Settlement Note / Reference</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedSettlement(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-success" disabled={isSubmitting}>
                  <CheckCircle2 size={16} /> {isSubmitting ? 'Recording...' : 'Confirm & Mark Settled'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
