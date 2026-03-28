"use client";

import { useEffect, useState } from "react";

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface TeamMembersProps {
  orgId: string;
}

export function TeamMembers({ orgId }: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const response = await fetch(`/api/organizations/${orgId}/members`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setMembers(data.members || []);
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [orgId]);

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;

    try {
      await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-4">Email</th>
            <th className="text-left py-2 px-4">Role</th>
            <th className="text-left py-2 px-4">Joined</th>
            <th className="text-left py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4">{member.email}</td>
              <td className="py-2 px-4 capitalize">{member.role}</td>
              <td className="py-2 px-4">{new Date(member.joinedAt).toLocaleDateString()}</td>
              <td className="py-2 px-4">
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
