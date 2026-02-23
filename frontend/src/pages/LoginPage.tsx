import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface OidcStatus {
  oidc_enabled: boolean;
  auth_setup_mode: boolean;
  provider: string | null;
}

interface SessionStatus {
  authenticated: boolean;
  mfa_required?: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [setupMode, setSetupMode] = useState(true);
  const [ssoProvider, setSsoProvider] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    Promise.allSettled([
      apiFetch<OidcStatus>("/oidc/config"),
      apiFetch<SessionStatus>("/auth/session"),
    ]).then((results) => {
      const oidcResult = results[0];
      if (oidcResult.status === "fulfilled") {
        setSsoEnabled(oidcResult.value.oidc_enabled);
        setSetupMode(oidcResult.value.auth_setup_mode);
        setSsoProvider(oidcResult.value.provider);
      }

      const sessionResult = results[1];
      if (sessionResult.status === "fulfilled" && sessionResult.value.authenticated && sessionResult.value.mfa_required) {
        setMfaRequired(true);
      }
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/auth/test-login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSsoLogin() {
    window.location.href = "/admin/api/oidc/login";
  }

  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code: mfaCode }),
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "MFA verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            SA
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Agent</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your admin panel</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {mfaRequired ? (
            <form onSubmit={handleMfaSubmit}>
              <label className="mb-6 block">
                <span className="mb-1 block text-sm font-medium text-gray-700">MFA Code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  placeholder="123456"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify MFA"}
              </button>
            </form>
          ) : (
            <>
          {ssoEnabled && (
            <button
              type="button"
              onClick={handleSsoLogin}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
              Sign in with SSO{ssoProvider ? ` (${ssoProvider})` : ""}
            </button>
          )}

          {ssoEnabled && setupMode && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">or use test credentials</span>
              </div>
            </div>
          )}

          {setupMode ? (
            <form onSubmit={handleSubmit}>
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  placeholder="admin@example.com"
                />
              </label>

              <label className="mb-6 block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  placeholder="test123"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-900 focus:ring-2 focus:ring-gray-500/20 focus:outline-none disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Test Login"}
              </button>
            </form>
          ) : (
            !ssoEnabled && (
              <div className="text-center text-sm text-gray-500 py-4">
                Login is disabled. SSO is not configured and Guest Mode is turned off.
              </div>
            )
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
