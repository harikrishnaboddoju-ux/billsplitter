import React, { useState } from 'react';
import { Award, DollarSign, Layers } from 'lucide-react';

const CATEGORY_COLORS = [
  '#0984E3', '#00CEC9', '#6c5ce7', '#00b894', 
  '#fdcb6e', '#e17055', '#74b9ff', '#7f8c9b'
];

export default function AnalyticsView({
  group,
  currency
}) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  if (!group) return null;

  const bills = group.bills || [];
  const members = group.members || [];
  const totalSpent = group.total_spent || 0;
  const memberSpending = group.member_spending || {};
  const memberOwed = group.member_owed || {};

  // Aggregate category spending
  const categoryMap = {};
  bills.forEach(b => {
    const cat = b.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(b.amount || 0);
  });

  const categoryList = Object.entries(categoryMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Pure SVG Donut calculation
  const donutSlices = categoryList.reduce((acc, cat, idx) => {
    const prevPercent = acc.length > 0 ? acc[acc.length - 1].endPercent : 0;
    const endPercent = prevPercent + cat.percentage;
    const startAngle = (prevPercent / 100) * 360;
    const endAngle = (endPercent / 100) * 360;
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = 100 + 70 * Math.cos(startRad);
    const y1 = 100 + 70 * Math.sin(startRad);
    const x2 = 100 + 70 * Math.cos(endRad);
    const y2 = 100 + 70 * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const pathData = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;

    acc.push({
      ...cat,
      color,
      pathData,
      endPercent
    });
    return acc;
  }, []);

  // Find Key Metrics
  let topSpender = { name: 'None', amount: 0 };
  members.forEach(m => {
    const spent = memberSpending[m.id] || 0;
    if (spent > topSpender.amount) {
      topSpender = { name: m.name, amount: spent };
    }
  });

  const largestBill = bills.length > 0 
    ? [...bills].sort((a, b) => b.amount - a.amount)[0]
    : null;

  const maxMemberSpend = Math.max(
    ...members.map(m => Math.max(memberSpending[m.id] || 0, memberOwed[m.id] || 0)),
    1000
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 1. Quick Analytics KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} color="var(--amber)" /> Top Group Spender
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '8px 0 4px' }}>
            {topSpender.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--emerald)', fontWeight: 600 }}>
            Paid {currency}{Number(topSpender.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={16} color="var(--accent-primary)" /> Largest Single Expense
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '8px 0 4px' }}>
            {largestBill ? largestBill.title : 'None'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {largestBill ? `${currency}${Number(largestBill.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${largestBill.category})` : 'N/A'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="var(--sky)" /> Avg Expense Per Member
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: '8px 0 4px' }}>
            {currency}{members.length > 0 ? (totalSpent / members.length).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Across {members.length} members
          </div>
        </div>
      </div>

      {/* 2. Category Donut & Legend Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="section-header">
            <h3>Expense Category Distribution</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginTop: '12px' }}>
            {/* SVG Donut */}
            <div style={{ position: 'relative', width: '200px', height: '200px' }}>
              <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                {donutSlices.map((slice, idx) => (
                  <path
                    key={idx}
                    d={slice.pathData}
                    fill={slice.color}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      opacity: hoveredSlice === null || hoveredSlice === idx ? 1 : 0.4
                    }}
                    onMouseEnter={() => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                ))}
                {/* Center hole for donut look */}
                <circle cx="100" cy="100" r="46" fill="var(--bg-secondary)" />
              </svg>

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
                  {currency}{Math.round(totalSpent / 1000)}k
                </span>
              </div>
            </div>

            {/* Category Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '180px' }}>
              {categoryList.map((cat, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: hoveredSlice === idx ? 'var(--bg-card-hover)' : 'transparent',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                    <span style={{ fontWeight: 600 }}>{cat.category}</span>
                  </span>
                  <span>
                    <strong>{currency}{Number(cat.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                    <span style={{ color: 'var(--text-dim)', marginLeft: '6px', fontSize: '0.75rem' }}>({cat.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Member Contribution vs Consumption */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="section-header">
            <h3>Who Paid vs Who Consumed</h3>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '20px' }}>
            Comparison between money fronted (paid) versus share consumed (owed)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {members.map(m => {
              const paid = memberSpending[m.id] || 0;
              const consumed = memberOwed[m.id] || 0;
              const paidPct = maxMemberSpend > 0 ? (paid / maxMemberSpend) * 100 : 0;
              const consumedPct = maxMemberSpend > 0 ? (consumed / maxMemberSpend) * 100 : 0;

              return (
                <div key={m.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <span className="user-avatar" style={{ width: '22px', height: '22px', fontSize: '0.65rem' }}>{m.avatar}</span>
                      <span>{m.name}</span>
                    </span>
                    <div style={{ fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>Paid: {currency}{paid.toLocaleString()}</span>
                      <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>|</span>
                      <span style={{ color: 'var(--rose)', fontWeight: 700 }}>Share: {currency}{consumed.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Dual bar for comparison */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="progress-bar-bg" style={{ height: '6px' }} title={`Paid: ${currency}${paid}`}>
                      <div className="progress-bar-fill" style={{ width: `${paidPct}%`, background: 'var(--emerald)' }} />
                    </div>
                    <div className="progress-bar-bg" style={{ height: '6px' }} title={`Share Consumed: ${currency}${consumed}`}>
                      <div className="progress-bar-fill" style={{ width: `${consumedPct}%`, background: 'var(--rose)' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '18px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--emerald)', borderRadius: '2px' }} /> Total Paid (Out-of-Pocket)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--rose)', borderRadius: '2px' }} /> Fair Share Consumed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
