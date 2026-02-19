import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormField, { Input } from "../components/FormField";
import FormSelect from "../components/FormSelect";

interface OidcConfig {
  oidc_enabled: boolean;
  provider: string | null;
  client_id: string | null;
  discovery_url: string | null;
  scopes: string;
  logout_url: string | null;
  oidc_verified_at: string | null;
}

const PROVIDERS = [
  { value: "google", label: "Google" },
  { value: "microsoft", label: "Microsoft" },
  { value: "okta", label: "Okta" },
  { value: "auth0", label: "Auth0" },
  { value: "keycloak", label: "Keycloak" },
  { value: "custom", label: "Custom" },
];

const DISCOVERY_URLS: Record<string, string> = {
  google: "https://accounts.google.com/.well-known/openid-configuration",
  microsoft: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
  okta: "https://{your-domain}.okta.com/.well-known/openid-configuration",
  auth0: "https://{your-domain}.auth0.com/.well-known/openid-configuration",
  keycloak: "https://{your-host}/realms/{realm}/.well-known/openid-configuration",
  custom: "",
};

export default function SsoConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [enabled, setEnabled] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [scopes, setScopes] = useState("openid email profile");
  const [logoutUrl, setLogoutUrl] = useState("");

  function loadConfig() {
    setLoading(true);
    apiFetch<OidcConfig>("/oidc/config")
      .then((cfg) => {
        setEnabled(cfg.oidc_enabled);
        setProvider(cfg.provider ?? "");
        setClientId(cfg.client_id ?? "");
        setDiscoveryUrl(cfg.discovery_url ?? "");
        setScopes(cfg.scopes ?? "openid email profile");
        setLogoutUrl(cfg.logout_url ?? "");
        setVerifiedAt(cfg.oidc_verified_at ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadConfig(); }, []);

  function handleProviderChange(value: string) {
    setProvider(value);
    if (DISCOVERY_URLS[value]) {
      setDiscoveryUrl(DISCOVERY_URLS[value]);
    }
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiFetch("/oidc/config", {
        method: "POST",
        body: JSON.stringify({
          provider,
          client_id: clientId,
          client_secret: clientSecret || undefined,
          discovery_url: discoveryUrl,
          scopes,
          logout_url: logoutUrl || undefined,
        }),
      });
      setSuccess("Configuration saved");
      loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    setError("");
    setSuccess("");
    try {
      const endpoint = enabled ? "/oidc/disable" : "/oidc/enable";
      await apiFetch(endpoint, { method: "POST" });
      setEnabled(!enabled);
      setSuccess(enabled ? "SSO disabled" : "SSO enabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SSO / OIDC Configuration</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure single sign-on for your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          {verifiedAt && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Verified
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              enabled
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <FormField label="Identity Provider">
            <FormSelect
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              options={PROVIDERS}
              placeholder="Select a provider..."
            />
          </FormField>

          <FormField label="Client ID">
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="your-client-id"
            />
          </FormField>

          <FormField label="Client Secret">
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Leave blank to keep existing"
            />
          </FormField>

          <FormField label="Discovery URL">
            <Input
              value={discoveryUrl}
              onChange={(e) => setDiscoveryUrl(e.target.value)}
              placeholder="https://.../.well-known/openid-configuration"
            />
          </FormField>

          <FormField label="Scopes">
            <Input
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              placeholder="openid email profile"
            />
          </FormField>

          <FormField label="Logout URL (optional)">
            <Input
              value={logoutUrl}
              onChange={(e) => setLogoutUrl(e.target.value)}
              placeholder="https://..."
            />
          </FormField>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={toggleEnabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              enabled
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {enabled ? "Disable SSO" : "Enable SSO"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
