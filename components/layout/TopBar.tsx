"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrgAccountSwitcher } from "@/components/org/OrgAccountSwitcher";

export function TopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="border-b border-border bg-background h-14 flex items-center justify-between px-8">
      <div className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
        Meta Ads CRM
      </div>
      <div className="flex items-center gap-4">
        <OrgAccountSwitcher />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1]">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <span className="text-xs text-text-secondary">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
        >
          <LogOut size={18} />
          Logout
        </Button>
      </div>
    </header>
  );
}
