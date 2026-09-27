import React from 'react';

export default function ProductExpandedStats({ overviewData }) {
  if (!overviewData) return null;

  const rating = overviewData.average_rating || 0;
  const reviews = overviewData.total_reviews || 0;
  const posPct = overviewData.sentiment_distribution?.percentages?.Positive || 0;
  const neuPct = overviewData.sentiment_distribution?.percentages?.Neutral || 0;
  const negPct = overviewData.sentiment_distribution?.percentages?.Negative || 0;
  const score = overviewData.average_sentiment_score || 0;

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <h4 style={{ 
        margin: '0 0 1rem 0', 
        color: 'var(--text-tertiary)', 
        fontSize: '0.75rem', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em' 
      }}>
        Extended Intelligence
      </h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
        
        <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Avg Rating</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {rating.toFixed(1)} <span style={{ color: '#fbbf24' }}>★</span>
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Total Reviews</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {reviews}
          </div>
        </div>

        <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Overall Sentiment</div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: '800', 
            color: score > 0 ? 'var(--status-pos)' : score < 0 ? 'var(--status-neg)' : 'var(--text-primary)', 
            marginTop: '0.25rem' 
          }}>
            {score > 0 ? '+' : ''}{score.toFixed(2)}
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>Breakdown</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.8rem', fontWeight: '600' }}>
            <span style={{ color: 'var(--status-pos)' }}>{posPct}%</span>
            <span style={{ color: 'var(--status-neu)' }}>{neuPct}%</span>
            <span style={{ color: 'var(--status-neg)' }}>{negPct}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
