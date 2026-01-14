import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { formatDuration, formatDate } from '../utils/formatters';
import { safeJsonParse } from '../utils/safeJsonParse';

export function SegmentCard({ segment, selected, onSelect, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [taskDesc, setTaskDesc] = useState(segment.task_description);
  const [adjustedMinutes, setAdjustedMinutes] = useState(segment.adjusted_duration_minutes);
  const [error, setError] = useState(null);

  // Safe JSON parsing (OpenAI feedback #5)
  const taskContext = safeJsonParse(segment.task_context, {});
  const taskSummary = taskContext.taskSummaries?.[0]?.substring(0, 100);

  const handleApprove = async () => {
    try {
      await apiClient.post(`/segments/${segment.id}/approve`);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSkip = async () => {
    try {
      await apiClient.post(`/segments/${segment.id}/skip`);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    try {
      await apiClient.patch(`/segments/${segment.id}`, {
        task_description: taskDesc,
        adjusted_duration_minutes: parseInt(adjustedMinutes, 10)
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const isSubmitted = segment.approval_status === 'submitted';

  return (
    <div className={`
      bg-white rounded-lg shadow p-4
      ${selected ? 'ring-2 ring-blue-500' : ''}
      ${isSubmitted ? 'opacity-60' : ''}
    `}>
      {error && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(segment.id)}
            disabled={isSubmitted}
            className="mt-1"
          />

          <div className="flex-1">
            {/* Date & Duration */}
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span>{formatDate(segment.start_time)} •</span>
              <span>Original: {formatDuration(segment.duration_minutes)} →</span>
              {editing ? (
                <div className="flex items-center gap-1">
                  <span>Adjusted:</span>
                  <input
                    type="number"
                    value={adjustedMinutes}
                    onChange={(e) => setAdjustedMinutes(e.target.value)}
                    min="1"
                    max="600"
                    className="w-16 border rounded px-2 py-0.5 text-sm"
                  />
                  <span>min ({formatDuration(adjustedMinutes)})</span>
                </div>
              ) : (
                <span>Adjusted: {formatDuration(segment.adjusted_duration_minutes)}</span>
              )}
            </div>

            {/* Project */}
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {segment.project_name || 'Unattributed'}
              </span>
              {segment.confidence_score && (
                <span className="ml-2 text-xs text-gray-500">
                  {(segment.confidence_score * 100).toFixed(0)}% confident
                </span>
              )}
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                segment.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                segment.approval_status === 'skipped' ? 'bg-yellow-100 text-yellow-800' :
                segment.approval_status === 'submitted' ? 'bg-gray-100 text-gray-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {segment.approval_status}
              </span>
            </div>

            {/* Task Description */}
            <div className="mt-2">
              {editing ? (
                <input
                  type="text"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  maxLength={500}
                  className="w-full border rounded px-2 py-1"
                  autoFocus
                />
              ) : (
                <p className="text-gray-900">
                  {segment.task_description || 'Development work'}
                </p>
              )}
            </div>

            {/* Task Context Summary */}
            {taskSummary && (
              <div className="mt-2 text-xs text-gray-500">
                {taskSummary}...
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {isSubmitted ? (
            <span className="text-xs text-gray-500">Submitted</span>
          ) : editing ? (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setTaskDesc(segment.task_description);
                  setAdjustedMinutes(segment.adjusted_duration_minutes);
                }}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Edit
              </button>
              <button
                onClick={handleApprove}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Approve
              </button>
              <button
                onClick={handleSkip}
                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
              >
                Skip
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
