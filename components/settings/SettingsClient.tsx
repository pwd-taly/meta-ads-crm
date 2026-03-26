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

  return (
    <div className="space-y-6">
      {/* Meta API */}
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Meta API Credentials</h2>
          <a
            href="https://developers.facebook.com/tools/explorer/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Get Access Token <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Access Token {initialSettings.hasToken && <span className="text-green-600">(saved ✓)</span>}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={initialSettings.hasToken ? "Enter new token to replace" : "EAAxxxxxxxxxxxx…"}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use a long-lived Page Access Token with <code className="bg-muted px-1 rounded">ads_read</code> permission.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Ad Account ID
            </label>
            <input
              type="text"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="act_123456789"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Page ID
            </label>
            <input
              type="text"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              placeholder="123456789"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
            Test Connection
          </button>

          {testResult && (
            <div className={`text-sm px-3 py-2 rounded-lg ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Webhook */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-sm">Meta Webhook Setup</h2>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-muted/30 text-muted-foreground"
            />
            <button
              onClick={copyWebhook}
              className="px-3 py-2 border rounded-lg hover:bg-muted transition-colors text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Add this URL in your Meta App → Webhooks → Page → leadgen subscription.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Verify Token</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={verifyToken || "Click Generate to create a token"}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-muted/30 text-muted-foreground font-mono text-xs"
            />
            <button
              onClick={generateVerifyToken}
              disabled={generatingToken}
              className="px-3 py-2 border rounded-lg hover:bg-muted transition-colors text-sm whitespace-nowrap"
            >
              {generatingToken ? "…" : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Templates */}
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-sm">WhatsApp Message Templates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code> to insert the lead&apos;s name. The button on each lead lets you pick which language to send.
          </p>
        </div>

        {/* English */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🇬🇧 English</span>
          </div>
          <textarea
            value={waTemplate}
            onChange={(e) => setWaTemplate(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Hi {{name}}, thanks for your interest!…"
          />
        </div>

        {/* Spanish */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🇪🇸 Spanish</span>
          </div>
          <textarea
            value={waTemplateEs}
            onChange={(e) => setWaTemplateEs(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Hola {{name}}, ¡gracias por tu interés!…"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save Settings"}
      </button>
    </div>
  );
}
