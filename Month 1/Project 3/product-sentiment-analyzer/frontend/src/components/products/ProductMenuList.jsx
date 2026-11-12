import React, { useState, useEffect } from 'react';
import ProductMenuCard from './ProductMenuCard';
import { fetchAnalyticsAspects, fetchAnalyticsOverview } from '../../api';

export default function ProductMenuList({ products, perspective }) {
  const [analyticsData, setAnalyticsData] = useState({});

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const promises = products.map(async p => {
          const [aspectsRes, overviewRes] = await Promise.all([
            fetchAnalyticsAspects(p.id),
            fetchAnalyticsOverview(p.id)
          ]);
          return {
            id: p.id,
            aspects: aspectsRes?.aspects || {},
            overview: overviewRes || {}
          };
        });
        
        const results = await Promise.all(promises);
        const newData = {};
        results.forEach(res => {
          newData[res.id] = res;
        });
        setAnalyticsData(newData);
      } catch (err) {
        console.error("Failed to load analytics for product menus:", err);
      }
    };
    
    if (products.length > 0) {
      loadAnalytics();
    }
  }, [products]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem', 
      width: '100%'
    }}>
      {products.map((p, index) => {
        const data = analyticsData[p.id];
        return (
          <ProductMenuCard 
            key={p.id}
            product={p}
            aspectsData={data?.aspects}
            overviewData={data?.overview}
            perspective={perspective}
          />
        );
      })}
    </div>
  );
}
