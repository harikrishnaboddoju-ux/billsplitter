import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  Receipt,
  FileImage,
  X,
  ExternalLink
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Rent': '🏠',
  'Groceries': '🛒',
  'Utilities': '⚡',
  'Food & Dining': '🍽️',
  'Travel': '🚗',
  'Entertainment': '🎬',
  'Supplies': '📦',
  'Other': '📄'
};

export default function BillsList({
  bills,
  members,
  currency,
  currentUser,
  onDeleteBill,
  onOpenAddBill
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const membersMap = {};
  members.forEach(m => {
    membersMap[m.id] = m;
  });

  const categories = ['All', 'Rent', 'Groceries', 'Utilities', 'Food & Dining', 'Travel', 'Entertainment', 'Supplies', 'Other'];

  const filteredBills = bills.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.notes && b.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bills-container">
      {/* Search & Filter Bar */}
      <div className="section-header">
        <div>
          <h2>Group Bills History</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Showing {filteredBills.length} of {bills.length} bills
          </p>
        </div>

        <div className="search-filter-bar">
          <div className="search-input-wrap">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search bills, notes..." 
              className="form-input"
              style={{ width: '220px', padding: '8px 12px 8px 36px', fontSize: '0.875rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="form-select"
            style={{ padding: '8px 14px', fontSize: '0.875rem' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : `${CATEGORY_ICONS[c] || ''} ${c}`}</option>
            ))}
          </select>

          <button className="btn-primary" onClick={onOpenAddBill} style={{ padding: '8px 14px', fontSize: '0.875rem' }}>
            <Plus size={16} /> Add Bill
          </button>
        </div>
      </div>

      {/* Bills Cards List */}
      {filteredBills.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Receipt size={48} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>No bills found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search query or category filter.' 
              : 'Add your first group expense to get started splitting!'}
          </p>
          <button className="btn-primary" onClick={onOpenAddBill} style={{ marginTop: '16px' }}>
            <Plus size={16} /> Add First Bill
          </button>
        </div>
      ) : (
        filteredBills.map(bill => {
          const isMultiPayer = bill.paid_by && typeof bill.paid_by === 'object';
          let payerText = '';
          let payerAvatar = 'M';
          let isCurrentUserPayer = false;

          if (isMultiPayer) {
            const payerNames = Object.keys(bill.paid_by).map(pid => membersMap[pid]?.name || pid);
            payerText = `Multiple (${payerNames.slice(0, 2).join(', ')}${payerNames.length > 2 ? '...' : ''})`;
            payerAvatar = '🤝';
            isCurrentUserPayer = currentUser?.id && bill.paid_by[currentUser.id] !== undefined;
          } else {
            const payer = membersMap[bill.paid_by] || { name: 'Member', avatar: 'M' };
            isCurrentUserPayer = currentUser?.id === bill.paid_by;
            payerText = isCurrentUserPayer ? 'You' : payer.name;
            payerAvatar = payer.avatar;
          }

          const userSplit = bill.splits && currentUser ? bill.splits[currentUser.id] : null;

          return (
            <div key={bill.id} className="glass-card bill-item-card">
              <div className="bill-main-info">
                {/* Category Icon */}
                <div className="category-icon-box">
                  {CATEGORY_ICONS[bill.category] || '📄'}
                </div>

                <div>
                  <div className="bill-title-text">
                    <span>{bill.title}</span>
                    <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                      {bill.category}
                    </span>
                    {bill.split_type && bill.split_type !== 'equal' && (
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                        {bill.split_type}
                      </span>
                    )}
                    {bill.receipt_url && (
                      <button 
                        className="badge badge-sky" 
                        style={{ fontSize: '0.68rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none' }}
                        onClick={() => setSelectedReceipt(bill.receipt_url)}
                        title="Click to view attached receipt"
                      >
                        <FileImage size={11} /> View Receipt
                      </button>
                    )}
                  </div>

                  <div className="bill-meta-text">
                    <span>{bill.date}</span>
                    <span>&bull;</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span className="user-avatar" style={{ width: '18px', height: '18px', fontSize: '0.6rem' }}>
                        {payerAvatar}
                      </span>
                      <span>Paid by <strong>{payerText}</strong></span>
                    </span>
                    {bill.notes && (
                      <>
                        <span>&bull;</span>
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          "{bill.notes}"
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount and Personal Split Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div className="bill-amount-box">
                  <div className="bill-amount">
                    {currency}{Number(bill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  {userSplit !== undefined && userSplit !== null && (
                    <div style={{ fontSize: '0.8rem', color: isCurrentUserPayer ? 'var(--emerald)' : 'var(--text-muted)' }}>
                      {isCurrentUserPayer && !isMultiPayer
                        ? `You lent ${currency}${(bill.amount - userSplit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                        : `Your share: ${currency}${Number(userSplit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </div>
                  )}
                </div>

                <button 
                  className="btn-icon" 
                  title="Delete Bill"
                  onClick={() => onDeleteBill(bill.id)}
                  style={{ color: 'var(--rose)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Receipt Image Modal Preview */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-content" style={{ maxWidth: '600px', padding: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <FileImage size={18} color="var(--accent-primary)" />
                <span>Attached Bill Receipt</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={selectedReceipt} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-icon" 
                  title="Open original in new tab"
                >
                  <ExternalLink size={16} />
                </a>
                <button className="btn-icon" onClick={() => setSelectedReceipt(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--bg-card-solid)', borderRadius: 'var(--radius-md)', padding: '12px', overflow: 'hidden' }}>
              <img 
                src={selectedReceipt} 
                alt="Receipt Document" 
                style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `<div style="padding: 40px; color: var(--text-muted)">Receipt preview available at: <a href="${selectedReceipt}" target="_blank" style="color: var(--accent-primary)">${selectedReceipt}</a></div>`;
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
