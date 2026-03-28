"use client";

import { useEffect, useState } from "react";

interface Activity {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  metadata?: any;
}

interface ActivityLogProps {
  orgId: string;
}

export function ActivityLog({ orgId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch(`/api/organizations/${orgId}/activity-log`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [orgId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="p-4 border rounded bg-white hover:bg-gray-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium capitalize">{activity.action}</p>
              <p className="text-sm text-gray-600">User: {activity.userId}</p>
            </div>
            <p className="text-sm text-gray-500">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
          {activity.metadata && (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(activity.metadata, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
