import React, { useState } from 'react';
import ProductAspectMetrics from './ProductAspectMetrics';
import ProductExpandedStats from './ProductExpandedStats';
import ProductIntelligence from './ProductIntelligence';

export default function ProductMenuCard({ product, aspectsData, overviewData, perspective = 'consumer' }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="product-card-inner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: '12px',
        boxShadow: isHovered ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      
      {/* COMPACT TOP ROW (Always Visible) */}
      <div className="product-card-top" style={{ display: 'flex', flexDirection: 'row' }}>
        
        {/* LEFT: Name + Aspects */}
        <div className="product-card-left" style={{ 
          flex: '1.6', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '1.5rem 2rem', 
          justifyContent: 'center',
          minHeight: '220px'
        }}>
          <h2 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1.5rem', 
            fontWeight: '800',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            {product.name}
          </h2>
          <ProductAspectMetrics aspectsData={aspectsData} />
        </div>
        
        {/* RIGHT: Image */}
        <div className="product-card-right" style={{ 
          flex: '0.4',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px'
        }}>
          <img 
            src={product.image} 
            alt={product.name}
            style={{
              width: '100%', 
              height: '100%', 
              maxHeight: '200px',
              objectFit: 'contain',
              transition: 'transform 0.4s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }} 
          />
        </div>
      </div>

      {/* EXTENDED SECTION (Visible on Hover - Pushes layout down) */}
      <div style={{
        opacity: isHovered ? 1 : 0,
        maxHeight: isHovered ? '4500px' : '0px',
        overflow: 'hidden',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: isHovered ? '0 2rem 1.5rem 2rem' : '0 2rem',
        borderTop: isHovered ? '1px solid var(--border-medium)' : 'none'
      }}>
        {overviewData && perspective === 'consumer' && (
          <>
            <ProductExpandedStats overviewData={overviewData} />
            {isHovered && <ProductIntelligence product={product} overviewData={overviewData} perspective="consumer" />}
          </>
        )}
        {overviewData && perspective === 'business' && (
          <>
            {isHovered && <ProductIntelligence product={product} overviewData={overviewData} aspectsData={aspectsData} perspective="business" />}
          </>
        )}
      </div>

    </div>
  );
}
