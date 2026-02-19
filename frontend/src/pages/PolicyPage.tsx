import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface PolicyData {
  tenant_id: string;
  brand_manifest_policy: string;
  ad_server?: string;
}

export default function PolicyPage() {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [policyText, setPolicyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<PolicyData>("/policy")
      .then((res) => {
        setPolicy(res);
        setPolicyText(JSON.stringify(res, null, 2));
      })
      .catch(() => setPolicy(null))
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    setSaving(true);
    setSaved(false);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(policyText) as Record<string, unknown>;
    } catch {
      setSaving(false);
      return;
    }

    apiFetch<PolicyData>("/policy", {
      method: "POST",
      body: JSON.stringify({
        brand_manifest_policy: parsed.brand_manifest_policy ?? policy?.brand_manifest_policy,
      }),
    })
      .then((res) => {
        setPolicy(res);
        setPolicyText(JSON.stringify(res, null, 2));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  if (loading) {
    return (
      <div>
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Policy</h2>
        <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Policy</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Policy Configuration (JSON)
          </label>
          <textarea
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
