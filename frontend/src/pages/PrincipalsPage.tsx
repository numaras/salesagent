import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Input } from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";

interface Principal {
  id: string;
  principal_id?: string;
  name: string;
  access_token?: string;
  platform_mappings?: { google_ad_manager?: { advertiser_id?: string } };
}

export default function PrincipalsPage() {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrincipal, setEditingPrincipal] = useState<Principal | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [gamAdvertiserId, setGamAdvertiserId] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiFetch<{ principals: Principal[] }>("/principals")
      .then((res) => setPrincipals(res.principals ?? []))
      .catch(() => setPrincipals([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingPrincipal(null);
    setName("");
    setGamAdvertiserId("");
    setCreatedToken(null);
    setShowForm(true);
  }

  function openEdit(p: Principal) {
    setEditingPrincipal(p);
    setName(p.name);
    setGamAdvertiserId(p.platform_mappings?.google_ad_manager?.advertiser_id ?? "");
    setCreatedToken(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      if (editingPrincipal) {
        const body: Record<string, unknown> = {
          name: name.trim(),
          platform_mappings: gamAdvertiserId.trim()
            ? { google_ad_manager: { advertiser_id: gamAdvertiserId.trim() } }
            : {},
        };
        await apiFetch(`/principals/${editingPrincipal.principal_id ?? editingPrincipal.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setShowForm(false);
      } else {
        const token = crypto.randomUUID();
        const body = {
          tenant_id: "default",
          principal_id: crypto.randomUUID().slice(0, 8),
          name: name.trim(),
          access_token: token,
          platform_mappings: gamAdvertiserId.trim()
            ? { google_ad_manager: { advertiser_id: gamAdvertiserId.trim() } }
            : {},
        };
        await apiFetch("/principals", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setCreatedToken(token);
      }
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!showDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/principals/${showDelete}`, { method: "DELETE" });
      setShowDelete(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function maskToken(token?: string) {
    if (!token) return "—";
    if (token.length <= 8) return token;
    return token.slice(0, 4) + "••••" + token.slice(-4);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Principals</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Add Principal
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Principal ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Access Token</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows />
            ) : principals.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No principals found</td>
              </tr>
            ) : (
              principals.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{p.principal_id ?? p.id}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{maskToken(p.access_token)}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => openEdit(p)} className="font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => setShowDelete(p.principal_id ?? p.id)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        title={editingPrincipal ? "Edit Principal" : "Add Principal"}
        open={showForm}
        onClose={() => { setShowForm(false); setCreatedToken(null); }}
        onSave={createdToken ? () => { setShowForm(false); setCreatedToken(null); } : handleSave}
        saving={saving}
      >
        {createdToken ? (
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-800">Save this token! It won't be shown again.</p>
            <code className="block break-all rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 border">{createdToken}</code>
          </div>
        ) : (
          <>
            <FormField label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Principal name" required />
            </FormField>
            <FormField label="GAM Advertiser ID">
              <Input value={gamAdvertiserId} onChange={(e) => setGamAdvertiserId(e.target.value)} placeholder="Optional" />
            </FormField>
          </>
        )}
      </FormModal>

      <ConfirmDialog
        open={showDelete !== null}
        title="Delete Principal"
        message="Are you sure you want to delete this principal? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(null)}
        confirming={deleting}
      />
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-48 animate-pulse rounded bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-12 ml-auto animate-pulse rounded bg-gray-200" /></td>
        </tr>
      ))}
    </>
  );
}
