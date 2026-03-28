"use client";

import { useState } from "react";

interface MetaAccountFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function MetaAccountForm({ orgId, onSuccess }: MetaAccountFormProps) {
  const [token, setToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [pageId, setPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${orgId}/meta-accounts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metaAccessToken: token,
            metaAdAccountId: adAccountId,
            metaPageId: pageId,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to add account");

      setMessage("Meta account added!");
      setToken("");
      setAdAccountId("");
      setPageId("");
      onSuccess?.();
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Meta Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
          placeholder="your_meta_access_token"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Ad Account ID</label>
        <input
          type="text"
          value={adAccountId}
          onChange={(e) => setAdAccountId(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
          placeholder="act_1234567890"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Page ID (optional)</label>
        <input
          type="text"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="123456789"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Meta Account"}
      </button>

      {message && <div className="text-sm text-green-600">{message}</div>}
    </form>
  );
}
