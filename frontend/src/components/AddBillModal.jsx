import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, Paperclip, FileImage, Trash2, Users } from 'lucide-react';
import { scanReceiptPreset, uploadReceiptFile } from '../utils/api';

const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Rent',
  'Utilities',
  'Travel',
  'Entertainment',
  'Supplies',
  'Other'
];

export default function AddBillModal({
  isOpen,
  onClose,
  members,
  currency,
  currentUser,
  onAddBill,
  initialData = null
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [category, setCategory] = useState(initialData?.category || 'Food & Dining');
  const [date, setDate] = useState(() => initialData?.extracted_date || new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState(initialData?.paid_by || currentUser?.id || (members[0]?.id || ''));
  const [splitType, setSplitType] = useState(initialData?.split_type || 'equal');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState(initialData?.receipt_url || '');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Equal split included members
  const [includedMembers, setIncludedMembers] = useState(
    () => new Set(members.map(m => m.id))
  );

  // Exact / Percentage splits
  const [customSplits, setCustomSplits] = useState({});
  const [customPercents, setCustomPercents] = useState({});

  // Multi-payer amounts if paidBy === 'multiple'
  const [multiPayerAmounts, setMultiPayerAmounts] = useState({});

  // Preset OCR simulation state
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.amount) setAmount(String(initialData.amount));
      if (initialData.category) setCategory(initialData.category);
      if (initialData.paid_by) setPaidBy(initialData.paid_by);
      if (initialData.split_type) setSplitType(initialData.split_type);
      if (initialData.splits) setCustomSplits(initialData.splits);
      if (initialData.receipt_url) setReceiptUrl(initialData.receipt_url);
    }
  }, [initialData]);

  if (!isOpen) return null;

  // Handle receipt file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const res = await uploadReceiptFile(file);
      setReceiptUrl(res.url);
      setReceiptFileName(file.name);
      if (!notes) {
        setNotes(`Receipt: ${file.name}`);
      }
    } catch (err) {
      alert('Failed to upload receipt: ' + err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Handle preset OCR scan
  const handlePresetScan = async (preset) => {
    setOcrLoading(true);
    try {
      const data = await scanReceiptPreset(preset);
      setTitle(data.store || 'Receipt Expense');
      setAmount(String(data.total));
      setCategory(data.category || 'Groceries');
      setDate(data.date || new Date().toISOString().slice(0, 10));
      setNotes(`Itemized: ${data.items.map(i => `${i.name} (₹${i.price})`).join(', ')}`);
    } catch (err) {
      console.error(err);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleEqualToggle = (memberId) => {
    const updated = new Set(includedMembers);
    if (updated.has(memberId)) {
      if (updated.size > 1) updated.delete(memberId);
    } else {
      updated.add(memberId);
    }
    setIncludedMembers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const billAmt = parseFloat(amount);
    if (!billAmt || billAmt <= 0) {
      alert('Please enter a valid positive bill amount');
      return;
    }
    if (!title.trim()) {
      alert('Please provide a title for the bill');
      return;
    }

    // Validate multi-payer if selected
    let finalPaidBy = paidBy;
    if (paidBy === 'multiple') {
      let sumPaid = 0;
      const cleanPayers = {};
      members.forEach(m => {
        const val = parseFloat(multiPayerAmounts[m.id] || 0);
        if (val > 0) {
          sumPaid += val;
          cleanPayers[m.id] = val;
        }
      });
      if (Math.abs(sumPaid - billAmt) > 0.5) {
        alert(`Total contributions across payers (${currency}${sumPaid.toFixed(2)}) must equal total bill amount (${currency}${billAmt.toFixed(2)})`);
        return;
      }
      finalPaidBy = cleanPayers;
    }

    let calculatedSplits = {};

    if (splitType === 'equal') {
      const included = Array.from(includedMembers);
      const perPerson = Math.round((billAmt / included.length) * 100) / 100;
      included.forEach(mid => {
        calculatedSplits[mid] = perPerson;
      });
      // Adjust penny diff
      const diff = Math.round((billAmt - Object.values(calculatedSplits).reduce((a, b) => a + b, 0)) * 100) / 100;
      if (diff !== 0 && included.length > 0) {
        calculatedSplits[included[0]] = Math.round((calculatedSplits[included[0]] + diff) * 100) / 100;
      }
    } else if (splitType === 'percentage') {
      let sumPct = 0;
      members.forEach(m => {
        const pct = parseFloat(customPercents[m.id] || 0);
        sumPct += pct;
        calculatedSplits[m.id] = Math.round(((pct / 100) * billAmt) * 100) / 100;
      });
      if (Math.abs(sumPct - 100) > 0.5) {
        alert(`Total percentages must sum to 100%. Current sum: ${sumPct}%`);
        return;
      }
    } else if (splitType === 'exact') {
      let sumExact = 0;
      members.forEach(m => {
        const val = parseFloat(customSplits[m.id] || 0);
        sumExact += val;
        calculatedSplits[m.id] = val;
      });
      if (Math.abs(sumExact - billAmt) > 0.1) {
        alert(`Exact splits must sum to ${currency}${billAmt}. Current sum: ${currency}${sumExact.toFixed(2)}`);
        return;
      }
    }

    onAddBill({
      title: title.trim(),
      amount: billAmt,
      category,
      date,
      paid_by: finalPaidBy,
      split_type: splitType,
      splits: calculatedSplits,
      receipt_url: receiptUrl,
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Add Group Bill</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Log a shared expense and customize splits</p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Quick OCR Presets Banner */}
          <div style={{
            background: 'rgba(9, 132, 227, 0.12)',
            border: '1px dashed var(--accent-primary)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>
                {ocrLoading ? 'Auto-filling...' : 'Quick Student Presets:'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handlePresetScan('canteen')}
                disabled={ocrLoading}
              >
                🍱 Canteen
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handlePresetScan('cricket')}
                disabled={ocrLoading}
              >
                🏏 Cricket Turf
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handlePresetScan('outing')}
                disabled={ocrLoading}
              >
                🍿 Outing
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => handlePresetScan('stationery')}
                disabled={ocrLoading}
              >
                🖨️ Xerox
              </button>
            </div>
          </div>

          {/* Title & Amount Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Bill Description / Title *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. D-Mart Groceries, Dinner, WiFi..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Amount ({currency}) *</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category & Date Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Expense Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
              />
            </div>
          </div>

          {/* Paid By Selector (Single or Multi-Payer) */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Who Paid For This?</label>
            <select className="form-select" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === currentUser?.id ? '(You)' : ''}
                </option>
              ))}
              <option value="multiple">🤝 Multiple People Paid (Multi-Payer Split)</option>
            </select>
          </div>

          {/* Dynamic Multi-Payer Input if 'multiple' is selected */}
          {paidBy === 'multiple' && (
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '8px' }}>
                <Users size={16} /> Specify amount paid by each person:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{currency}</span>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="form-input"
                        style={{ width: '100px', padding: '6px 10px', fontSize: '0.85rem', textAlign: 'right' }}
                        value={multiPayerAmounts[m.id] || ''}
                        onChange={e => setMultiPayerAmounts({ ...multiPayerAmounts, [m.id]: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Split Type Selector */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Split Method</label>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              {['equal', 'exact', 'percentage'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    background: splitType === type ? 'var(--accent-gradient)' : 'transparent',
                    color: splitType === type ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  {type === 'equal' ? 'Split Equally' : type === 'exact' ? 'Exact Amounts' : 'By Percentage'}
                </button>
              ))}
            </div>
          </div>

          {/* Split Details Dynamic Section */}
          <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              {splitType === 'equal' ? 'Included Members (Uncheck to exclude):' :
               splitType === 'exact' ? 'Enter exact share per member:' : 'Enter percentage per member (%):'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map(m => {
                const isIncluded = includedMembers.has(m.id);
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {splitType === 'equal' && (
                        <input 
                          type="checkbox" 
                          checked={isIncluded} 
                          onChange={() => handleEqualToggle(m.id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                        />
                      )}
                      <span className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}>{m.avatar}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.name}</span>
                    </div>

                    {splitType === 'equal' && (
                      <span style={{ fontSize: '0.85rem', color: isIncluded ? 'var(--text-main)' : 'var(--text-dim)', fontWeight: 600 }}>
                        {isIncluded && parseFloat(amount) > 0 
                          ? `${currency}${(parseFloat(amount) / includedMembers.size).toFixed(2)}` 
                          : 'Excluded'}
                      </span>
                    )}

                    {splitType === 'exact' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{currency}</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="form-input" 
                          style={{ width: '100px', padding: '6px 10px', fontSize: '0.85rem', textAlign: 'right' }}
                          value={customSplits[m.id] || ''}
                          onChange={e => setCustomSplits({ ...customSplits, [m.id]: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {splitType === 'percentage' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="number" 
                          step="1" 
                          className="form-input" 
                          style={{ width: '70px', padding: '6px 10px', fontSize: '0.85rem', textAlign: 'right' }}
                          value={customPercents[m.id] || ''}
                          onChange={e => setCustomPercents({ ...customPercents, [m.id]: e.target.value })}
                          placeholder="0"
                        />
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Receipt Attachment Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Attach Receipt (Optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '0.825rem' }}>
                <Paperclip size={15} />
                <span>{uploadingReceipt ? 'Uploading...' : 'Upload Image / PDF'}</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={uploadingReceipt}
                />
              </label>

              {receiptUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--emerald)' }}>
                  <FileImage size={15} />
                  <span>{receiptFileName || 'Receipt attached'}</span>
                  <button 
                    type="button" 
                    className="btn-icon" 
                    style={{ width: '22px', height: '22px' }}
                    onClick={() => { setReceiptUrl(''); setReceiptFileName(''); }}
                  >
                    <Trash2 size={12} color="var(--rose)" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes field */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Notes & Itemization</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. includes drinks and tax"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Check size={16} /> Save & Split Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
