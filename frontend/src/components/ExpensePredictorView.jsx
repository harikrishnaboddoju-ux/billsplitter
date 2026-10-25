import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  Calendar, 
  CheckCircle, 
  Info,
  ShieldAlert,
  Lightbulb,
  Cpu
} from 'lucide-react';

const CATEGORY_COLORS = {
  'Food & Dining': '#0984E3',
  'Entertainment': '#00CEC9',
  'Groceries': '#6c5ce7',
  'Supplies': '#00b894',
  'Travel': '#fdcb6e',
  'Utilities': '#e17055',
  'Rent': '#74b9ff',
  'Other': '#7f8c9b'
};

export default function ExpensePredictorView({
  forecastData,
  group,
  currency
}) {
  if (!forecastData || forecastData.status === 'insufficient_data') {
    return (
      <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
        <Sparkles size={48} color="var(--accent-primary)" style={{ marginBottom: '14px' }} />
        <h3>Gathering Expense Trends</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
          Add more group bills to activate machine learning expense forecasts.
        </p>
      </div>
    );
  }

  const {
    total_forecast,
    confidence_interval,
    daily_projected_average,
    category_forecasts,
    weekly_timeline,
    past_monthly_trends,
    spending_alerts,
    recommendations,
    model_metadata
  } = forecastData;

  const budget = group?.monthly_budget || 8000;
  const isBudgetExceeded = total_forecast > budget;

  // Maximum weekly spend for relative bar height
  const maxWeekly = Math.max(...(weekly_timeline?.map(w => w.predicted) || [1000]));
  const maxPast = Math.max(
    ...(past_monthly_trends?.map(p => p.amount) || [1000]),
    total_forecast || 1000
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Hero Forecast Banner */}
      <div className="forecast-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Next Month AI Expense Forecast</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Powered by Time-Series Regression & Seasonality Decomposition
              </div>
            </div>
          </div>

          <div className="badge badge-purple" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={14} />
            <span>{model_metadata?.algorithm || 'Ridge/Trend ML Model'}</span>
          </div>
        </div>

        {/* Forecast Metrics */}
        <div className="forecast-stats-row">
          <div className="forecast-metric">
            <div className="forecast-metric-label">Forecasted Monthly Total</div>
            <div className="forecast-metric-val">
              {currency}{Number(total_forecast).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="forecast-metric">
            <div className="forecast-metric-label">85% Confidence Interval</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {currency}{confidence_interval?.lower?.toLocaleString()} – {currency}{confidence_interval?.upper?.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Expected volatility range</div>
          </div>

          <div className="forecast-metric">
            <div className="forecast-metric-label">Daily Projected Spend</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {currency}{daily_projected_average?.toLocaleString()}/day
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Across 30 days projection</div>
          </div>

          <div className="forecast-metric">
            <div className="forecast-metric-label">Budget Threshold Status</div>
            <div style={{ marginTop: '6px' }}>
              {isBudgetExceeded ? (
                <span className="badge badge-rose" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Exceeds Budget (+{currency}{(total_forecast - budget).toLocaleString()})
                </span>
              ) : (
                <span className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Under Budget ({currency}{(budget - total_forecast).toLocaleString()} remaining)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spending Alerts Banner */}
      {spending_alerts && spending_alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {spending_alerts.map((alert, idx) => (
            <div 
              key={idx}
              className="glass-card"
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                borderLeft: `4px solid ${alert.type === 'danger' ? 'var(--rose)' : alert.type === 'warning' ? 'var(--amber)' : 'var(--accent-primary)'}`
              }}
            >
              {alert.type === 'danger' ? (
                <ShieldAlert size={22} color="var(--rose)" />
              ) : alert.type === 'warning' ? (
                <AlertTriangle size={22} color="var(--amber)" />
              ) : (
                <Info size={22} color="var(--accent-primary)" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alert.title}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>{alert.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. 4-Week Horizon & Past Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* 4-Week Projected Timeline */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>4-Week Forecast Timeline</h3>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '20px' }}>
            Weekly projected group cash outflows over the next month
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {weekly_timeline?.map((w, idx) => {
              const pct = maxWeekly > 0 ? (w.predicted / maxWeekly) * 100 : 0;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{w.week}</span>
                    <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--text-main)' }}>
                      {currency}{Number(w.predicted).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${pct}%`,
                        background: idx === 0 ? 'var(--accent-gradient)' : 'var(--accent-gradient-teal)' 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Spend vs Forecast Bar Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} color="var(--emerald)" />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Monthly Trend Comparison</h3>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '20px' }}>
            Past months actual spend vs next month forecasted projection
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '170px', paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
            {past_monthly_trends?.map((p, idx) => {
              const hPercent = maxPast > 0 ? (p.amount / maxPast) * 100 : 10;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {currency}{Math.round(p.amount / 1000)}k
                  </span>
                  <div style={{
                    width: '36px',
                    height: `${Math.max(15, hPercent)}px`,
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    transition: 'all 0.3s'
                  }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.month.slice(5)}</span>
                </div>
              );
            })}

            {/* Next Month Forecast Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {currency}{Math.round(total_forecast / 1000)}k
              </span>
              <div style={{
                width: '36px',
                height: `${Math.max(15, (total_forecast / maxPast) * 100)}px`,
                background: 'var(--accent-gradient)',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                boxShadow: '0 0 15px rgba(9, 132, 227, 0.45)'
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Next Mo</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--bg-card-hover)', display: 'inline-block', borderRadius: '2px' }} /> Past Months (Actual)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--accent-primary)', display: 'inline-block', borderRadius: '2px' }} /> ML Projection
            </span>
          </div>
        </div>
      </div>

      {/* 4. Per-Category Breakdown & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Category Breakdown */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Category Forecast Share</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {category_forecasts?.map((cat, idx) => {
              const trendIcon = cat.trend === 'upward' ? <TrendingUp size={14} color="var(--rose)" /> :
                                cat.trend === 'downward' ? <TrendingDown size={14} color="var(--emerald)" /> :
                                <Minus size={14} color="var(--text-dim)" />;

              return (
                <div key={idx} className="cat-progress-item">
                  <div className="cat-progress-head">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CATEGORY_COLORS[cat.category] || 'var(--accent-primary)' }} />
                      <span>{cat.category}</span>
                      <span title={`Trend: ${cat.trend}`} style={{ display: 'inline-flex' }}>{trendIcon}</span>
                    </span>
                    <span>
                      <strong>{currency}{Number(cat.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '6px' }}>({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${cat.percentage}%`,
                        background: CATEGORY_COLORS[cat.category] || 'var(--accent-gradient)' 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Actionable Recommendations */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Lightbulb size={20} color="var(--amber)" />
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Smart AI Recommendations</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations?.map((rec, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <CheckCircle size={16} color="var(--emerald)" style={{ marginTop: '3px', flexShrink: 0 }} />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
