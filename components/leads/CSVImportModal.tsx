"use client";
import { useState, useRef } from "react";
import { X, Upload, FileText, Check } from "lucide-react";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function CSVImportModal({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ leads: Record<string, string>[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setLoading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("preview", "true");
    const res = await fetch("/api/leads/import", { method: "POST", body: fd });
    const data = await res.json();
    setPreview(data);
    setLoading(false);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/leads/import", { method: "POST", body: fd });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111113] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">Import Leads from CSV</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {result ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="font-medium text-white">Import Complete</p>
              <p className="text-sm text-zinc-500">
                {result.imported} leads imported · {result.skipped} skipped (duplicates)
              </p>
              <button
                onClick={onImported}
                className="mt-2 px-4 py-2 btn-gradient text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              {!file && (
                <div
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors"
                >
                  <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-300">Drop your Meta leads CSV here</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Export from Meta Ads Manager → Leads Center
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              )}

              {/* Preview */}
              {file && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium text-zinc-300">{file.name}</span>
                    {preview && (
                      <span className="text-zinc-600">· {preview.total} leads found</span>
                    )}
                  </div>

                  {preview && preview.leads.length > 0 && (
                    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                              <th className="px-3 py-2 text-left font-medium text-zinc-500">Name</th>
                              <th className="px-3 py-2 text-left font-medium text-zinc-500">Phone</th>
                              <th className="px-3 py-2 text-left font-medium text-zinc-500">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {preview.leads.slice(0, 5).map((l, i) => (
                              <tr key={i} className="text-zinc-400">
                                <td className="px-3 py-2">{(l as Record<string, string>).name || "—"}</td>
                                <td className="px-3 py-2">{(l as Record<string, string>).phone || "—"}</td>
                                <td className="px-3 py-2">{(l as Record<string, string>).email || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {preview.total > 5 && (
                        <p className="px-3 py-2 text-xs text-zinc-600 border-t border-white/[0.06]">
                          + {preview.total - 5} more leads…
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-white/[0.08] rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!preview || loading}
                  className="px-4 py-2 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50 shadow-md shadow-blue-500/20"
                >
                  {loading ? "Importing…" : `Import ${preview?.total || 0} Leads`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
