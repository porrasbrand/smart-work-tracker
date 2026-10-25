import React, { useState } from 'react';
import { apiClient } from '../api/client';

export function BatchActions({ selected, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBatchApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/segments/batch-approve', {
        segment_ids: selected
      });
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to approve segments');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSkip = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/segments/batch-skip', {
        segment_ids: selected
      });
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to skip segments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          {selected.length} segment{selected.length !== 1 ? 's' : ''} selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBatchApprove}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Approve All'}
          </button>
          <button
            onClick={handleBatchSkip}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Skip All'}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
}
