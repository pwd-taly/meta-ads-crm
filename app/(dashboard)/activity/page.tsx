import { ActivityLog } from "@/components/activity/ActivityLog";
import { headers } from "next/headers";

export default function ActivityPage() {
  // Get orgId from headers (injected by middleware)
  const headersList = headers();
  const orgId = headersList.get("x-org-id") || "";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Activity Log</h1>
      <ActivityLog orgId={orgId} />
    </div>
  );
}
