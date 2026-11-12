import React, { useState, useEffect } from 'react';
import './App.css';
import { fetchProducts, getScrapeStatus } from './api';
import MainLayout from './components/layout/MainLayout';
import ProductMenuList from './components/products/ProductMenuList';
import ProductComparison from './pages/ProductComparison';

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('home');
  const [perspective, setPerspective] = useState('consumer');

  useEffect(() => {
    // Load config and status
    fetchProducts()
      .then(setProducts)
      .catch(console.error);
      
    getScrapeStatus()
      .then(setStatus)
      .catch(console.error);
  }, []);

  return (
    <MainLayout status={status} currentView={view} onViewChange={setView}>
      {view === 'home' ? (
        <div style={{ marginTop: '1rem', width: '100%' }}>
          
          {/* Perspective Segmented Control */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '0.35rem'
            }}>
              <button
                onClick={() => setPerspective('consumer')}
                style={{
                  background: perspective === 'consumer' ? 'var(--bg-card)' : 'transparent',
                  color: perspective === 'consumer' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: perspective === 'consumer' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Consumer
              </button>
              <button
                onClick={() => setPerspective('business')}
                style={{
                  background: perspective === 'business' ? 'var(--bg-card)' : 'transparent',
                  color: perspective === 'business' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: perspective === 'business' ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Business
              </button>
            </div>
          </div>

          {/* Perspective Views */}
          <ProductMenuList products={products} perspective={perspective} />

        </div>
      ) : (
        <ProductComparison products={products} onBack={() => setView('home')} />
      )}
    </MainLayout>
  );
}
