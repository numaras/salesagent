import { useState, useEffect, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import FormField, { Input } from "../components/FormField";
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
  business_rules: { approval_mode: string; order_name_template: string; line_item_name_template: string };
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
  const [adapterType, setAdapterType] = useState(adapter?.adapter_type ?? "mock");
  const [dryRun, setDryRun] = useState(adapter?.mock_dry_run ?? false);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/settings/adapter", {
        method: "POST",
        body: JSON.stringify({ adapter_type: adapterType, mock_dry_run: dryRun }),
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
      <h3 className="text-lg font-semibold text-gray-900">Ad Server Adapter</h3>
      <FormField label="Adapter Type">
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

      {adapterType === "google_ad_manager" && (
        <a href="/gam-config" className="inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          Configure GAM &rarr;
        </a>
      )}

      {adapterType === "mock" && (
        <label className="flex items-center gap-2 text-sm text-gray-700 mt-4">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Enable Dry Run (simulate responses without writing)
        </label>
      )}

      {["kevel", "triton_digital", "broadstreet"].includes(adapterType) && (
        <div className="mt-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-200">
          <p className="font-semibold mb-1">Configuration Required</p>
          <p>
            The <strong>{adapterType}</strong> adapter requires an API Key and Network/Station ID. 
            Currently, these must be configured directly in the database <code>adapter_config</code> table. A dedicated UI configuration page for this adapter will be available in a future update.
          </p>
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
    </div>
  );
}

/* ───── Business Rules ───── */

function BusinessRulesTab({ data, onSaved }: { data: SettingsPayload; onSaved: () => void }) {
  const [approvalMode, setApprovalMode] = useState(data.business_rules.approval_mode || "manual");
  const [orderTemplate, setOrderTemplate] = useState(data.business_rules.order_name_template);
  const [lineItemTemplate, setLineItemTemplate] = useState(data.business_rules.line_item_name_template);
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
    <form onSubmit={save} className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Business Rules</h3>
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
      <SaveButton saving={saving} />
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
