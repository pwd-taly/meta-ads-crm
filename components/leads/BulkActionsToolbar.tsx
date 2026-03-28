"use client";

import { useState } from "react";

interface BulkActionsToolbarProps {
  count: number;
  onChangeStatus: (status: string) => void;
  onDelete: () => void;
  isLoading?: boolean;
}

export function BulkActionsToolbar({
  count,
  onChangeStatus,
  onDelete,
  isLoading = false,
}: BulkActionsToolbarProps) {
  const [status, setStatus] = useState("new");

  if (count === 0) return null;

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
      <div className="text-sm font-medium">
        {count} lead{count !== 1 ? "s" : ""} selected
      </div>

      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="booked">Booked</option>
          <option value="closed">Closed</option>
          <option value="lost">Lost</option>
        </select>

        <button
          onClick={() => onChangeStatus(status)}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Change Status
        </button>

        <button
          onClick={onDelete}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
