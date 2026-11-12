import React, { useState, useEffect, useMemo } from 'react';
import { fetchComparisonAnalytics } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const CHART_COLORS = ['#3B82F6', '#059669', '#DC2626', '#8B5CF6', '#F59E0B'];

export default function ProductComparison({ products, onBack }) {
  const [analytics, setAnalytics] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Sync selectedIds when products load
  useEffect(() => {
    if (products.length > 0 && selectedIds.length === 0) {
      setSelectedIds(products.map(p => p.id));
    }
  }, [products]);
  
  useEffect(() => {
    fetchComparisonAnalytics()
      .then(res => {
         if (!res || !res.comparison) {
           setError(true);
           setLoading(false);
           return;
         }
         const enriched = res.comparison.map(c => {
           const total = c.total_reviews || 1;
           return {
             ...c,
             posPct: Math.round(((c.sentiment_distribution.Positive || 0) / total) * 100),
             neuPct: Math.round(((c.sentiment_distribution.Neutral || 0) / total) * 100),
             negPct: Math.round(((c.sentiment_distribution.Negative || 0) / total) * 100),
             // Map product id to full product name for charts
             product_name: products.find(p => p.id === c.product_id)?.name || c.product_name
           };
         });
         setAnalytics(enriched);
         setLoading(false);
      })
      .catch(err => {
         console.error(err);
         setError(true);
         setLoading(false);
      });
  }, [products]);

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      if (selectedIds.length < 5) setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => setSelectedIds(products.map(p => p.id));
  const handleClearAll = () => setSelectedIds([]);

  const selectedData = useMemo(() => {
    return analytics.filter(a => selectedIds.includes(a.product_id));
  }, [analytics, selectedIds]);

  // 100% Stacked Bar Data (Positive/Neutral/Negative per Product)
  const sentimentStackedData = useMemo(() => {
    return selectedData.map(prod => ({
      name: prod.product_name,
      Positive: prod.posPct,
      Neutral: prod.neuPct,
      Negative: prod.negPct
    }));
  }, [selectedData]);

  // Radar Chart Data (Aspects per Product)
  const aspectData = useMemo(() => {
     const aspects = ["camera", "battery", "performance", "display", "value", "software"];
     return aspects.map(asp => {
       const row = { name: asp.charAt(0).toUpperCase() + asp.slice(1) };
       selectedData.forEach(prod => {
         row[prod.product_id] = prod.aspect_positive_percentages[asp] || 0;
       });
       return row;
     });
  }, [selectedData]);

  const canCompare = selectedIds.length >= 2;

  const CustomStackedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '6px', padding: '0.75rem', boxShadow: 'var(--shadow-md)', minWidth: '160px' }}>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>
            {label}
          </div>
          {payload.map((p, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
                <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{p.value}%</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomRadarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '6px', padding: '0.75rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>
            {label} Sentiment
          </div>
          {payload.map((p, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill || p.stroke }} />
                <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
              </div>
              <strong style={{ color: 'var(--text-primary)' }}>{p.value !== undefined ? p.value + '%' : 'N/A'}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={onBack}
          style={{ 
            background: 'var(--bg-subtle)', 
            border: '1px solid var(--border-medium)', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--border-light)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Product Comparison
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Select products to compare side-by-side sentiment, specifications, and analytics.
        </p>
      </div>

      {/* Product Selector */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h4 style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)' }}>Select Products (2-5)</h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleSelectAll} style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Select All</button>
            <button onClick={handleClearAll} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Clear All</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: selectedIds.includes(p.id) ? 'var(--bg-subtle)' : 'var(--bg-card)',
                border: selectedIds.includes(p.id) ? '2px solid var(--accent-secondary)' : '1px solid var(--border-medium)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                color: 'var(--text-primary)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ 
                width: '16px', height: '16px', borderRadius: '4px', 
                border: selectedIds.includes(p.id) ? 'none' : '1px solid var(--border-strong)',
                background: selectedIds.includes(p.id) ? 'var(--accent-secondary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {selectedIds.includes(p.id) && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
              </div>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>Loading Comparison Data...</h4>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--status-neg)' }}>
          <h4 style={{ color: 'var(--status-neg)' }}>Unable to load data</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>There was an error fetching comparison analytics.</p>
        </div>
      ) : !canCompare ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-strong)' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>Please select at least 2 products to view comparison.</h4>
        </div>
      ) : (
        <>
          {/* Comparison Overview Table */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', marginBottom: '3rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '1.5rem', borderBottom: '2px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Metric</th>
                  {selectedData.map(d => (
                    <th key={d.product_id} style={{ padding: '1.5rem', borderBottom: '2px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.95rem', minWidth: '150px' }}>
                      {d.product_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Average Rating</td>
                  {selectedData.map(d => <td key={d.product_id} style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#fbbf24' }}>{d.average_rating.toFixed(1)} ★</td>)}
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Reviews</td>
                  {selectedData.map(d => <td key={d.product_id} style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)' }}>{d.total_reviews}</td>)}
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Positive %</td>
                  {selectedData.map(d => <td key={d.product_id} style={{ padding: '1rem 1.5rem', color: 'var(--status-pos)', fontWeight: '600' }}>{d.posPct}%</td>)}
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Neutral %</td>
                  {selectedData.map(d => <td key={d.product_id} style={{ padding: '1rem 1.5rem', color: 'var(--text-tertiary)' }}>{d.neuPct}%</td>)}
                </tr>
                <tr>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Negative %</td>
                  {selectedData.map(d => <td key={d.product_id} style={{ padding: '1rem 1.5rem', color: 'var(--status-neg)', fontWeight: '600' }}>{d.negPct}%</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {/* Sentiment Chart (100% Stacked Bar) */}
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', width: '100%' }}>
              <h4 style={{ margin: '0 0 2rem 0', fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Sentiment Comparison</h4>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentStackedData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="var(--border-medium)" strokeOpacity={0.4} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 13, fontWeight: 700, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} width={150} />
                    <Tooltip content={<CustomStackedTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                    <Legend wrapperStyle={{ fontSize: '0.9rem', paddingTop: '20px' }} iconType="circle" />
                    <Bar dataKey="Positive" stackId="a" fill="var(--status-pos)" barSize={40} />
                    <Bar dataKey="Neutral" stackId="a" fill="var(--text-tertiary)" barSize={40} />
                    <Bar dataKey="Negative" stackId="a" fill="var(--status-neg)" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Aspect Chart (Radar) */}
            <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', width: '100%' }}>
              <h4 style={{ margin: '0 0 2rem 0', fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Customer Aspect Sentiment</h4>
              <div style={{ height: '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={aspectData} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <PolarGrid stroke="var(--border-medium)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <Tooltip content={<CustomRadarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.9rem', paddingTop: '20px' }} iconType="circle" />
                    {selectedData.map((prod, idx) => (
                      <Radar key={prod.product_id} name={prod.product_name} dataKey={prod.product_id} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={3} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.2} activeDot={{ r: 6 }} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
