import React, { useState } from 'react';
import { useSegments } from '../hooks/useSegments';
import { useProjects } from '../hooks/useProjects';
import { SegmentCard } from '../components/SegmentCard';
import { FilterBar } from '../components/FilterBar';
import { BatchActions } from '../components/BatchActions';

export function SegmentList() {
  const [filters, setFilters] = useState({ status: 'pending', limit: 50 });
  const [selected, setSelected] = useState([]);
  const { segments, total, loading, error, refetch } = useSegments(filters);
  const { projects } = useProjects();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading segments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-600 font-medium">Error loading segments</div>
        <div className="text-red-500 text-sm mt-1">{error.message}</div>
      </div>
    );
  }

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />

      {selected.length > 0 && (
        <BatchActions
          selected={selected}
          onComplete={() => {
            setSelected([]);
            refetch();
          }}
        />
      )}

      {segments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-500">No segments found matching your filters.</div>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500">
            Showing {segments.length} of {total} segments
          </div>
          <div className="space-y-4">
            {segments.map(seg => (
              <SegmentCard
                key={seg.id}
                segment={seg}
                projects={projects}
                selected={selected.includes(seg.id)}
                onSelect={(id) => setSelected(prev =>
                  prev.includes(id)
                    ? prev.filter(x => x !== id)
                    : [...prev, id]
                )}
                onUpdate={refetch}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
