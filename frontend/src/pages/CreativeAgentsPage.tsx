import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Input } from "../components/FormField";
import ConfirmDialog from "../components/ConfirmDialog";

interface CreativeAgent {
  id: number;
  name: string;
  agent_url: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  auth_type?: string;
  auth_credentials?: string;
}

export default function CreativeAgentsPage() {
  const [agents, setAgents] = useState<CreativeAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CreativeAgent | null>(null);
  const [showDelete, setShowDelete] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [agentUrl, setAgentUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [priority, setPriority] = useState("10");
  const [timeout, setTimeout_] = useState("30");
  const [authType, setAuthType] = useState("");
  const [authCredentials, setAuthCredentials] = useState("");

  function load() {
    setLoading(true);
    apiFetch<{ creative_agents: CreativeAgent[] }>("/creative-agents")
      .then((res) => setAgents(res.creative_agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingAgent(null);
    setName("");
    setAgentUrl("");
    setEnabled(true);
    setPriority("10");
    setTimeout_("30");
    setAuthType("");
    setAuthCredentials("");
    setShowForm(true);
  }

  function openEdit(a: CreativeAgent) {
    setEditingAgent(a);
    setName(a.name);
    setAgentUrl(a.agent_url);
    setEnabled(a.enabled);
    setPriority(String(a.priority));
    setTimeout_(String(a.timeout));
    setAuthType(a.auth_type ?? "");
    setAuthCredentials(a.auth_credentials ?? "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    if (!agentUrl.trim()) { alert("Agent URL is required"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tenant_id: "default",
        name: name.trim(),
        agent_url: agentUrl.trim(),
        enabled,
        priority: parseInt(priority, 10) || 10,
        timeout: parseInt(timeout, 10) || 30,
      };
      if (authType.trim()) body.auth_type = authType.trim();
      if (authCredentials.trim()) body.auth_credentials = authCredentials.trim();

      if (editingAgent) {
        await apiFetch(`/creative-agents/${editingAgent.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/creative-agents", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (showDelete === null) return;
    setDeleting(true);
    try {
      await apiFetch(`/creative-agents/${showDelete}`, { method: "DELETE" });
      setShowDelete(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function toggleEnabled(agent: CreativeAgent) {
    apiFetch(`/creative-agents/${agent.id}`, {
      method: "PUT",
      body: JSON.stringify({ enabled: !agent.enabled }),
    })
      .then(() => load())
      .catch((e) => alert(e instanceof Error ? e.message : "Toggle failed"));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Creative Agents</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Add Agent
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">URL</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Enabled</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Timeout</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={6} />
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No creative agents found</td>
              </tr>
            ) : (
              agents.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono truncate max-w-xs">{a.agent_url}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => toggleEnabled(a)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${a.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${a.enabled ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm tabular-nums text-gray-700">{a.priority}</td>
                  <td className="px-6 py-4 text-sm tabular-nums text-gray-700">{a.timeout}s</td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => openEdit(a)} className="font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => setShowDelete(a.id)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        title={editingAgent ? "Edit Agent" : "Add Agent"}
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saving={saving}
      >
        <FormField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" required />
        </FormField>
        <FormField label="Agent URL">
          <Input value={agentUrl} onChange={(e) => setAgentUrl(e.target.value)} placeholder="https://agent.example.com" required />
        </FormField>
        <FormField label="Enabled">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Agent is enabled</span>
          </label>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} min="0" />
          </FormField>
          <FormField label="Timeout (seconds)">
            <Input type="number" value={timeout} onChange={(e) => setTimeout_(e.target.value)} min="1" />
          </FormField>
        </div>
        <FormField label="Auth Type">
          <Input value={authType} onChange={(e) => setAuthType(e.target.value)} placeholder="Optional (e.g. bearer, api_key)" />
        </FormField>
        <FormField label="Auth Credentials">
          <Input value={authCredentials} onChange={(e) => setAuthCredentials(e.target.value)} placeholder="Optional" />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={showDelete !== null}
        title="Delete Agent"
        message="Are you sure you want to delete this creative agent? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(null)}
        confirming={deleting}
      />
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map((r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
