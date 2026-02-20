import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";

interface InventoryProfile {
  id: number;
  profileId: string;
  name: string;
  description: string | null;
  inventoryConfig: any;
  formatIds: string[];
  publisherProperties: any;
}

export default function InventoryProfilesPage() {
  const [profiles, setProfiles] = useState<InventoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [formProfileId, setFormProfileId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInventoryConfig, setFormInventoryConfig] = useState("");
  const [formFormatIds, setFormFormatIds] = useState("");
  const [formPublisherProperties, setFormPublisherProperties] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      const data = await apiFetch<{ inventory_profiles: InventoryProfile[] }>("/inventory-profiles");
      setProfiles(data.inventory_profiles);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingId(null);
    setFormProfileId("");
    setFormName("");
    setFormDescription("");
    setFormInventoryConfig("{}");
    setFormFormatIds("");
    setFormPublisherProperties("{}");
    setModalOpen(true);
  }

  function handleEdit(p: InventoryProfile) {
    setEditingId(p.id);
    setFormProfileId(p.profileId);
    setFormName(p.name);
    setFormDescription(p.description || "");
    setFormInventoryConfig(JSON.stringify(p.inventoryConfig, null, 2));
    setFormFormatIds(p.formatIds.join(", "));
    setFormPublisherProperties(JSON.stringify(p.publisherProperties, null, 2));
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this profile?")) return;
    try {
      await apiFetch(`/inventory-profiles/${id}`, { method: "DELETE" });
      loadProfiles();
    } catch (err: any) {
      alert("Error deleting profile: " + err.message);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = {
        profile_id: formProfileId,
        name: formName,
        description: formDescription,
        inventory_config: formInventoryConfig,
        format_ids: formFormatIds,
        publisher_properties: formPublisherProperties,
      };

      if (editingId) {
        await apiFetch(`/inventory-profiles/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/inventory-profiles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      loadProfiles();
    } catch (err: any) {
      alert("Error saving profile: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading inventory profiles...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Profiles</h1>
        <button
          onClick={handleCreate}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Create Profile
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profile ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format IDs</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {profiles.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.profileId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.formatIds?.join(", ")}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No inventory profiles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        title={editingId ? "Edit Inventory Profile" : "Create Inventory Profile"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Profile ID</label>
            <input
              type="text"
              value={formProfileId}
              onChange={(e) => setFormProfileId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g. prof-123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g. Main Web Profile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Format IDs (comma separated)</label>
            <input
              type="text"
              value={formFormatIds}
              onChange={(e) => setFormFormatIds(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g. banner_300x250, video_instream"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Inventory Config (JSON)</label>
            <textarea
              rows={4}
              value={formInventoryConfig}
              onChange={(e) => setFormInventoryConfig(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Publisher Properties (JSON)</label>
            <textarea
              rows={4}
              value={formPublisherProperties}
              onChange={(e) => setFormPublisherProperties(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
