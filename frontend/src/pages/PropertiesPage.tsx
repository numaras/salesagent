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

interface PublisherPartner {
  id: number;
  publisher_domain: string;
  display_name: string | null;
  is_verified: boolean;
  sync_status: string | null;
  last_synced_at: string | null;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<"properties" | "partners">("properties");

  const [properties, setProperties] = useState<Property[]>([]);
  const [partners, setPartners] = useState<PublisherPartner[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showPartnerDelete, setShowPartnerDelete] = useState<number | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);

  // Property form state
  const [propertyType, setPropertyType] = useState("");
  const [name, setName] = useState("");
  const [publisherDomain, setPublisherDomain] = useState("");
  const [identifierType, setIdentifierType] = useState("domain");
  const [identifierValue, setIdentifierValue] = useState("");

  // Partner form state
  const [partnerDomain, setPartnerDomain] = useState("");
  const [partnerDisplayName, setPartnerDisplayName] = useState("");

  function loadProperties() {
    setLoading(true);
    apiFetch<{ properties: Property[] }>("/properties")
      .then((res) => setProperties(res.properties ?? []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }

  function loadPartners() {
    setLoading(true);
    apiFetch<{ publisher_partners: PublisherPartner[] }>("/publisher-partners")
      .then((res) => setPartners(res.publisher_partners ?? []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (activeTab === "properties") {
      loadProperties();
    } else {
      loadPartners();
    }
  }, [activeTab]);

  function openCreateProperty() {
    setPropertyType("");
    setName("");
    setPublisherDomain("");
    setIdentifierType("domain");
    setIdentifierValue("");
    setShowForm(true);
  }

  function openCreatePartner() {
    setPartnerDomain("");
    setPartnerDisplayName("");
    setShowPartnerForm(true);
  }

  async function handleSaveProperty() {
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
      loadProperties();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePartner() {
    if (!partnerDomain.trim()) { alert("Publisher Domain is required"); return; }
    setSaving(true);
    try {
      const body = {
        publisher_domain: partnerDomain.trim(),
        display_name: partnerDisplayName.trim() || null,
      };
      await apiFetch("/publisher-partners", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setShowPartnerForm(false);
      loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProperty() {
    if (!showDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/properties/${showDelete}`, { method: "DELETE" });
      setShowDelete(null);
      loadProperties();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeletePartner() {
    if (showPartnerDelete === null) return;
    setDeleting(true);
    try {
      await apiFetch(`/publisher-partners/${showPartnerDelete}`, { method: "DELETE" });
      setShowPartnerDelete(null);
      loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleVerifyProperty(propertyId: string) {
    setVerifying(propertyId);
    try {
      await apiFetch(`/properties/${propertyId}/verify`, { method: "POST" });
      loadProperties();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(null);
    }
  }

  async function handleSyncPartner(id: number) {
    setSyncing(id);
    try {
      await apiFetch(`/publisher-partners/${id}/sync`, { method: "POST" });
      loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Properties & Partners</h2>
          <div className="mt-4 flex space-x-4 border-b border-gray-200">
            <button
              className={`pb-2 text-sm font-medium ${activeTab === "properties" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("properties")}
            >
              Properties
            </button>
            <button
              className={`pb-2 text-sm font-medium ${activeTab === "partners" ? "border-b-2 border-indigo-500 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
              onClick={() => setActiveTab("partners")}
            >
              Publisher Partners
            </button>
          </div>
        </div>
        <div>
          {activeTab === "properties" ? (
            <button
              onClick={openCreateProperty}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Add Property
            </button>
          ) : (
            <button
              onClick={openCreatePartner}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Add Partner
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          {activeTab === "properties" ? (
            <>
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
                      <td className="px-6 py-4 text-right text-sm space-x-3">
                        <button 
                          onClick={() => handleVerifyProperty(p.property_id)} 
                          disabled={verifying === p.property_id}
                          className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                          {verifying === p.property_id ? "Verifying..." : "Verify"}
                        </button>
                        <button onClick={() => setShowDelete(p.property_id)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          ) : (
            <>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Verified</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Last Synced</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <SkeletonRows cols={6} />
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No partners found</td>
                  </tr>
                ) : (
                  partners.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500">{p.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {p.publisher_domain}
                        {p.display_name && <span className="block text-xs text-gray-500">{p.display_name}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.is_verified ? "Yes" : "No"}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.sync_status === "success" ? "bg-green-50 text-green-700" : p.sync_status === "failed" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                          {p.sync_status || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {p.last_synced_at ? new Date(p.last_synced_at).toLocaleString() : "Never"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-3">
                        <button 
                          onClick={() => handleSyncPartner(p.id)} 
                          disabled={syncing === p.id}
                          className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                          {syncing === p.id ? "Syncing..." : "Sync"}
                        </button>
                        <button onClick={() => setShowPartnerDelete(p.id)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      {/* Property Modal */}
      <FormModal
        title="Add Property"
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveProperty}
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

      {/* Partner Modal */}
      <FormModal
        title="Add Publisher Partner"
        open={showPartnerForm}
        onClose={() => setShowPartnerForm(false)}
        onSave={handleSavePartner}
        saving={saving}
      >
        <FormField label="Publisher Domain">
          <Input value={partnerDomain} onChange={(e) => setPartnerDomain(e.target.value)} placeholder="example.com" required />
        </FormField>
        <FormField label="Display Name (Optional)">
          <Input value={partnerDisplayName} onChange={(e) => setPartnerDisplayName(e.target.value)} placeholder="Example Publisher" />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={showDelete !== null}
        title="Delete Property"
        message="Are you sure you want to delete this property? This action cannot be undone."
        onConfirm={handleDeleteProperty}
        onCancel={() => setShowDelete(null)}
        confirming={deleting}
      />

      <ConfirmDialog
        open={showPartnerDelete !== null}
        title="Delete Partner"
        message="Are you sure you want to delete this publisher partner? This action cannot be undone."
        onConfirm={handleDeletePartner}
        onCancel={() => setShowPartnerDelete(null)}
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
