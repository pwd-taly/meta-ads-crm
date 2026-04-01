"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@prisma/client";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WhatsAppButton } from "@/components/leads/WhatsAppButton";

interface Props {
  initialLeads: Lead[];
  waTemplate: string;
  waTemplateEs: string;
  onLeadUpdated?: (id: string, status: string) => void;
}

type ColumnId = "new" | "contacted" | "booked" | "closed" | "lost";

const COLUMNS: { id: ColumnId; label: string; dot: string; border: string }[] = [
  { id: "new",       label: "New",       dot: "bg-indigo-400", border: "border-indigo-500/30" },
  { id: "contacted", label: "Contacted", dot: "bg-blue-400",   border: "border-blue-500/30"  },
  { id: "booked",    label: "Booked",    dot: "bg-purple-400", border: "border-purple-500/30"},
  { id: "closed",    label: "Closed",    dot: "bg-green-400",  border: "border-green-500/30" },
  { id: "lost",      label: "Lost",      dot: "bg-zinc-400",   border: "border-zinc-500/30"  },
];

function formatPipelineValue(total: number): string {
  if (total === 0) return "$0";
  if (total >= 1000) return `$${(total / 1000).toFixed(1)}k`;
  return `$${total}`;
}

function scoreColor(score: number): string {
  if (score > 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  lead: Lead;
  waTemplate: string;
  waTemplateEs: string;
  isDragging?: boolean;
}

function KanbanCard({ lead, waTemplate, waTemplateEs, isDragging }: CardProps) {
  const score = lead.aiScore;

  return (
    <div
      className={`group relative p-3 rounded-xl border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.06] transition-colors ${
        isDragging ? "opacity-50 shadow-xl ring-1 ring-white/10" : ""
      }`}
    >
      {/* Drag handle */}
      <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </span>

      <p className="font-semibold text-sm text-white pr-5 leading-tight">{lead.name}</p>

      {lead.campaignName && (
        <p className="text-xs text-zinc-500 mt-0.5 truncate">{lead.campaignName}</p>
      )}

      {score != null && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreColor(score)} transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 tabular-nums w-6 text-right">{score}</span>
          </div>
        </div>
      )}

      {lead.phone && (
        <p className="text-xs text-zinc-500 mt-1.5">{lead.phone}</p>
      )}

      <div className="flex items-center gap-1.5 mt-2.5">
        {lead.phone && (
          <WhatsAppButton
            phone={lead.phone}
            name={lead.name}
            template={waTemplate}
            templateEs={waTemplateEs}
            size="sm"
          />
        )}
        <Link
          href={`/leads/${lead.id}`}
          className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
}

// ─── Sortable card wrapper ───────────────────────────────────────────────────

function SortableCard({
  lead,
  waTemplate,
  waTemplateEs,
}: {
  lead: Lead;
  waTemplate: string;
  waTemplateEs: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        lead={lead}
        waTemplate={waTemplate}
        waTemplateEs={waTemplateEs}
        isDragging={isDragging}
      />
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  leads,
  waTemplate,
  waTemplateEs,
}: {
  col: (typeof COLUMNS)[number];
  leads: Lead[];
  waTemplate: string;
  waTemplateEs: string;
}) {
  const pipelineTotal = leads.reduce((sum, l) => sum + (l.saleAmount ?? 0), 0);

  return (
    <div
      className={`flex-none w-[280px] flex flex-col rounded-2xl border ${col.border} bg-white/[0.02]`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
        <span className={`w-2 h-2 rounded-full ${col.dot} flex-none`} />
        <span className="text-sm font-medium text-zinc-200 flex-1">{col.label}</span>
        <span className="text-xs font-semibold text-zinc-400 bg-white/[0.06] rounded-full px-2 py-0.5">
          {leads.length}
        </span>
        {pipelineTotal > 0 && (
          <span className="text-xs text-zinc-500">{formatPipelineValue(pipelineTotal)}</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[80px]">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-white/[0.06]">
              <span className="text-xs text-zinc-600">No leads</span>
            </div>
          ) : (
            leads.map((lead) => (
              <SortableCard
                key={lead.id}
                lead={lead}
                waTemplate={waTemplate}
                waTemplateEs={waTemplateEs}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Board ───────────────────────────────────────────────────────────────────

export function KanbanBoard({ initialLeads, waTemplate, waTemplateEs, onLeadUpdated }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const getColumnLeads = (colId: ColumnId) =>
    leads.filter((l) => l.status === colId);

  const findColumn = (leadId: string): ColumnId | null => {
    const lead = leads.find((l) => l.id === leadId);
    return (lead?.status as ColumnId) ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumn(activeLeadId);

    // over.id might be a column id or another lead id — resolve target column
    const targetCol: ColumnId | null = COLUMNS.some((c) => c.id === overId)
      ? (overId as ColumnId)
      : findColumn(overId);

    if (!sourceCol || !targetCol || sourceCol === targetCol) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === activeLeadId ? { ...l, status: targetCol as any } : l))
    );
    onLeadUpdated?.(activeLeadId, targetCol);

    try {
      await fetch(`/api/leads/${activeLeadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetCol }),
      });
    } catch {
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === activeLeadId ? { ...l, status: sourceCol as any } : l))
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            leads={getColumnLeads(col.id)}
            waTemplate={waTemplate}
            waTemplateEs={waTemplateEs}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="rotate-1 shadow-2xl w-[280px]">
            <KanbanCard
              lead={activeLead}
              waTemplate={waTemplate}
              waTemplateEs={waTemplateEs}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
