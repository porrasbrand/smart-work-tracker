import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function SubmitPreview() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetchPreview();
  }, []);

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

  const handleSubmit = async (dryRun = false) => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const res = await apiClient.post('/segments/submit-approved', { dryRun });
      setSubmitResult(res.data);

      // If actual submission succeeded, refresh preview
      if (!dryRun && res.data.success) {
        setTimeout(() => {
          fetchPreview();
          setSubmitResult(null);
        }, 3000);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Submit Buttons */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {submitting ? 'Testing...' : 'Test Submit (Dry Run)'}
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {submitting ? 'Submitting...' : '✓ Submit to ActiveCollab'}
        </button>
      </div>

      {/* Submit Result */}
      {submitResult && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-medium">
            {submitResult.dryRun ? '✓ Dry Run Complete' : '✓ Successfully Submitted!'}
          </div>
          <div className="text-sm text-green-700 mt-2">
            {submitResult.dryRun ? (
              <>
                Would submit {submitResult.result.skipped} segments totaling {submitResult.result.totalHours} hours.
                <br />
                <span className="text-xs">No changes made (this was a test).</span>
              </>
            ) : (
              <>
                Submitted {submitResult.result.submitted} segments ({submitResult.result.totalHours} hours) to ActiveCollab.
                {submitResult.result.failed > 0 && (
                  <span className="text-red-600"> Failed: {submitResult.result.failed}</span>
                )}
                <br />
                <span className="text-xs">Refreshing preview in 3 seconds...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submit Error */}
      {submitError && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 font-medium">Submission Failed</div>
          <div className="text-red-500 text-sm mt-1">{submitError}</div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <strong>Note:</strong> "Test Submit" previews without making changes. "Submit to ActiveCollab" will actually create time records and lock these segments.
        </div>
      </div>
    </div>
  );
}
