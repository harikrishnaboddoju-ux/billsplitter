import React from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function StatsCards({
  group,
  currentUser,
  forecastData
}) {
  if (!group) return null;

  const currency = group.currency || '₹';
  const totalSpent = group.total_spent || 0;
  const budget = group.monthly_budget || 8000;
  const userBalance = (group.balances && currentUser) ? (group.balances[currentUser.id] || 0) : 0;
  const budgetPercent = Math.min(Math.round((totalSpent / budget) * 100), 100);
  const remainingBudget = Math.max(0, budget - totalSpent);

  const forecastTotal = forecastData?.total_forecast || 0;
  const forecastTrend = forecastTotal > totalSpent ? 'Higher' : 'Lower';

  return (
    <div className="stats-grid">
      {/* 1. Total Group Spend */}
      <div className="glass-card stat-card accent-purple">
        <div className="stat-top">
          <span>Total Group Spend</span>
          <div className="stat-icon">
            <Wallet size={18} />
          </div>
        </div>
        <div>
          <div className="stat-value">{currency}{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-sub">
            <span>{group.bills?.length || 0} bills logged across {group.members?.length || 0} members</span>
          </div>
        </div>
      </div>

      {/* 2. Your Net Balance */}
      <div className={`glass-card stat-card ${userBalance > 0 ? 'accent-green' : userBalance < 0 ? 'accent-amber' : 'accent-purple'}`}>
        <div className="stat-top">
          <span>Your Net Balance</span>
          <div className="stat-icon">
            {userBalance > 0 ? <ArrowUpRight size={18} /> : userBalance < 0 ? <ArrowDownRight size={18} /> : <CheckCircle2 size={18} />}
          </div>
        </div>
        <div>
          <div className="stat-value" style={{ color: userBalance > 0 ? 'var(--emerald)' : userBalance < 0 ? 'var(--rose)' : 'inherit' }}>
            {userBalance > 0 ? `+${currency}${userBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 
             userBalance < 0 ? `-${currency}${Math.abs(userBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 
             'Settled Up'}
          </div>
          <div className="stat-sub">
            {userBalance > 0 ? (
              <span style={{ color: 'var(--emerald)' }}>You are owed money by group members</span>
            ) : userBalance < 0 ? (
              <span style={{ color: 'var(--rose)' }}>You owe payments to group members</span>
            ) : (
              <span>All your shared dues are balanced!</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Monthly Budget Utilized */}
      <div className="glass-card stat-card accent-blue">
        <div className="stat-top">
          <span>Monthly Budget Cap</span>
          <div className="stat-icon">
            <TrendingUp size={18} />
          </div>
        </div>
        <div>
          <div className="stat-value">
            {budgetPercent}%
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '8px' }}>
              ({currency}{remainingBudget.toLocaleString()} left)
            </span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div className="progress-bar-bg" style={{ height: '6px' }}>
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${budgetPercent}%`,
                  background: budgetPercent > 90 ? 'var(--rose)' : budgetPercent > 75 ? 'var(--amber)' : 'var(--accent-gradient-teal)' 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Next Month ML Forecast Preview */}
      <div className="glass-card stat-card accent-amber">
        <div className="stat-top">
          <span>Next Month ML Forecast</span>
          <div className="stat-icon">
            <Sparkles size={18} />
          </div>
        </div>
        <div>
          <div className="stat-value" style={{ color: 'var(--amber)' }}>
            {currency}{forecastTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-sub">
            <span className="badge badge-amber" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
              {forecastTrend} than current
            </span>
            <span>Based on 90-day time-series</span>
          </div>
        </div>
      </div>
    </div>
  );
}
