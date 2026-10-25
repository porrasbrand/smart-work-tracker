import React from 'react';
import { useProjects } from '../hooks/useProjects';

export function FilterBar({ filters, onChange }) {
  const { projects, loading: projectsLoading } = useProjects();

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="skipped">Skipped</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={filters.project_id || ''}
            onChange={(e) => handleChange('project_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={projectsLoading}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.activecollab_project_name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search task description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={filters.sort || 'date'}
            onChange={(e) => handleChange('sort', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Date</option>
            <option value="duration">Duration</option>
            <option value="confidence">Confidence</option>
          </select>
        </div>
      </div>
    </div>
  );
}
