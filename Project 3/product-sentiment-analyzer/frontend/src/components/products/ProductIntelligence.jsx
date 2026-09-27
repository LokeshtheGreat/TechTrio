import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchReviews, fetchAnalyticsKeywords, fetchAnalyticsTrends, fetchBusinessInsight, fetchConsumerInsight, askChatbot } from '../../api';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line, Legend } from 'recharts';
import ProductExpandedStats from './ProductExpandedStats';
import ProductAspectMetrics from './ProductAspectMetrics';

const COLORS = {
  Positive: '#059669',
  Neutral: '#6B7280',
  Negative: '#DC2626'
};

export default function ProductIntelligence({ product, overviewData, aspectsData, perspective = 'consumer' }) {
  const [keywords, setKeywords] = useState([]);
  const [posReviews, setPosReviews] = useState([]);
  const [negReviews, setNegReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [trends, setTrends] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [insightData, setInsightData] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(null);
  // useRef to track whether a Groq fetch is already in-flight for this product+perspective.
  // This avoids the stale-closure race condition: when perspective changes and the effect
  // re-runs, a closure check on insightLoading state would read the value from the prior
  // render and could launch duplicate requests.
  const insightFetchingRef = useRef(false);

  // ── Effect 1: fetch keywords, trends, reviews whenever product changes ─────────────
  useEffect(() => {
    let isMounted = true;

    fetchAnalyticsKeywords(product.id).then(res => {
      if (isMounted && res.overall_keywords) {
        setKeywords(res.overall_keywords.slice(0, 8));
      }
    }).catch(console.error);

    fetchAnalyticsTrends(product.id).then(res => {
      if (isMounted && res.trends) {
        setTrends(res.trends);
      }
    }).catch(console.error);

    fetchReviews(product.id, 'all', 1000).then(res => {
      if (!isMounted || !res.reviews) return;

      const reviews = res.reviews;
      setAllReviews(reviews);

      const pos = reviews.filter(r => r.sentiment === 'Positive')
                         .sort((a, b) => b.sentiment_score - a.sentiment_score)
                         .slice(0, 5);

      const neg = reviews.filter(r => r.sentiment === 'Negative')
                         .sort((a, b) => a.sentiment_score - b.sentiment_score)
                         .slice(0, 5);

      setPosReviews(pos);
      setNegReviews(neg);
    }).catch(console.error);

    return () => { isMounted = false; };
  }, [product.id]);

  // ── Effect 2: reset Insight state when product or perspective changes ─────────────
  // Ensures a previously loaded insight is never shown inappropriately.
  useEffect(() => {
    setInsightData(null);
    setInsightError(null);
    setInsightLoading(false);
    insightFetchingRef.current = false;
  }, [product.id, perspective]);

  // ── Effect 3: fetch Insight for the active perspective ────────────
  useEffect(() => {
    // Skip if a request is already in-flight (ref is reliable; state reads in effects
    // can be stale from the render that scheduled this effect)
    if (insightFetchingRef.current) return;
    // Skip if insight already loaded for this product+perspective
    if (insightData !== null) return;

    let isMounted = true;
    insightFetchingRef.current = true;
    setInsightLoading(true);
    setInsightError(null);

    const fetchPromise = perspective === 'business' 
      ? fetchBusinessInsight(product.id)
      : fetchConsumerInsight(product.id);

    fetchPromise
      .then(res => {
        if (isMounted) {
          setInsightData(res);
          setInsightLoading(false);
          insightFetchingRef.current = false;
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error("Failed to load insight:", err);
          setInsightError(err.response?.data?.error || "Failed to load insights.");
          setInsightLoading(false);
          insightFetchingRef.current = false;
        }
      });

    return () => { isMounted = false; };
  }, [product.id, perspective]);

  const pieData = overviewData?.sentiment_distribution?.counts ? [
    { name: 'Positive', value: overviewData.sentiment_distribution.counts.Positive || 0 },
    { name: 'Neutral', value: overviewData.sentiment_distribution.counts.Neutral || 0 },
    { name: 'Negative', value: overviewData.sentiment_distribution.counts.Negative || 0 }
  ] : [];

  const totalReviews = overviewData?.total_reviews || 0;

  // Enrich trends with actual positive/neutral/negative percentages and average rating
  const enrichedTrends = useMemo(() => {
    if (!trends.length) return [];
    return trends.map(t => {
      const dayReviews = allReviews.filter(r => r.scraped_at?.startsWith(t.date));
      if (dayReviews.length > 0) {
         const pos = dayReviews.filter(r => r.sentiment === 'Positive').length;
         const neu = dayReviews.filter(r => r.sentiment === 'Neutral').length;
         const neg = dayReviews.filter(r => r.sentiment === 'Negative').length;
         const total = dayReviews.length;
         const ratingSum = dayReviews.reduce((sum, r) => sum + (r.star_rating || 0), 0);
         
         return {
           ...t,
           Positive: Math.round((pos / total) * 100),
           Neutral: Math.round((neu / total) * 100),
           Negative: Math.round((neg / total) * 100),
           average_rating: Number((ratingSum / total).toFixed(2))
         };
      }
      return {
         ...t,
         Positive: 0,
         Neutral: 0,
         Negative: 0,
         average_rating: 0
      };
    });
  }, [trends, allReviews]);

  if (perspective === 'business') {
    return (
      <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--border-strong)', paddingTop: '2rem' }}>
        
        {/* BUSINESS INSIGHT STRUCTURE */}
        <div style={{ marginBottom: '4rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Business Insight
          </h3>

          {insightLoading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Generating AI insights from real reviews...
            </div>
          )}

          {insightError && !insightLoading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-neg)', background: 'var(--bg-subtle)', border: '1px solid var(--status-neg)', borderRadius: '12px' }}>
              <p style={{ margin: 0 }}>{insightError}</p>
            </div>
          )}

          {insightData && !insightLoading && (
            <>
              {/* 1. CUSTOMER FEEDBACK SUMMARY */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Customer Feedback Summary</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1rem' }}>{insightData.summary}</p>
              </div>

              {/* 2 & 3. CUSTOMERS LIKE & DISLIKE */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderTop: '3px solid var(--status-pos)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Customers Like</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {insightData.likes && insightData.likes.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                    ))}
                    {(!insightData.likes || insightData.likes.length === 0) && <li>No specific positive themes identified.</li>}
                  </ul>
                </div>
                
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderTop: '3px solid var(--status-neg)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Customers Dislike</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {insightData.dislikes && insightData.dislikes.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                    ))}
                    {(!insightData.dislikes || insightData.dislikes.length === 0) && <li>No specific negative themes identified.</li>}
                  </ul>
                </div>
              </div>

              {/* 4. RECURRING CUSTOMER ISSUES */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Recurring Customer Issues</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {insightData.recurringIssues && insightData.recurringIssues.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                  ))}
                  {(!insightData.recurringIssues || insightData.recurringIssues.length === 0) && <li>No major recurring issues identified.</li>}
                </ul>
              </div>

              {/* 5. AREAS REQUIRING ATTENTION */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Areas Requiring Attention</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {insightData.areasOfAttention && insightData.areasOfAttention.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                  ))}
                  {(!insightData.areasOfAttention || insightData.areasOfAttention.length === 0) && <li>No specific areas require urgent attention.</li>}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* 1. CUSTOMER FEEDBACK SNAPSHOT */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Customer Feedback Snapshot
          </h3>
          <ProductExpandedStats overviewData={overviewData} />
        </div>

        {/* 2. CUSTOMER ASPECT SENTIMENT */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Customer Aspect Sentiment
          </h3>
          <ProductAspectMetrics aspectsData={aspectsData} />
        </div>

        {/* 3. HISTORICAL CUSTOMER FEEDBACK */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Historical Customer Feedback
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Sentiment Trend */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Sentiment Trend</h4>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrichedTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickMargin={10} minTickGap={30} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} domain={[0, 100]} />
                    <RechartsTooltip content={<CustomTrendTooltip suffix="%" />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="Positive" name="Positive %" stroke="var(--status-pos)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Neutral" name="Neutral %" stroke="var(--status-neu)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Negative" name="Negative %" stroke="var(--status-neg)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rating Trend & Volume */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Average Rating</h4>
              <div style={{ height: '100px', marginBottom: '1.5rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrichedTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickCount={3} />
                    <RechartsTooltip content={<CustomTrendTooltip />} />
                    <Line type="monotone" dataKey="average_rating" name="Avg Rating" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Review Volume</h4>
              <div style={{ height: '100px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrichedTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickCount={3} />
                    <RechartsTooltip content={<CustomTrendTooltip />} />
                    <Bar dataKey="volume" name="Volume" fill="var(--text-primary)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CUSTOMER VOICE */}
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Customer Voice
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ color: 'var(--status-pos)', marginBottom: '1rem', borderBottom: '2px solid var(--status-pos)', paddingBottom: '0.5rem' }}>
                Top Positive Reviews
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {posReviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
                {posReviews.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No positive reviews found.</p>}
              </div>
            </div>
            
            <div>
              <h4 style={{ color: 'var(--status-neg)', marginBottom: '1rem', borderBottom: '2px solid var(--status-neg)', paddingBottom: '0.5rem' }}>
                Top Negative Reviews
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {negReviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
                {negReviews.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No negative reviews found.</p>}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg-card)',
                border: 'none',
                padding: '0.75rem 2.5rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              View All Reviews
            </button>
          </div>
        </div>

        <ReviewChatbot product={product} />

        {/* Modal for Business View is identical to Consumer view */}
        {showModal && (
          <ReviewModal 
            reviews={allReviews} 
            onClose={() => setShowModal(false)}
            product={product}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-medium)', paddingTop: '2rem' }}>
       {/* CONSUMER INSIGHT STRUCTURE */}
       <div style={{ marginBottom: '4rem' }}>
         <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
           Consumer Insight
         </h3>

         {insightLoading && (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
             Generating AI insights from real reviews...
           </div>
         )}

         {insightError && !insightLoading && (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-neg)', background: 'var(--bg-subtle)', border: '1px solid var(--status-neg)', borderRadius: '12px' }}>
             <p style={{ margin: 0 }}>{insightError}</p>
           </div>
         )}

         {insightData && !insightLoading && (
           <>
             {/* 1. SUMMARY */}
             <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
               <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Summary</h4>
               <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1rem' }}>{insightData.summary}</p>
             </div>

             {/* 2 & 3. STRENGTHS & CONCERNS */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
               <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderTop: '3px solid var(--status-pos)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Strengths</h4>
                 <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                   {insightData.strengths && insightData.strengths.map((item, idx) => (
                     <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                   ))}
                   {(!insightData.strengths || insightData.strengths.length === 0) && <li>No specific strengths identified.</li>}
                 </ul>
               </div>
               
               <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderTop: '3px solid var(--status-neg)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Concerns</h4>
                 <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                   {insightData.concerns && insightData.concerns.map((item, idx) => (
                     <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                   ))}
                   {(!insightData.concerns || insightData.concerns.length === 0) && <li>No specific concerns identified.</li>}
                 </ul>
               </div>
             </div>

             {/* 4 & 5. APPRECIATED & PURCHASE CONSIDERATIONS */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
               <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Highly Appreciated</h4>
                 <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                   {insightData.appreciated && insightData.appreciated.map((item, idx) => (
                     <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                   ))}
                   {(!insightData.appreciated || insightData.appreciated.length === 0) && <li>No specific appreciated features identified.</li>}
                 </ul>
               </div>

               <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                 <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Purchase Considerations</h4>
                 <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                   {insightData.purchase_considerations && insightData.purchase_considerations.map((item, idx) => (
                     <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
                   ))}
                   {(!insightData.purchase_considerations || insightData.purchase_considerations.length === 0) && <li>No specific considerations identified.</li>}
                 </ul>
               </div>
             </div>
           </>
         )}
       </div>

       {/* Top Row: Charts */}
       <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          
          {/* Sentiment Donut */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Sentiment Distribution</h4>
            <div style={{ position: 'relative', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={95} 
                    paddingAngle={3} 
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Total Count */}
              <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                pointerEvents: 'none' 
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>{totalReviews}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px', fontWeight: '600' }}>Total Reviews</div>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
               {pieData.map(entry => (
                 <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                   <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: COLORS[entry.name] }}></div>
                   <span style={{ fontWeight: '500' }}>{entry.name}: <strong style={{ color: 'var(--text-primary)' }}>{entry.value}</strong></span>
                 </div>
               ))}
            </div>
          </div>

          {/* Keywords Bar */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Top Meaningful Terms</h4>
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={keywords} layout="vertical" margin={{ top: 5, right: 35, left: 0, bottom: 5 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="var(--border-medium)" strokeOpacity={0.4} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="word" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 13, fontWeight: 600, fill: 'var(--text-primary)' }} 
                    width={90} 
                  />
                  <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} content={<CustomBarTooltip />} />
                  <Bar dataKey="count" fill="var(--text-primary)" radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="count" position="right" style={{ fontSize: 13, fontWeight: 700, fill: 'var(--text-secondary)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

       </div>

       {/* Historical Trends Dashboard */}
       {enrichedTrends.length > 0 && (
         <div style={{ marginBottom: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
           <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>Historical Trends</h4>
           
           {/* Full row for Sentiment Trend */}
           <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
             <h5 style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Sentiment Trend Over Time</h5>
             <div style={{ height: '260px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={enrichedTrends} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-medium)" strokeOpacity={0.4} />
                   <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dy={10} />
                   <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                   <RechartsTooltip content={<CustomTrendTooltip suffix="%" />} />
                   <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '20px' }} iconType="circle" />
                   <Line type="monotone" dataKey="Positive" name="Positive %" stroke="var(--status-pos)" strokeWidth={3} dot={{ r: 4, fill: 'var(--status-pos)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                   <Line type="monotone" dataKey="Neutral" name="Neutral %" stroke="var(--status-neu)" strokeWidth={3} dot={{ r: 4, fill: 'var(--status-neu)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                   <Line type="monotone" dataKey="Negative" name="Negative %" stroke="var(--status-neg)" strokeWidth={3} dot={{ r: 4, fill: 'var(--status-neg)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Half rows for Rating & Volume */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
             {/* Rating Trend */}
             <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
               <h5 style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Average Rating Trend</h5>
               <div style={{ height: '220px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={enrichedTrends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-medium)" strokeOpacity={0.4} />
                     <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dy={10} />
                     <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} domain={['auto', 5]} />
                     <RechartsTooltip content={<CustomTrendTooltip />} />
                     <Line type="monotone" dataKey="average_rating" name="Avg Rating" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: '#fbbf24', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>

             {/* Volume Bar Chart */}
             <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
               <h5 style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>Daily Review Volume</h5>
               <div style={{ height: '220px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={enrichedTrends} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-medium)" strokeOpacity={0.4} />
                     <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dy={10} />
                     <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                     <RechartsTooltip content={<CustomTrendTooltip />} />
                     <Bar dataKey="volume" name="Review Count" fill="var(--text-primary)" radius={[4, 4, 0, 0]} barSize={24} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Reviews Section */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
          <div>
            <h4 style={{ color: 'var(--status-pos)', marginBottom: '1rem', borderBottom: '2px solid var(--status-pos)', paddingBottom: '0.5rem' }}>
              Top Positive Reviews
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posReviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
              {posReviews.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No positive reviews found.</p>}
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--status-neg)', marginBottom: '1rem', borderBottom: '2px solid var(--status-neg)', paddingBottom: '0.5rem' }}>
              Top Negative Reviews
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {negReviews.map(r => <ReviewCard key={r.review_id} review={r} />)}
              {negReviews.length === 0 && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No negative reviews found.</p>}
            </div>
          </div>
       </div>

       {/* View All Button */}
       <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-card)',
              border: 'none',
              padding: '0.75rem 2.5rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: 'var(--shadow-md)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            VIEW ALL REVIEWS
          </button>
       </div>

       <ReviewChatbot product={product} />

       {showModal && (
         <ReviewModal reviews={allReviews} onClose={(e) => { e.stopPropagation(); setShowModal(false); }} product={product} />
       )}
    </div>
  );
}

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '6px', padding: '0.5rem 0.75rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: payload[0].payload.fill }} />
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{payload[0].name}</span>
          <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '6px', padding: '0.75rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', textTransform: 'capitalize' }}>
          {payload[0].payload.word}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Count: <strong style={{ color: 'var(--text-primary)' }}>{payload[0].value}</strong>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTrendTooltip = ({ active, payload, label, suffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '6px', padding: '0.75rem', boxShadow: 'var(--shadow-md)', minWidth: '150px' }}>
        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '4px' }}>
          {label}
        </div>
        {payload.map((p, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
              <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
            </div>
            <strong style={{ color: 'var(--text-primary)' }}>{p.value}{suffix}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ReviewCard({ review }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ color: '#fbbf24', fontSize: '1.1rem', letterSpacing: '1px', lineHeight: 1 }}>
            {'★'.repeat(Math.floor(review.star_rating))}{'☆'.repeat(5 - Math.floor(review.star_rating))}
          </div>
          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {review.review_title || 'Review'}
          </div>
        </div>
        <span style={{ 
          background: 'var(--bg-subtle)', 
          padding: '0.25rem 0.5rem', 
          borderRadius: '4px', 
          fontSize: '0.65rem', 
          fontWeight: '600',
          textTransform: 'uppercase', 
          color: 'var(--text-secondary)' 
        }}>
          {review.source_platform}
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 0.75rem 0', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {review.review_text?.length > 180 ? review.review_text.substring(0, 180) + '...' : review.review_text}
      </p>
      {review.review_date && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{review.review_date}</div>
      )}
    </div>
  );
}

function ReviewModal({ reviews, onClose, product }) {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-page)',
          width: '100%',
          maxWidth: '1000px',
          height: '85vh',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden'
        }}
      >
        <div style={{ 
          padding: '1.5rem 2rem', 
          background: 'var(--bg-card)', 
          borderBottom: '1px solid var(--border-medium)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{product.name} Reviews</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Showing all {reviews.length} authenticated reviews across platforms</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              fontSize: '2rem', 
              cursor: 'pointer', 
              color: 'var(--text-tertiary)',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>
        
        <div style={{ 
          padding: '2rem', 
          overflowY: 'auto', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem' 
        }}>
          {reviews.map(r => (
            <div key={r.review_id} style={{ 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-light)', 
              borderRadius: '8px', 
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#fbbf24', fontSize: '1.1rem', letterSpacing: '1px' }}>
                  {'★'.repeat(Math.floor(r.star_rating))}{'☆'.repeat(5 - Math.floor(r.star_rating))}
                </span>
                <span style={{ 
                  background: 'var(--bg-subtle)', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '4px', 
                  fontSize: '0.7rem', 
                  fontWeight: '600',
                  textTransform: 'uppercase', 
                  color: 'var(--text-secondary)' 
                }}>
                  {r.source_platform}
                </span>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>{r.review_title}</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{r.review_text}</p>
              {r.review_date && (
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{r.review_date}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewChatbot({ product }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await askChatbot(product.id, query);
      setAnswer(res.answer);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to get an answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        AI Review Intelligence
      </h3>
      <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Ask any question about the {product.name} based on its reviews.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="e.g. How is the battery experience?" 
          style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !query.trim()} 
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-card)', fontWeight: '700', cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer', opacity: (loading || !query.trim()) ? 0.7 : 1 }}
        >
          {loading ? 'Asking...' : 'Ask AI'}
        </button>
      </form>

      {error && (
        <div style={{ padding: '1rem', color: 'var(--status-neg)', background: 'rgba(220,38,38,0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {answer && (
        <div style={{ padding: '1.25rem', background: 'var(--bg-subtle)', borderRadius: '8px', borderLeft: '4px solid var(--text-primary)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Answer:</h4>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
