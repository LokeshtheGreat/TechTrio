import React from 'react';

const icons = {
  camera: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  ),
  battery: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect>
      <line x1="23" y1="13" x2="23" y2="11"></line>
    </svg>
  ),
  performance: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  display: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
    </svg>
  ),
  value: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  ),
  software: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  )
};

const TARGET_ASPECTS = [
  { id: "camera", label: "Camera" },
  { id: "battery", label: "Battery" },
  { id: "performance", label: "Performance" },
  { id: "display", label: "Display" },
  { id: "value", label: "Value" },
  { id: "software", label: "Software" }
];

export default function ProductAspectMetrics({ aspectsData }) {
  if (!aspectsData) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {TARGET_ASPECTS.map(a => (
           <div key={a.id} className="skeleton" style={{ width: '80px', height: '60px', borderRadius: '6px' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.75rem',
      width: '100%',
      alignItems: 'stretch'
    }}>
      {TARGET_ASPECTS.map(aspect => {
        const stats = aspectsData[aspect.id];
        if (!stats) return null;
        
        const mentions = stats.mentions;
        const posPct = stats.positive_percentage;
        const negPct = stats.negative_percentage;
        const netScore = posPct - negPct;
        const hasData = mentions > 0;
        
        const displayScore = hasData ? netScore : 0;
        const isPositive = displayScore > 0;
        const isNegative = displayScore < 0;

        return (
          <div key={aspect.id} style={{
            flex: '1 1 auto',
            minWidth: '95px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '0.75rem 0.6rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.6rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Top: Icon + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'flex', color: 'var(--text-tertiary)' }}>
                {icons[aspect.id]}
              </span>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: '700', 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {aspect.label}
              </span>
            </div>
            
            {/* Middle: Prominent Percentage */}
            <div style={{ 
              fontSize: '1.35rem', 
              fontWeight: '800', 
              lineHeight: 1,
              color: hasData 
                ? (isPositive ? 'var(--status-pos)' : isNegative ? 'var(--status-neg)' : 'var(--text-primary)')
                : 'var(--text-tertiary)'
            }}>
              {hasData ? `${isPositive ? '+' : ''}${displayScore.toFixed(0)}%` : '--'}
            </div>

            {/* Bottom: Visual Progress Bar */}
            <div style={{ 
              width: '100%', 
              height: '3px', 
              background: 'var(--border-medium)', 
              borderRadius: '2px', 
              overflow: 'hidden',
              marginTop: 'auto'
            }}>
               <div style={{
                 height: '100%',
                 width: hasData ? `${Math.abs(displayScore)}%` : '0%',
                 background: isPositive ? 'var(--status-pos)' : isNegative ? 'var(--status-neg)' : 'var(--text-tertiary)',
                 borderRadius: '2px',
                 transition: 'width 0.5s ease-out'
               }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
