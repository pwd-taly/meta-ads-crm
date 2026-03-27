"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="border-b border-border bg-background h-14 flex items-center justify-between px-8">
      <div className="text-sm text-text-secondary">
        Meta Ads CRM
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
    </header>
  );
}
