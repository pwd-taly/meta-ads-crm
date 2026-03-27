"use client";
import { useState } from "react";
import { Save, RefreshCw, Copy, Check, ExternalLink } from "lucide-react";

interface InitialSettings {
  metaAdAccountId: string;
  metaPageId: string;
  webhookVerifyToken: string;
  waMessageTemplate: string;
  waMessageTemplateEs: string;
  hasToken: boolean;
}

interface Props {
  initialSettings: InitialSettings;
}

export function SettingsClient({ initialSettings }: Props) {
  const [token, setToken] = useState("");
  const [adAccountId, setAdAccountId] = useState(initialSettings.metaAdAccountId);
  const [pageId, setPageId] = useState(initialSettings.metaPageId);
  const [verifyToken, setVerifyToken] = useState(initialSettings.webhookVerifyToken);
  const [waTemplate, setWaTemplate] = useState(initialSettings.waMessageTemplate);
  const [waTemplateEs, setWaTemplateEs] = useState(initialSettings.waMessageTemplateEs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/meta/webhook`
    : "/api/meta/webhook";

  const save = async () => {
    setSaving(true);
    const body: Record<string, string> = {
      metaAdAccountId: adAccountId,
      metaPageId: pageId,
      webhookVerifyToken: verifyToken,
      waMessageTemplate: waTemplate,
      waMessageTemplateEs: waTemplateEs,
    };
    if (token) body.metaAccessToken = token;

    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setToken("");
    setTimeout(() => setSaved(false), 2500);
  };

  const generateVerifyToken = async () => {
    setGeneratingToken(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_verify_token" }),
    });
    const data = await res.json();
    setVerifyToken(data.token);
    setGeneratingToken(false);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    if (!adAccountId || !token) {
      setTestResult({ ok: false, message: "Please enter Access Token and Ad Account ID first, then save." });
      setTesting(false);
      return;
    }
    const res = await fetch(`/api/meta/ads?datePreset=last_7d`);
    if (res.ok) {
      setTestResult({ ok: true, message: "Connection successful! Meta API is working." });
    } else {
      const data = await res.json();
      setTestResult({ ok: false, message: data.error || "Connection failed." });
    }
    setTesting(false);
  };

  const inputClass = "w-full border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-colors bg-white/[0.04] text-zinc-300 placeholder:text-zinc-600";
  const readonlyClass = "flex-1 border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm bg-white/[0.02] text-zinc-500 font-mono text-xs";

  return (
    <div className="space-y-5">
      {/* Meta API */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-white">Meta API Credentials</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Connect your Meta Ads account</p>
          </div>
          <a
            href="https://developers.facebook.com/tools/explorer/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Get Token <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1.5 uppercase tracking-wide">
              Access Token {initialSettings.hasToken && (
                <span className="text-emerald-400 font-semibold normal-case tracking-normal ml-1">✓ saved</span>
              )}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={initialSettings.hasToken ? "Enter new token to replace…" : "EAAxxxxxxxxxxxx…"}
              className={inputClass}
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              Use a long-lived Page Access Token with <code className="bg-white/[0.06] text-zinc-400 px-1.5 py-0.5 rounded-md font-mono text-[11px]">ads_read</code> permission.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1.5 uppercase tracking-wide">
                Ad Account ID
              </label>
              <input
                type="text"
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_123456789"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 block mb-1.5 uppercase tracking-wide">
                Page ID
              </label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="123456789"
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-white/[0.08] rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Testing…" : "Test Connection"}
          </button>

          {testResult && (
            <div className={`text-sm px-3.5 py-2.5 rounded-xl border font-medium ${
              testResult.ok
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Webhook */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-sm text-white">Meta Webhook Setup</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Auto-receive leads from Meta Lead Ads forms</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-500 block mb-1.5 uppercase tracking-wide">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className={readonlyClass}
            />
            <button
              onClick={copyWebhook}
              className="px-3.5 py-2.5 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-colors text-zinc-400 hover:text-white"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-1.5">
            Add this in Meta App → Webhooks → Page → leadgen subscription.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-500 block mb-1.5 uppercase tracking-wide">Verify Token</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={verifyToken || "Click Generate to create a token"}
              className={readonlyClass}
            />
            <button
              onClick={generateVerifyToken}
              disabled={generatingToken}
              className="px-4 py-2.5 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-colors text-sm font-medium text-zinc-400 hover:text-white whitespace-nowrap disabled:opacity-50"
            >
              {generatingToken ? "…" : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Templates */}
      <div className="bg-[#111113] rounded-2xl border border-white/[0.06] p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-sm text-white">WhatsApp Message Templates</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Use <code className="bg-white/[0.06] text-zinc-400 px-1.5 py-0.5 rounded-md font-mono text-[11px]">{"{{name}}"}</code> to insert the lead&apos;s name. Each lead card lets you pick EN or ES.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* English */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 block uppercase tracking-wide">🇬🇧 English</label>
            <textarea
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              rows={3}
              className="w-full border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-colors bg-white/[0.04] text-zinc-300 placeholder:text-zinc-600"
              placeholder="Hi {{name}}, thanks for your interest!…"
            />
          </div>

          {/* Spanish */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 block uppercase tracking-wide">🇪🇸 Spanish</label>
            <textarea
              value={waTemplateEs}
              onChange={(e) => setWaTemplateEs(e.target.value)}
              rows={3}
              className="w-full border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-colors bg-white/[0.04] text-zinc-300 placeholder:text-zinc-600"
              placeholder="Hola {{name}}, ¡gracias por tu interés!…"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-2.5 btn-gradient text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/30"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
      </button>
    </div>
  );
}
