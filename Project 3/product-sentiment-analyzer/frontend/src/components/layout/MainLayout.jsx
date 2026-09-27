import React from 'react';
import Header from './Header';
import Container from './Container';

export default function MainLayout({ children, status, currentView, onViewChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header status={status} currentView={currentView} onViewChange={onViewChange} />
      <main style={{ flex: 1, padding: '3rem 0' }}>
        <Container>
          {children}
        </Container>
      </main>
      <footer style={{
        padding: '2rem 0',
        borderTop: '1px solid var(--border-medium)',
        background: 'var(--bg-card)',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.85rem'
      }}>
        <Container>
          &copy; {new Date().getFullYear()} Mobile Intelligence Platform. All rights reserved.
        </Container>
      </footer>
    </div>
  );
}
