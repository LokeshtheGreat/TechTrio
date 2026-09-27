import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

const cache = new Map();

const fetchWithCache = async (key, fetcher) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const promise = fetcher().then(res => {
    // Replace the promise in the cache with the resolved data
    // so future calls can resolve immediately instead of awaiting
    cache.set(key, Promise.resolve(res));
    return res;
  }).catch(err => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  return promise;
};

export const fetchProducts = async () => {
    return [
      { id: 'apple_iphone_17', name: 'Apple iPhone 17', image: '/products/iphone-17.jpg', tag: 'Premium Flagship' },
      { id: 'samsung_galaxy_s26_ultra_5g', name: 'Samsung Galaxy S26 Ultra 5G', image: '/products/galaxy-s26-ultra.jpg', tag: 'Android King' },
      { id: 'redmi_15_5g', name: 'Redmi 15 5G', image: '/products/redmi-15-5g.jpg', tag: 'Budget Performer' },
      { id: 'oneplus_13s_5g', name: 'OnePlus 13s 5G', image: '/products/oneplus-13s-5g.jpg', tag: 'Flagship Killer' },
      { id: 'vivo_v70_5g', name: 'vivo V70 5G', image: '/products/vivo-v70-5g.jpg', tag: 'Camera Focus' }
    ];
};

export const fetchAnalyticsOverview = async (productId) => {
  const response = await api.get(`/analytics/${productId}`);
  return response.data;
};

export const fetchAnalyticsAspects = async (productId) => {
  const response = await api.get(`/analytics/${productId}/aspects`);
  return response.data;
};

export const fetchAnalyticsKeywords = async (productId) => {
  return fetchWithCache(`/analytics/${productId}/keywords`, async () => {
    const response = await api.get(`/analytics/${productId}/keywords`);
    return response.data;
  });
};

export const fetchAnalyticsTrends = async (productId) => {
  return fetchWithCache(`/analytics/${productId}/trends`, async () => {
    const response = await api.get(`/analytics/${productId}/trends`);
    return response.data;
  });
};

export const fetchComparisonAnalytics = async () => {
  const response = await api.get(`/analytics/comparison`);
  return response.data;
};

export const fetchReviews = async (productId, source = 'all', limit = 10, sentiment = null) => {
  const key = `/products/${productId}/reviews?source=${source}&limit=${limit}&sentiment=${sentiment || ''}`;
  return fetchWithCache(key, async () => {
    const params = { limit };
    if (source !== 'all') params.source = source;
    if (sentiment) params.sentiment = sentiment; // If backend supports it, else we filter in frontend for now.
    const response = await api.get(`/products/${productId}/reviews`, { params });
    return response.data;
  });
};

export const getScrapeStatus = async () => {
  const response = await api.get('/scrape/status');
  return response.data;
};

export const triggerBatchScrape = async () => {
  const response = await api.post('/scrape');
  return response.data;
};

export const fetchBusinessInsight = async (productId) => {
  return fetchWithCache(`/analytics/${productId}/business-insight`, async () => {
    const response = await api.get(`/analytics/${productId}/business-insight`);
    return response.data;
  });
};

export const fetchConsumerInsight = async (productId) => {
  return fetchWithCache(`/analytics/${productId}/consumer-insight`, async () => {
    const response = await api.get(`/analytics/${productId}/consumer-insight`);
    return response.data;
  });
};

export const askChatbot = async (productId, query) => {
  const response = await api.post('/query', { product_id: productId, query: query });
  return response.data;
};
