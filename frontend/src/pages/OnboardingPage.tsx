import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

const STEPS = ["Welcome", "Create Advertiser", "Create Product", "Complete"] as const;

const ADAPTER_OPTIONS = [
  { value: "mock", label: "Mock (Testing)" },
  { value: "gam", label: "Google Ad Manager" },
  { value: "kevel", label: "Kevel" },
  { value: "triton", label: "Triton" },
  { value: "broadstreet", label: "Broadstreet" },
];

const PRICING_MODELS = ["CPM", "CPC", "VCPM", "CPCV", "CPV", "CPP", "FLAT_RATE"];

interface SetupResponse {
  tenant_id: string;
  name: string;
  subdomain: string;
  ad_server: string;
}

interface PrincipalResponse {
  principal_id: string;
  name: string;
  access_token: string;
  tenant_id: string;
}

interface ProductResponse {
  product_id: string;
  name: string;
  delivery_type: string;
  pricing_model: string;
  rate: number;
}

interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

function ProgressIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                i < current
                  ? "bg-indigo-600 text-white"
                  : i === current
                    ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-2 border-gray-200 bg-white text-gray-400"
              }`}
            >
              {i < current ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`hidden text-sm font-medium sm:inline ${
                i <= current ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 ${i < current ? "bg-indigo-600" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: (data: SetupResponse) => void }) {
  const [tenantName, setTenantName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [adapterType, setAdapterType] = useState("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<SetupResponse>("/onboarding/setup", {
        method: "POST",
        body: JSON.stringify({ tenantName, subdomain, adapterType }),
      });
      onNext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
          SA
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome to Sales Agent</h2>
        <p className="mt-2 text-sm text-gray-500">
          Let's set up your first tenant to get started.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Tenant Name</span>
        <input
          type="text"
          required
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          placeholder="My Publisher Network"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Subdomain</span>
        <input
          type="text"
          required
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
          placeholder="my-publisher"
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
        <span className="mt-1 block text-xs text-gray-400">Lowercase letters, numbers, and hyphens only</span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Ad Server Adapter</span>
        <select
          value={adapterType}
          onChange={(e) => setAdapterType(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          {ADAPTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-60"
      >
        {loading ? "Creating Tenant..." : "Create Tenant"}
      </button>
    </form>
  );
}

function StepPrincipal({ onNext }: { onNext: (data: PrincipalResponse) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<PrincipalResponse>("/onboarding/create-principal", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      onNext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create advertiser");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Create Your First Advertiser</h2>
        <p className="mt-2 text-sm text-gray-500">
          Advertisers (principals) use API tokens to interact with the Sales Agent.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Advertiser Name</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Corp"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-60"
      >
        {loading ? "Creating Advertiser..." : "Create Advertiser"}
      </button>
    </form>
  );
}

function StepPrincipalToken({
  principal,
  onContinue,
}: {
  principal: PrincipalResponse;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(principal.access_token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Advertiser Created</h2>
        <p className="mt-2 text-sm text-gray-500">
          Save this API token now — it won't be shown again.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className="text-sm font-semibold text-amber-800">Save this token</span>
        </div>

        <div className="mb-1 text-xs font-medium text-gray-500">
          Advertiser: {principal.name} ({principal.principal_id})
        </div>

        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2">
          <code className="flex-1 break-all text-sm font-mono text-gray-900">
            {principal.access_token}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
      >
        Continue to Product Setup
      </button>
    </div>
  );
}

function StepProduct({ onNext }: { onNext: (data: ProductResponse) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryType, setDeliveryType] = useState("guaranteed");
  const [pricingModel, setPricingModel] = useState("CPM");
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<ProductResponse>("/onboarding/create-product", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          deliveryType,
          pricingModel,
          rate: parseFloat(rate),
        }),
      });
      onNext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Create Your First Product</h2>
        <p className="mt-2 text-sm text-gray-500">
          Products define the ad inventory you offer to advertisers.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Product Name</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Premium Display Banner"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="High-impact banner ads across our premium publisher network"
          rows={2}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Delivery Type</span>
          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          >
            <option value="guaranteed">Guaranteed</option>
            <option value="non_guaranteed">Non-Guaranteed</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Pricing Model</span>
          <select
            value={pricingModel}
            onChange={(e) => setPricingModel(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          >
            {PRICING_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Rate (USD)</span>
        <input
          type="number"
          required
          min="0.01"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="15.00"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-60"
      >
        {loading ? "Creating Product..." : "Create Product"}
      </button>
    </form>
  );
}

function StepComplete({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: ChecklistItem[] }>("/onboarding/checklist")
      .then((data) => setChecklist(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mcpUrl = `${window.location.origin}/mcp/`;
  const a2aUrl = `${window.location.origin}/a2a`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Setup Complete!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your Sales Agent is ready. Here's your setup status.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Setup Checklist</h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-sm">
                {item.completed ? (
                  <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )}
                <span className={item.completed ? "text-gray-900" : "text-gray-400"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Integration URLs</h3>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-gray-500">MCP Server</span>
            <code className="mt-0.5 block rounded bg-white px-2 py-1 text-xs text-gray-800 border border-gray-200 font-mono">
              {mcpUrl}
            </code>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">A2A Server</span>
            <code className="mt-0.5 block rounded bg-white px-2 py-1 text-xs text-gray-800 border border-gray-200 font-mono">
              {a2aUrl}
            </code>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Tenant ID</span>
            <code className="mt-0.5 block rounded bg-white px-2 py-1 text-xs text-gray-800 border border-gray-200 font-mono">
              {tenantId}
            </code>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/")}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [tenantId, setTenantId] = useState("");
  const [principal, setPrincipal] = useState<PrincipalResponse | null>(null);
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 pt-16 pb-12">
      <div className="w-full max-w-lg">
        <ProgressIndicator current={step} />

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {step === 0 && (
            <StepWelcome
              onNext={(data) => {
                setTenantId(data.tenant_id);
                setStep(1);
              }}
            />
          )}

          {step === 1 && !showToken && (
            <StepPrincipal
              onNext={(data) => {
                setPrincipal(data);
                setShowToken(true);
              }}
            />
          )}

          {step === 1 && showToken && principal && (
            <StepPrincipalToken
              principal={principal}
              onContinue={() => {
                setShowToken(false);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <StepProduct
              onNext={() => {
                setStep(3);
              }}
            />
          )}

          {step === 3 && <StepComplete tenantId={tenantId} />}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
