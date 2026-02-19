import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

type Tab = "general" | "adapter";

interface TenantSettings {
  name: string;
  subdomain: string;
  adapter_type: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<TenantSettings>("/settings")
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "adapter", label: "Adapter" },
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Settings</h2>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
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
      ) : tab === "general" ? (
        <GeneralTab settings={settings} />
      ) : (
        <AdapterTab settings={settings} />
      )}
    </div>
  );
}

function GeneralTab({ settings }: { settings: TenantSettings | null }) {
  if (!settings) {
    return <p className="text-sm text-gray-400">Unable to load settings.</p>;
  }

  return (
    <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Tenant Information</h3>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Tenant Name</dt>
          <dd className="mt-1 text-sm text-gray-900">{settings.name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Subdomain</dt>
          <dd className="mt-1 text-sm font-mono text-gray-900">{settings.subdomain}</dd>
        </div>
      </dl>
    </div>
  );
}

function AdapterTab({ settings }: { settings: TenantSettings | null }) {
  if (!settings) {
    return <p className="text-sm text-gray-400">Unable to load settings.</p>;
  }

  return (
    <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Ad Server Adapter</h3>
      <dl>
        <dt className="text-sm font-medium text-gray-500">Adapter Type</dt>
        <dd className="mt-1">
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            {settings.adapter_type}
          </span>
        </dd>
      </dl>
    </div>
  );
}
