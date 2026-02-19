import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Input } from "../components/FormField";
import FormSelect from "../components/FormSelect";

interface User {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  function load() {
    setLoading(true);
    apiFetch<{ users: User[] }>("/users")
      .then((res) => setUsers(res.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openInvite() {
    setEmail("");
    setName("");
    setRole("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!email.trim()) { alert("Email is required"); return; }
    setSaving(true);
    try {
      const body = {
        tenant_id: "default",
        user_id: crypto.randomUUID().slice(0, 8),
        email: email.trim(),
        name: name.trim() || email.trim().split("@")[0],
        role: role || "viewer",
        is_active: true,
      };
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setShowForm(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User) {
    const prev = users;
    setUsers((u) => u.map((x) => (x.id === user.id ? { ...x, is_active: !x.is_active } : x)));
    try {
      await apiFetch(`/users/${user.user_id ?? user.id}/toggle`, { method: "POST" });
      load();
    } catch (e) {
      setUsers(prev);
      alert(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        <button
          onClick={openInvite}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Invite User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No users found</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        u.is_active ? "bg-indigo-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                          u.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        title="Invite User"
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saving={saving}
      >
        <FormField label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
        </FormField>
        <FormField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional — defaults to email prefix" />
        </FormField>
        <FormField label="Role">
          <FormSelect options={ROLES} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Select role (default: viewer)" />
        </FormField>
      </FormModal>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          {[1, 2, 3, 4].map((c) => (
            <td key={c} className="px-6 py-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
