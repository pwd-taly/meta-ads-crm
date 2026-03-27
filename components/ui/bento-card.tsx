"use client";
import { Users, TrendingUp, DollarSign, Calendar, MessageCircle, Zap, ArrowUpRight } from "lucide-react";

export default function BentoCard() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full max-w-3xl">

      {/* ── Hero cell — spans 2 cols × 2 rows ── */}
      <div className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-[#060612] p-6 flex flex-col justify-between text-white">
        {/* background glow */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-sky-400/10 rounded-full blur-[60px] pointer-events-none" />

        {/* logo badge */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl btn-gradient flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Meta Ads CRM</p>
            <p className="text-white/40 text-[10px]">Lead Management</p>
          </div>
        </div>

        {/* big stat */}
        <div className="relative">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Total Pipeline Value</p>
          <p className="text-5xl font-black tracking-tight">$0</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> 0% this week
            </span>
            <span className="text-white/30 text-xs">from closed deals</span>
          </div>
        </div>

        {/* mini pipeline bar */}
        <div className="relative space-y-2">
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">Lead Pipeline</p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex gap-0.5">
            <div className="w-[40%] h-full bg-blue-500 rounded-full" />
            <div className="w-[25%] h-full bg-amber-400 rounded-full" />
            <div className="w-[15%] h-full bg-violet-500 rounded-full" />
            <div className="w-[12%] h-full bg-emerald-500 rounded-full" />
            <div className="w-[8%] h-full bg-red-400 rounded-full" />
          </div>
          <div className="flex gap-3">
            {[
              { label: "New",       color: "bg-blue-500" },
              { label: "Contacted", color: "bg-amber-400" },
              { label: "Booked",    color: "bg-violet-500" },
              { label: "Closed",    color: "bg-emerald-500" },
              { label: "Lost",      color: "bg-red-400" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                <span className="text-white/40 text-[10px]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Total Leads ── */}
      <div className="rounded-3xl bg-white border border-border/60 p-5 flex flex-col justify-between shadow-sm card-hover">
        <div className="w-9 h-9 rounded-xl icon-blue flex items-center justify-center">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">0</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Total Leads</p>
        </div>
      </div>

      {/* ── Appointments ── */}
      <div className="rounded-3xl bg-white border border-border/60 p-5 flex flex-col justify-between shadow-sm card-hover">
        <div className="w-9 h-9 rounded-xl icon-purple flex items-center justify-center">
          <Calendar className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">0</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Appointments</p>
        </div>
      </div>

      {/* ── Revenue ── */}
      <div className="rounded-3xl bg-white border border-border/60 p-5 flex flex-col justify-between shadow-sm card-hover">
        <div className="w-9 h-9 rounded-xl icon-green flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">$0</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Revenue Closed</p>
        </div>
      </div>

      {/* ── WhatsApp cell ── */}
      <div className="rounded-3xl bg-[#25D366] p-5 flex flex-col justify-between shadow-sm card-hover overflow-hidden relative">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-white/10 rounded-full" />
        <MessageCircle className="w-7 h-7 text-white relative" />
        <div className="relative">
          <p className="text-white font-black text-sm leading-tight">1-click<br />WhatsApp</p>
          <p className="text-white/60 text-[10px] mt-0.5">EN + ES templates</p>
        </div>
      </div>

      {/* ── Ad Spend cell ── */}
      <div className="rounded-3xl bg-white border border-border/60 p-5 flex flex-col justify-between shadow-sm card-hover">
        <div className="w-9 h-9 rounded-xl icon-orange flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-orange-500" />
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight">$0</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Ad Spend</p>
        </div>
      </div>

    </div>
  );
}
