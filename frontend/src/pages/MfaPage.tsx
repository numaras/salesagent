import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";

interface MfaConfig {
  enabled: boolean;
  source?: "db" | "env" | "none";
}

export default function MfaPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [source, setSource] = useState<"db" | "env" | "none">("none");
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const cfg = await apiFetch<MfaConfig>("/mfa/config");
      setEnabled(cfg.enabled);
      setSource(cfg.source ?? "none");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startSetup() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiFetch<{ secret: string; otpauth_uri: string }>("/mfa/setup/initiate", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSetupSecret(res.secret);
      setOtpauthUri(res.otpauth_uri);
      setStatus("MFA setup initiated. Add secret to your authenticator and confirm with a code.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to start setup");
    } finally {
      setSaving(false);
    }
  }

  async function confirmSetup(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await apiFetch("/mfa/setup/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setSetupSecret(null);
      setOtpauthUri(null);
      setCode("");
      setStatus("MFA enabled successfully.");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to confirm setup");
    } finally {
      setSaving(false);
    }
  }

  async function disableMfa(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await apiFetch("/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ code: disableCode }),
      });
      setDisableCode("");
      setStatus("MFA disabled.");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading MFA settings...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Multi-Factor Authentication</h2>
        <p className="text-sm text-gray-600">
          Current status:{" "}
          <span className={enabled ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        <p className="mt-1 text-xs text-gray-500">Source: {source === "db" ? "UI-managed" : source === "env" ? "Environment variable" : "Not configured"}</p>
      </div>

      {!enabled && source !== "env" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Enable MFA</h3>
          <button
            type="button"
            onClick={startSetup}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Starting..." : "Generate Setup Secret"}
          </button>

          {setupSecret && (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-600">Secret (add to your authenticator app):</p>
              <code className="block break-all rounded bg-white px-3 py-2 text-xs">{setupSecret}</code>
              {otpauthUri && (
                <>
                  <p className="text-xs text-gray-600">OTPAuth URI:</p>
                  <code className="block break-all rounded bg-white px-3 py-2 text-xs">{otpauthUri}</code>
                </>
              )}
              <form onSubmit={confirmSetup} className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Verification Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="123456"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {saving ? "Confirming..." : "Confirm & Enable MFA"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {enabled && source !== "env" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Disable MFA</h3>
          <p className="text-sm text-gray-600">
            Enter a valid current MFA code to disable protection.
          </p>
          <form onSubmit={disableMfa} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">MFA Code</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="123456"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Disabling..." : "Disable MFA"}
            </button>
          </form>
        </div>
      )}

      {status && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          {status}
        </div>
      )}

      {source === "env" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          MFA is controlled by `ADMIN_MFA_SECRET` in environment. Remove it to manage MFA from this UI.
        </div>
      )}
    </div>
  );
}
