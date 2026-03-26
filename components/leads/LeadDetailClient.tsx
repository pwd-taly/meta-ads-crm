"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lead } from "@prisma/client";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { WhatsAppButton } from "./WhatsAppButton";
import { formatDate, formatCurrency, STATUS_CONFIG } from "@/lib/utils";

interface Props {
  lead: Lead;
  waTemplate: string;
  waTemplateEs: string;
}

export function LeadDetailClient({ lead: initial, waTemplate, waTemplateEs }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [notes, setNotes] = useState(initial.notes || "");
  const [bookingDate, setBookingDate] = useState(
    initial.bookingDate ? new Date(initial.bookingDate).toISOString().split("T")[0] : ""
  );
  const [saleAmount, setSaleAmount] = useState(initial.saleAmount?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        notes,
        bookingDate: bookingDate || null,
        saleAmount: saleAmount || null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteLead = async () => {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    router.push("/leads");
  };

  const infoRows = [
    { label: "Email", value: lead.email },
    { label: "Phone", value: lead.phone },
    { label: "Campaign", value: lead.campaignName },
    { label: "Ad Set", value: lead.adsetName },
    { label: "Ad", value: lead.adName },
    { label: "Form", value: lead.formName },
    { label: "Source", value: lead.source },
    { label: "Lead ID", value: lead.metaLeadId },
    { label: "Created", value: formatDate(lead.createdAt) },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">{lead.email || lead.phone || "No contact info"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.phone && (
            <WhatsAppButton phone={lead.phone} name={lead.name} template={waTemplate} templateEs={waTemplateEs} />
          )}
          <button
            onClick={deleteLead}
            className="p-2 rounded-lg border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            title="Delete lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info card */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-sm font-semibold mb-4">Lead Information</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {infoRows.map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium mt-0.5 break-all">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-sm font-semibold mb-3">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead…"
              rows={5}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Right: Status & booking */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold mb-3">Status</h2>
            <div className="space-y-2">
              {["new", "contacted", "booked", "closed", "lost"].map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      status === s
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : "hover:bg-muted border-transparent"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking & Revenue */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold">Booking & Revenue</h2>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Appointment Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Sale Amount ($)
              </label>
              <input
                type="number"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
