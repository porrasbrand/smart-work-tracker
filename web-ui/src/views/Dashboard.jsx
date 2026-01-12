import React from 'react';
import { useStats } from '../hooks/useStats';

export function Dashboard() {
  const { stats, loading, error } = useStats();

  // Get billing rate from environment (OpenAI feedback #6)
  const billingRate = parseFloat(import.meta.env.VITE_BILLING_RATE_DEFAULT) || 100;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 font-medium">Error loading statistics</div>
        <div className="text-red-500 text-sm mt-1">{error.message}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Segments"
          value={stats.total_segments}
        />
        <StatCard
          label="Pending Hours"
          value={stats.total_hours_pending}
          format="hours"
        />
        <StatCard
          label="Approved Hours"
          value={stats.total_hours_approved}
          format="hours"
        />
        <StatCard
          label="Billable Amount"
          value={stats.billable_amount}
          format="currency"
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Pending"
          value={stats.pending}
          className="bg-gray-50"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          className="bg-green-50"
        />
        <StatCard
          label="Skipped"
          value={stats.skipped}
          className="bg-yellow-50"
        />
        <StatCard
          label="Submitted"
          value={stats.submitted}
          className="bg-blue-50"
        />
      </div>

      {/* By Project */}
      <h2 className="text-xl font-semibold mb-4">Hours by Project</h2>
      {stats.by_project && stats.by_project.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segments
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.by_project.map(proj => (
                <tr key={proj.project_id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{proj.project_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{proj.segment_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{proj.total_hours.toFixed(2)}h</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {proj.avg_confidence ? (proj.avg_confidence * 100).toFixed(0) + '%' : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-500">No project data available.</div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, format, suffix, className = '' }) {
  const formatted = format === 'hours' ? `${value?.toFixed(2) || 0}h`
    : format === 'currency' ? `$${value?.toFixed(2) || 0}`
    : value + (suffix || '');

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-2">{formatted}</div>
    </div>
  );
}
