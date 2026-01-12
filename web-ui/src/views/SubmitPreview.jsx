import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function SubmitPreview() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await apiClient.get('/submit/preview?status=approved');
        setPreview(res.data);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 font-medium">Error loading preview</div>
        <div className="text-red-500 text-sm mt-1">{error.message}</div>
      </div>
    );
  }

  if (!preview || preview.segment_count === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Submit Preview</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-500">No approved segments ready for submission.</div>
          <div className="text-sm text-gray-400 mt-2">
            Approve some segments first to see them here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Submit Preview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Segments to Submit</div>
          <div className="text-2xl font-bold mt-2">{preview.segment_count}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold mt-2">{preview.total_hours.toFixed(2)}h</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">Total Billable</div>
          <div className="text-2xl font-bold mt-2">${preview.total_billable.toFixed(2)}</div>
        </div>
      </div>

      {/* Segments to Submit */}
      <h2 className="text-xl font-semibold mb-4">Segments Ready for ActiveCollab</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {preview.segments_to_submit.map(seg => (
              <tr key={seg.segment_id}>
                <td className="px-6 py-4 text-sm text-gray-900">{seg.project_name}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{seg.task_name}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{seg.date}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{seg.hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <strong>Note:</strong> This is a preview of what will be submitted to ActiveCollab.
          Actual submission happens in Phase 6.
        </div>
      </div>
    </div>
  );
}
