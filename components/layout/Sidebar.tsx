"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings, Users, Zap, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/ads", label: "Ads", icon: Megaphone },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-60 border-r border-border bg-background h-screen overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-4 flex items-center gap-3 border-b border-white/[0.06]">
        <div className="btn-gradient rounded-lg p-2">
          <Zap size={18} className="text-white" />
        </div>
        <span className="font-bold text-white text-sm">Meta Ads</span>
      </div>
      <nav className="flex flex-col p-6 gap-2 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium",
                isActive
                  ? "nav-active text-white rounded-r-xl"
                  : "text-text-secondary hover:bg-surface/50 hover:text-text-primary"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
