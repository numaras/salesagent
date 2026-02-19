import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormField, { Input, Textarea } from "../components/FormField";

interface GamConfig {
  configured: boolean;
  network_code?: string | null;
  trafficker_id?: string | null;
  auth_method?: string | null;
  has_refresh_token?: boolean;
  has_service_account?: boolean;
}

type ConnectionStatus = "idle" | "connected" | "error";

export default function GamConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [authMethod, setAuthMethod] = useState<"oauth" | "service_account">("oauth");
  const [networkCode, setNetworkCode] = useState("");
  const [traffickerId, setTraffickerId] = useState("");
  const [networkCurrency, setNetworkCurrency] = useState("USD");
  const [refreshToken, setRefreshToken] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");

  function loadConfig() {
    setLoading(true);
    apiFetch<GamConfig>("/gam/config")
      .then((cfg) => {
        if (cfg.configured) {
          setNetworkCode(cfg.network_code ?? "");
          setTraffickerId(cfg.trafficker_id ?? "");
          if (cfg.auth_method === "oauth" || cfg.auth_method === "service_account") {
            setAuthMethod(cfg.auth_method);
          }
          if (cfg.has_refresh_token) setConnectionStatus("connected");
          else if (cfg.has_service_account) setConnectionStatus("connected");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadConfig(); }, []);

  async function handleSaveAndTest() {
    setError("");
    setSuccess("");
    setConnectionError("");
    setSaving(true);

    try {
      await apiFetch("/gam/configure", {
        method: "POST",
        body: JSON.stringify({
          auth_method: authMethod,
          network_code: networkCode,
          refresh_token: authMethod === "oauth" ? refreshToken : undefined,
          service_account_json: authMethod === "service_account" ? serviceAccountJson : undefined,
          trafficker_id: traffickerId,
          network_currency: networkCurrency,
        }),
      });

      const testResult = await apiFetch<{ connected: boolean; network_code?: string; error?: string }>(
        "/gam/test-connection",
        { method: "POST" },
      );

      if (testResult.connected) {
        setConnectionStatus("connected");
        setSuccess(`Configuration saved. Connected to GAM network ${testResult.network_code}`);
      } else {
        setConnectionStatus("error");
        setConnectionError(testResult.error ?? "Connection test failed");
        setSuccess("Configuration saved, but connection test failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setConnectionStatus("error");
    } finally {
      setSaving(false);
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
          <h1 className="text-2xl font-bold text-gray-900">GAM Configuration</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Google Ad Manager account
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            connectionStatus === "connected"
              ? "bg-green-50 text-green-700"
              : connectionStatus === "error"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {connectionStatus === "connected"
            ? "Connected"
            : connectionStatus === "error"
              ? "Error"
              : "Not Configured"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}
      {connectionError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Connection error: {connectionError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <FormField label="Authentication Method">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="auth_method"
                  checked={authMethod === "oauth"}
                  onChange={() => setAuthMethod("oauth")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                OAuth Refresh Token
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="auth_method"
                  checked={authMethod === "service_account"}
                  onChange={() => setAuthMethod("service_account")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Service Account JSON
              </label>
            </div>
          </FormField>

          {authMethod === "oauth" && (
            <FormField label="Refresh Token">
              <Textarea
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="Paste your OAuth refresh token"
                rows={3}
              />
            </FormField>
          )}

          {authMethod === "service_account" && (
            <FormField label="Service Account JSON">
              <Textarea
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder='Paste your service account JSON key file contents'
                rows={6}
              />
            </FormField>
          )}

          <FormField label="Network Code">
            <Input
              value={networkCode}
              onChange={(e) => setNetworkCode(e.target.value)}
              placeholder="e.g. 12345678"
            />
          </FormField>

          <FormField label="Trafficker ID">
            <Input
              value={traffickerId}
              onChange={(e) => setTraffickerId(e.target.value)}
              placeholder="GAM user ID for trafficking"
            />
          </FormField>

          <FormField label="Network Currency">
            <Input
              value={networkCurrency}
              onChange={(e) => setNetworkCurrency(e.target.value)}
              placeholder="USD"
            />
          </FormField>
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handleSaveAndTest}
            disabled={saving || !networkCode.trim()}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Test Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
