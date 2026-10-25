import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error interceptor for standardized error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.data?.error) {
      // Backend returned standardized error
      return Promise.reject(error.response.data.error);
    }
    // Network or other error
    return Promise.reject({
      code: 'NETWORK_ERROR',
      message: error.message || 'Network request failed'
    });
  }
);
