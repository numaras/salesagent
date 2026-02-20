import { useState, useEffect, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import FormField, { Input, Textarea } from "../components/FormField";
import FormSelect from "../components/FormSelect";

type Tab = "general" | "custom-domain" | "adapter" | "slack" | "ai" | "access" | "business-rules";

interface SettingsPayload {
  general: {
    tenant_id: string;
    name: string;
    subdomain: string;
    virtual_host: string | null;
    ad_server: string | null;
    brand_manifest_policy: string | null;
    auth_setup_mode: boolean;
  };
  adapter: {
    adapter_type: string;
    mock_dry_run: boolean | null;
    gam_network_code: string | null;
    config_json: Record<string, unknown>;
  } | null;
  slack: { slack_webhook_url: string; slack_audit_webhook_url: string };
  ai: { provider: string; model: string; api_key: string };
  access: { authorized_domains: string[]; authorized_emails: string[] };
  business_rules: { 
    approval_mode: string; 
    order_name_template: string; 
    line_item_name_template: string;
    creative_review_criteria?: string;
    sensitive_categories?: string;
    creative_auto_approve_threshold?: number;
    creative_auto_reject_threshold?: number;
  };
}

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "custom-domain", label: "Custom Domain" },
  { id: "adapter", label: "Adapter" },
  { id: "slack", label: "Slack" },
  { id: "ai", label: "AI" },
  { id: "access", label: "Access" },
  { id: "business-rules", label: "Business Rules" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<SettingsPayload>("/settings")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Settings</h2>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-64 animate-pulse rounded bg-gray-200" />
        </div>
      ) : !data ? (
        <p className="text-sm text-gray-400">Unable to load settings.</p>
      ) : (
        <>
          {tab === "general" && <GeneralTab data={data} onSaved={load} />}
          {tab === "custom-domain" && <CustomDomainTab data={data} onSaved={load} />}
          {tab === "adapter" && <AdapterTab data={data} onSaved={load} />}
          {tab === "slack" && <SlackTab data={data} onSaved={load} />}
          {tab === "ai" && <AITab data={data} onSaved={load} />}
          {tab === "access" && <AccessTab data={data} onSaved={load} />}
          {tab === "business-rules" && <BusinessRulesTab data={data} onSaved={load} />}
        </>
      )}
    </div>
  );
}

/* ───── General ───── */

function GeneralTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [name, setName] = useState(data.general.name);
  const [virtualHost, setVirtualHost] = useState(data.general.virtual_host ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/settings/general", {
        method: "POST",
        body: JSON.stringify({ name, virtual_host: virtualHost }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Tenant Information</h3>
      <FormField label="Tenant Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="Subdomain">
        <Input value={data.general.subdomain} readOnly className="bg-gray-50 cursor-not-allowed" />
      </FormField>
      <FormField label="Virtual Host">
        <Input value={virtualHost} onChange={(e) => setVirtualHost(e.target.value)} placeholder="e.g. sales.example.com" />
      </FormField>
      <SaveButton saving={saving} />
    </form>
  );
}

/* ───── Custom Domain ───── */

function CustomDomainTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [domain, setDomain] = useState(data.general.virtual_host || "");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkStatus() {
    if (!domain) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiFetch<any>("/settings/approximated/status", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      // Try to parse the response format
      if (res && res.data && res.data.length > 0) {
        setStatus(`Status: ${res.data[0].status || JSON.stringify(res.data[0])}`);
      } else if (res && res.error) {
        setStatus(`Error: ${res.error}`);
      } else {
        setStatus(JSON.stringify(res));
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error checking status");
    } finally {
      setLoading(false);
    }
  }

  async function provisionDomain() {
    if (!domain) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await apiFetch<any>("/settings/approximated/register", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      if (res && res.error) {
        setStatus(`Error: ${res.error}`);
      } else {
        setStatus("Provisioned successfully! Please check status to verify.");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error provisioning domain");
    } finally {
      setLoading(false);
    }
  }

  async function saveVirtualHost(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/settings/general", {
        method: "POST",
        body: JSON.stringify({ name: data.general.name, virtual_host: domain }),
      });
      setStatus("Virtual host updated in settings.");
      onSaved();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Custom Domain Provisioning</h3>
        <p className="text-sm text-gray-500">
          Setup your custom domain using Approximated.app. Enter the desired domain below.
        </p>
        <form onSubmit={saveVirtualHost} className="space-y-4">
          <FormField label="Domain Name">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. sales.example.com" />
          </FormField>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={provisionDomain}
              disabled={loading || !domain}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              Provision Domain
            </button>
            <button
              type="button"
              onClick={checkStatus}
              disabled={loading || !domain}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Check Status
            </button>
            <button
              type="submit"
              disabled={loading || !domain}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Save as Virtual Host
            </button>
          </div>
        </form>

        {status && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700 font-mono break-all">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Adapter ───── */

function AdapterTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const adapter = data.adapter;
  const cfg = (adapter?.config_json ?? {}) as Record<string, string>;
  const [adapterType, setAdapterType] = useState(adapter?.adapter_type ?? "mock");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Mock
  const [dryRun, setDryRun] = useState(adapter?.mock_dry_run ?? false);

  // GAM
  const [gamAuthMethod, setGamAuthMethod] = useState<string>(cfg.auth_method ?? "service_account");
  const [gamNetworkCode, setGamNetworkCode] = useState(adapter?.gam_network_code ?? "");
  const [gamTraffickerId, setGamTraffickerId] = useState(cfg.gam_trafficker_id ?? "");
  const [gamCurrency, setGamCurrency] = useState(cfg.gam_network_currency ?? "USD");
  const [gamRefreshToken, setGamRefreshToken] = useState("");
  const [gamServiceAccountJson, setGamServiceAccountJson] = useState("");

  // Kevel
  const [kevelNetworkId, setKevelNetworkId] = useState(cfg.kevelNetworkId ?? "");
  const [kevelApiKey, setKevelApiKey] = useState(cfg.kevelApiKey ?? "");

  // Triton
  const [tritonStationId, setTritonStationId] = useState(cfg.tritonStationId ?? "");
  const [tritonApiKey, setTritonApiKey] = useState(cfg.tritonApiKey ?? "");

  // Broadstreet
  const [broadstreetNetworkId, setBroadstreetNetworkId] = useState(cfg.broadstreetNetworkId ?? "");
  const [broadstreetApiKey, setBroadstreetApiKey] = useState(cfg.broadstreetApiKey ?? "");

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/settings/adapter", {
        method: "POST",
        body: JSON.stringify({
          adapter_type: adapterType,
          mock_dry_run: dryRun,
          gam_auth_method: gamAuthMethod,
          gam_network_code: gamNetworkCode || undefined,
          gam_trafficker_id: gamTraffickerId || undefined,
          gam_refresh_token: gamRefreshToken || undefined,
          gam_service_account_json: gamServiceAccountJson || undefined,
          gam_network_currency: gamCurrency || undefined,
          config_json: {
            auth_method: gamAuthMethod,
            gam_trafficker_id: gamTraffickerId,
            gam_network_currency: gamCurrency,
            kevelNetworkId,
            kevelApiKey,
            tritonStationId,
            tritonApiKey,
            broadstreetNetworkId,
            broadstreetApiKey,
          },
        }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<{ connected: boolean; network_name?: string; error?: string }>("/gam/test-connection", { method: "POST" });
      setTestResult(res.connected ? `Connected: ${res.network_name ?? "OK"}` : `Failed: ${res.error ?? "Unknown error"}`);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">Ad Server Configuration</h3>

      <FormField label="Ad Server">
        <FormSelect
          value={adapterType}
          onChange={(e) => setAdapterType(e.target.value)}
          options={[
            { value: "mock", label: "Mock Ad Server" },
            { value: "google_ad_manager", label: "Google Ad Manager" },
            { value: "kevel", label: "Kevel" },
            { value: "triton_digital", label: "Triton Digital" },
            { value: "broadstreet", label: "Broadstreet" },
          ]}
        />
      </FormField>

      {/* ── Mock ── */}
      {adapterType === "mock" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Mock Settings</p>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            Dry run mode (simulate without writing)
          </label>
        </div>
      )}

      {/* ── Google Ad Manager ── */}
      {adapterType === "google_ad_manager" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Google Ad Manager Settings</p>
          <FormField label="Auth Method">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="gamAuth" value="service_account" checked={gamAuthMethod === "service_account"} onChange={() => setGamAuthMethod("service_account")} />
                Service Account
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="gamAuth" value="oauth" checked={gamAuthMethod === "oauth"} onChange={() => setGamAuthMethod("oauth")} />
                OAuth Refresh Token
              </label>
            </div>
          </FormField>
          <FormField label="Network Code">
            <Input value={gamNetworkCode} onChange={(e) => setGamNetworkCode(e.target.value)} placeholder="e.g. 12345678" />
          </FormField>
          <FormField label="Trafficker ID">
            <Input value={gamTraffickerId} onChange={(e) => setGamTraffickerId(e.target.value)} placeholder="e.g. 987654" />
          </FormField>
          <FormField label="Network Currency">
            <Input value={gamCurrency} onChange={(e) => setGamCurrency(e.target.value)} placeholder="USD" />
          </FormField>
          {gamAuthMethod === "service_account" && (
            <FormField label="Service Account JSON">
              <textarea value={gamServiceAccountJson} onChange={(e) => setGamServiceAccountJson(e.target.value)} placeholder='Paste your service account JSON...' rows={4} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
            </FormField>
          )}
          {gamAuthMethod === "oauth" && (
            <FormField label="Refresh Token">
              <Input type="password" value={gamRefreshToken} onChange={(e) => setGamRefreshToken(e.target.value)} placeholder="Paste your refresh token..." />
            </FormField>
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleTestConnection} disabled={testing} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {testing ? "Testing..." : "Test Connection"}
            </button>
            {testResult && (
              <span className={`text-sm ${testResult.startsWith("Connected") ? "text-green-700" : "text-red-700"}`}>{testResult}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Kevel ── */}
      {adapterType === "kevel" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Kevel Settings</p>
          <FormField label="Network ID">
            <Input value={kevelNetworkId} onChange={(e) => setKevelNetworkId(e.target.value)} placeholder="Your Kevel Network ID" />
          </FormField>
          <FormField label="API Key">
            <Input type="password" value={kevelApiKey} onChange={(e) => setKevelApiKey(e.target.value)} placeholder="Your Kevel API Key" />
          </FormField>
        </div>
      )}

      {/* ── Triton Digital ── */}
      {adapterType === "triton_digital" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Triton Digital Settings</p>
          <FormField label="Station ID">
            <Input value={tritonStationId} onChange={(e) => setTritonStationId(e.target.value)} placeholder="Your Triton Station ID" />
          </FormField>
          <FormField label="API Key">
            <Input type="password" value={tritonApiKey} onChange={(e) => setTritonApiKey(e.target.value)} placeholder="Your Triton API Key" />
          </FormField>
        </div>
      )}

      {/* ── Broadstreet ── */}
      {adapterType === "broadstreet" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Broadstreet Settings</p>
          <FormField label="Network ID">
            <Input value={broadstreetNetworkId} onChange={(e) => setBroadstreetNetworkId(e.target.value)} placeholder="Your Broadstreet Network ID" />
          </FormField>
          <FormField label="API Key">
            <Input type="password" value={broadstreetApiKey} onChange={(e) => setBroadstreetApiKey(e.target.value)} placeholder="Your Broadstreet API Key" />
          </FormField>
        </div>
      )}

      <div className="pt-2">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}

/* ───── Slack ───── */

function SlackTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [webhookUrl, setWebhookUrl] = useState(data.slack.slack_webhook_url);
  const [auditUrl, setAuditUrl] = useState(data.slack.slack_audit_webhook_url);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/settings/slack", {
        method: "POST",
        body: JSON.stringify({ slack_webhook_url: webhookUrl, slack_audit_webhook_url: auditUrl }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Slack Integration</h3>
      <FormField label="Webhook URL">
        <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
      </FormField>
      <FormField label="Audit Webhook URL">
        <Input value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
      </FormField>
      <div className="flex gap-3">
        <SaveButton saving={saving} />
        <button
          type="button"
          onClick={() => alert("Test sent")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          Test
        </button>
      </div>
    </form>
  );
}

/* ───── AI ───── */

function AITab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [provider, setProvider] = useState(data.ai.provider || "gemini");
  const [model, setModel] = useState(data.ai.model);
  const [apiKey, setApiKey] = useState(data.ai.api_key);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/settings/ai", {
        method: "POST",
        body: JSON.stringify({ provider, model, api_key: apiKey }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">AI Configuration</h3>
      <FormField label="Provider">
        <FormSelect
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          options={[
            { value: "gemini", label: "Gemini" },
            { value: "openai", label: "OpenAI" },
          ]}
        />
      </FormField>
      <FormField label="Model">
        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gemini-2.0-flash" />
      </FormField>
      <FormField label="API Key">
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
      </FormField>
      <SaveButton saving={saving} />
    </form>
  );
}

/* ───── Access ───── */

function AccessTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [domains, setDomains] = useState<string[]>(data.access.authorized_domains);
  const [emails, setEmails] = useState<string[]>(data.access.authorized_emails);
  const [newDomain, setNewDomain] = useState("");
  const [newEmail, setNewEmail] = useState("");

  async function addDomain() {
    const domain = newDomain.trim();
    if (!domain) return;
    try {
      await apiFetch("/settings/domains/add", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      setDomains((prev) => [...prev, domain]);
      setNewDomain("");
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add domain");
    }
  }

  async function removeDomain(domain: string) {
    try {
      await apiFetch("/settings/domains/remove", {
        method: "POST",
        body: JSON.stringify({ domain }),
      });
      setDomains((prev) => prev.filter((d) => d !== domain));
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove domain");
    }
  }

  async function addEmail() {
    const email = newEmail.trim();
    if (!email) return;
    try {
      await apiFetch("/settings/emails/add", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmails((prev) => [...prev, email]);
      setNewEmail("");
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add email");
    }
  }

  async function removeEmail(email: string) {
    try {
      await apiFetch("/settings/emails/remove", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmails((prev) => prev.filter((e) => e !== email));
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove email");
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Domains */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Authorized Domains</h3>
        {domains.length === 0 ? (
          <p className="text-sm text-gray-400">No authorized domains configured.</p>
        ) : (
          <ul className="space-y-2">
            {domains.map((d) => (
              <li key={d} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                <span className="font-mono text-gray-700">{d}</span>
                <button onClick={() => removeDomain(d)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="example.com" className="flex-1" />
          <button
            type="button"
            onClick={addDomain}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Emails */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Authorized Emails</h3>
        {emails.length === 0 ? (
          <p className="text-sm text-gray-400">No authorized emails configured.</p>
        ) : (
          <ul className="space-y-2">
            {emails.map((e) => (
              <li key={e} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-700">{e}</span>
                <button onClick={() => removeEmail(e)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" className="flex-1" />
          <button
            type="button"
            onClick={addEmail}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Guest Login / Setup Mode */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Disable Guest Login (Force SSO)</h3>
            <p className="text-sm text-gray-500 mt-1">
              If SSO is configured and verified, you can disable the guest "test login" page.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await apiFetch<{ auth_setup_mode: boolean }>("/settings/access/setup-mode", {
                  method: "POST",
                  body: JSON.stringify({ auth_setup_mode: !data.general.auth_setup_mode }),
                });
                data.general.auth_setup_mode = res.auth_setup_mode;
                onSaved();
              } catch (err) {
                alert(err instanceof Error ? err.message : "Failed to toggle setup mode. Ensure SSO is enabled first.");
              }
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${!data.general.auth_setup_mode ? "bg-indigo-600" : "bg-gray-200"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!data.general.auth_setup_mode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
        {!data.general.auth_setup_mode && (
          <div className="rounded-md bg-indigo-50 p-4 mt-4">
            <div className="flex">
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-indigo-700">Guest login is disabled. Users must authenticate via SSO.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Business Rules ───── */

function BusinessRulesTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [approvalMode, setApprovalMode] = useState(data.business_rules.approval_mode || "manual");
  const [orderTemplate, setOrderTemplate] = useState(data.business_rules.order_name_template);
  const [lineItemTemplate, setLineItemTemplate] = useState(data.business_rules.line_item_name_template);
  const [creativeReviewCriteria, setCreativeReviewCriteria] = useState(data.business_rules.creative_review_criteria ?? "");
  const [sensitiveCategories, setSensitiveCategories] = useState(data.business_rules.sensitive_categories ?? "");
  const [approveThreshold, setApproveThreshold] = useState(data.business_rules.creative_auto_approve_threshold?.toString() ?? "0.9");
  const [rejectThreshold, setRejectThreshold] = useState(data.business_rules.creative_auto_reject_threshold?.toString() ?? "0.1");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/settings/business-rules", {
        method: "POST",
        body: JSON.stringify({
          approval_mode: approvalMode,
          order_name_template: orderTemplate,
          line_item_name_template: lineItemTemplate,
          creative_review_criteria: creativeReviewCriteria,
          sensitive_categories: sensitiveCategories,
          creative_auto_approve_threshold: parseFloat(approveThreshold),
          creative_auto_reject_threshold: parseFloat(rejectThreshold),
        }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Rules</h3>
        <div className="space-y-4">
          <FormField label="Approval Mode">
            <FormSelect
              value={approvalMode}
              onChange={(e) => setApprovalMode(e.target.value)}
              options={[
                { value: "auto-approve", label: "Auto-Approve" },
                { value: "manual", label: "Manual" },
                { value: "ai-review", label: "AI Review" },
              ]}
            />
          </FormField>
          <FormField label="Order Name Template">
            <Input value={orderTemplate} onChange={(e) => setOrderTemplate(e.target.value)} placeholder="e.g. {{advertiser}}_{{date}}" />
          </FormField>
          <FormField label="Line Item Name Template">
            <Input value={lineItemTemplate} onChange={(e) => setLineItemTemplate(e.target.value)} placeholder="e.g. {{product}}_{{format}}" />
          </FormField>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Creative Review Settings</h3>
        <div className="space-y-4">
          <FormField label="Review Criteria">
            <Textarea 
              value={creativeReviewCriteria} 
              onChange={(e) => setCreativeReviewCriteria(e.target.value)} 
              placeholder="e.g. Ad must not contain deceptive claims..." 
              rows={3} 
            />
          </FormField>
          <FormField label="Sensitive Categories">
            <Textarea 
              value={sensitiveCategories} 
              onChange={(e) => setSensitiveCategories(e.target.value)} 
              placeholder="e.g. gambling, tobacco, adult content" 
              rows={2} 
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Auto-Approve Threshold">
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                max="1" 
                value={approveThreshold} 
                onChange={(e) => setApproveThreshold(e.target.value)} 
              />
            </FormField>
            <FormField label="Auto-Reject Threshold">
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                max="1" 
                value={rejectThreshold} 
                onChange={(e) => setRejectThreshold(e.target.value)} 
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}

/* ───── Shared ───── */

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
    >
      {saving ? "Saving..." : "Save"}
    </button>
  );
}
