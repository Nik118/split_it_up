import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s (token expiry)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto logout if token expires
      localStorage.removeItem('access_token');
      // Quick way to refresh state to login screen
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
