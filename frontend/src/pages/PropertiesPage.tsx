import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Input } from "../components/FormField";
import FormSelect from "../components/FormSelect";
import ConfirmDialog from "../components/ConfirmDialog";

interface Property {
  property_id: string;
  name: string;
  publisher_domain: string;
  property_type: string;
  verification_status: string;
  identifiers?: { type: string; value: string }[];
}

const PROPERTY_TYPES = [
  { value: "website", label: "Website" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "ctv_app", label: "CTV App" },
];

const verificationColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  verified: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [propertyType, setPropertyType] = useState("");
  const [name, setName] = useState("");
  const [publisherDomain, setPublisherDomain] = useState("");
  const [identifierType, setIdentifierType] = useState("domain");
  const [identifierValue, setIdentifierValue] = useState("");

  function load() {
    setLoading(true);
    apiFetch<{ properties: Property[] }>("/properties")
      .then((res) => setProperties(res.properties ?? []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setPropertyType("");
    setName("");
    setPublisherDomain("");
    setIdentifierType("domain");
    setIdentifierValue("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    if (!propertyType) { alert("Property type is required"); return; }
    setSaving(true);
    try {
      const body = {
        property_id: crypto.randomUUID().slice(0, 8),
        tenant_id: "default",
        property_type: propertyType,
        name: name.trim(),
        publisher_domain: publisherDomain.trim(),
        identifiers: identifierValue.trim()
          ? [{ type: identifierType.trim() || "domain", value: identifierValue.trim() }]
          : [],
        tags: [],
      };
      await apiFetch("/properties", {
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

  async function handleDelete() {
    if (!showDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/properties/${showDelete}`, { method: "DELETE" });
      setShowDelete(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Add Property
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Verification</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={5} />
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">No properties found</td>
              </tr>
            ) : (
              properties.map((p) => (
                <tr key={p.property_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.publisher_domain}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {p.property_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${verificationColors[p.verification_status] ?? "bg-gray-100 text-gray-700"}`}>
                      {p.verification_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button onClick={() => setShowDelete(p.property_id)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        title="Add Property"
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saving={saving}
      >
        <FormField label="Property Type">
          <FormSelect options={PROPERTY_TYPES} value={propertyType} onChange={(e) => setPropertyType(e.target.value)} placeholder="Select type" />
        </FormField>
        <FormField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Property name" required />
        </FormField>
        <FormField label="Publisher Domain">
          <Input value={publisherDomain} onChange={(e) => setPublisherDomain(e.target.value)} placeholder="example.com" />
        </FormField>
        <FormField label="Identifier Type">
          <Input value={identifierType} onChange={(e) => setIdentifierType(e.target.value)} placeholder="domain" />
        </FormField>
        <FormField label="Identifier Value">
          <Input value={identifierValue} onChange={(e) => setIdentifierValue(e.target.value)} placeholder="example.com" />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={showDelete !== null}
        title="Delete Property"
        message="Are you sure you want to delete this property? This action cannot be undone."
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
