"use client";

import { useState } from "react";

interface FilterOptions {
  status?: string[];
  campaign?: string;
  minScore?: number;
  maxScore?: number;
}

interface AdvancedFilterSidebarProps {
  onFilter: (options: FilterOptions) => void;
  campaigns?: Array<{ id: string; name: string }>;
}

export function AdvancedFilterSidebar({
  onFilter,
  campaigns = [],
}: AdvancedFilterSidebarProps) {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [campaign, setCampaign] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);

  const handleApplyFilters = () => {
    onFilter({
      status: statuses.length > 0 ? statuses : undefined,
      campaign: campaign || undefined,
      minScore: minScore > 0 ? minScore : undefined,
      maxScore: maxScore < 100 ? maxScore : undefined,
    });
  };

  const handleReset = () => {
    setStatuses([]);
    setCampaign("");
    setMinScore(0);
    setMaxScore(100);
    onFilter({});
  };

  const toggleStatus = (status: string) => {
    setStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  return (
    <div className="w-64 bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="font-semibold text-lg mb-4">Filters</h3>

      {/* Status Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Status</label>
        <div className="space-y-2">
          {["new", "contacted", "booked", "closed", "lost"].map((status) => (
            <label key={status} className="flex items-center">
              <input
                type="checkbox"
                checked={statuses.includes(status)}
                onChange={() => toggleStatus(status)}
                className="w-4 h-4"
              />
              <span className="ml-2 text-sm capitalize">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Campaign Filter */}
      {campaigns.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Campaign</label>
          <select
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="w-full px-3 py-2 border rounded text-sm"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* AI Score Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">AI Score Range</label>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-600">Min: {minScore}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Max: {maxScore}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={maxScore}
              onChange={(e) => setMaxScore(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleApplyFilters}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
