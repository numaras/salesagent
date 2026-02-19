import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Input, Textarea } from "../components/FormField";
import FormSelect from "../components/FormSelect";
import ConfirmDialog from "../components/ConfirmDialog";

interface Product {
  id: string;
  product_id?: string;
  name: string;
  description?: string;
  delivery_type?: string;
  pricing_models?: { model: string; rate: number; currency: string }[];
}

const DELIVERY_TYPES = [
  { value: "guaranteed", label: "Guaranteed" },
  { value: "non_guaranteed", label: "Non-Guaranteed" },
];

const PRICING_MODELS = [
  { value: "cpm", label: "CPM" },
  { value: "cpc", label: "CPC" },
  { value: "vcpm", label: "vCPM" },
  { value: "cpcv", label: "CPCV" },
  { value: "flat_rate", label: "Flat Rate" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("USD");

  function load() {
    setLoading(true);
    apiFetch<{ products: Product[] }>("/products")
      .then((res) => setProducts(res.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setDeliveryType("");
    setPricingModel("");
    setRate("");
    setCurrency("USD");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setDeliveryType(p.delivery_type ?? "");
    const pricing = p.pricing_models?.[0];
    setPricingModel(pricing?.model ?? "");
    setRate(pricing?.rate?.toString() ?? "");
    setCurrency(pricing?.currency ?? "USD");
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tenant_id: "default",
        name: name.trim(),
        description: description.trim(),
        delivery_type: deliveryType || "guaranteed",
        format_ids: [],
        targeting_template: {},
      };

      if (pricingModel && rate) {
        body.pricing_models = [{ model: pricingModel, rate: parseFloat(rate), currency }];
      }

      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.product_id ?? editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        body.product_id = crypto.randomUUID();
        await apiFetch("/products", {
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
    if (!showDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/products/${showDelete}`, { method: "DELETE" });
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
        <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Add Product
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Delivery Type</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <TableSkeleton cols={4} rows={3} />
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">No products found</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{p.description || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {p.delivery_type ?? "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button onClick={() => openEdit(p)} className="font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                    <button onClick={() => setShowDelete(p.product_id ?? p.id)} className="font-medium text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        title={editingProduct ? "Edit Product" : "Add Product"}
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saving={saving}
      >
        <FormField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" required />
        </FormField>
        <FormField label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description" rows={3} />
        </FormField>
        <FormField label="Delivery Type">
          <FormSelect options={DELIVERY_TYPES} value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} placeholder="Select delivery type" />
        </FormField>
        <FormField label="Pricing Model">
          <FormSelect options={PRICING_MODELS} value={pricingModel} onChange={(e) => setPricingModel(e.target.value)} placeholder="Select pricing model" />
        </FormField>
        <FormField label="Rate">
          <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0.00" min="0" step="0.01" />
        </FormField>
        <FormField label="Currency">
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={showDelete !== null}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(null)}
        confirming={deleting}
      />
    </div>
  );
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
