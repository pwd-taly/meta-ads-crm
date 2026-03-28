"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MetaAccount {
  id: string;
  metaAdAccountId: string;
  metaAccessToken: string; // Don't expose in real app
}

interface CurrentOrg {
  orgId: string;
  orgName: string;
  accounts: MetaAccount[];
  selectedAccountId?: string;
}

export function OrgAccountSwitcher() {
  const router = useRouter();
  const [org, setOrg] = useState<CurrentOrg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrg() {
      try {
        const response = await fetch("/api/organizations/current");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setOrg(data);
      } catch (error) {
        console.error("Error fetching org:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrg();
  }, []);

  if (loading) {
    return <div className="h-10 bg-gray-200 animate-pulse rounded" />;
  }

  if (!org) {
    return null;
  }

  const handleAccountSwitch = async (accountId: string) => {
    try {
      await fetch("/api/organizations/switch-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      router.refresh();
    } catch (error) {
      console.error("Error switching account:", error);
    }
  };

  return (
    <div className="flex gap-2">
      <select
        defaultValue={org.selectedAccountId}
        onChange={(e) => handleAccountSwitch(e.target.value)}
        className="px-3 py-2 border rounded text-sm"
      >
        <optgroup label={org.orgName}>
          {org.accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              Account {acc.metaAdAccountId}
            </option>
          ))}
        </optgroup>
      </select>

      <a
        href="/settings#accounts"
        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
      >
        + Add Account
      </a>
    </div>
  );
}
