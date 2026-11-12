import React from 'react';
import Container from './Container';

export default function Header({ status, currentView, onViewChange }) {
  return (
    <header style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-medium)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Container>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '4rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
              Mobile Intelligence Platform
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Product Analytics & Sentiment Engine
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Compare Button */}
            {onViewChange && (
              <button 
                onClick={() => onViewChange(currentView === 'compare' ? 'home' : 'compare')}
                style={{
                  background: currentView === 'compare' ? 'var(--text-primary)' : 'var(--bg-subtle)',
                  color: currentView === 'compare' ? 'var(--bg-card)' : 'var(--text-primary)',
                  border: currentView === 'compare' ? 'none' : '1px solid var(--border-medium)',
                  padding: '0.4rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {currentView === 'compare' ? 'Dashboard' : 'Compare'}
              </button>
            )}

            {/* Status Indicator */}
            {status && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-subtle)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)'
              }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: status.is_scraping ? 'var(--status-neg)' : 'var(--status-pos)' 
                }}></span>
                {status.is_scraping ? 'Syncing data...' : 'Data up to date'}
              </div>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
