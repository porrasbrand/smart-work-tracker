import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function useSegments(filters = {}) {
  const [segments, setSegments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const res = await apiClient.get(`/segments?${params}`);
      setSegments(res.data.segments);
      setTotal(res.data.total);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [JSON.stringify(filters)]);

  return { segments, total, loading, error, refetch: fetchSegments };
}
