import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Input, Textarea } from "../components/FormField";
import FormSelect from "../components/FormSelect";
import ConfirmDialog from "../components/ConfirmDialog";

interface PricingOption {
  pricing_model: string;
  rate: number | string;
  currency: string;
}

interface Product {
  id: string;
  product_id?: string;
  name: string;
  description?: string;
  delivery_type?: string;
  format_ids?: string[];
  targeting_template?: any;
  pricing_options?: PricingOption[];
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
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [formatIdsStr, setFormatIdsStr] = useState("");
  const [targetingTemplateStr, setTargetingTemplateStr] = useState("{}");
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);

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
    setFormatIdsStr("");
    setTargetingTemplateStr("{}");
    setPricingOptions([]);
    setShowForm(true);
  }

  async function openEdit(p: Product) {
    setFetchingDetails(true);
    try {
      const fullProduct = await apiFetch<Product>(`/products/${p.product_id ?? p.id}`);
      setEditingProduct(fullProduct);
      setName(fullProduct.name);
      setDescription(fullProduct.description ?? "");
      setDeliveryType(fullProduct.delivery_type ?? "");
      setFormatIdsStr(fullProduct.format_ids?.join(", ") ?? "");
      setTargetingTemplateStr(JSON.stringify(fullProduct.targeting_template ?? {}, null, 2));
      setPricingOptions(fullProduct.pricing_options ?? []);
      setShowForm(true);
    } catch (e) {
      alert("Failed to fetch product details");
    } finally {
      setFetchingDetails(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { alert("Name is required"); return; }
    
    let targeting_template = {};
    try {
      if (targetingTemplateStr.trim()) {
        targeting_template = JSON.parse(targetingTemplateStr);
      }
    } catch (e) {
      alert("Targeting Template must be valid JSON");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        delivery_type: deliveryType || "guaranteed",
        format_ids: formatIdsStr.split(",").map(s => s.trim()).filter(Boolean),
        targeting_template,
        pricing_options: pricingOptions.map(po => ({
          pricing_model: po.pricing_model,
          rate: typeof po.rate === "string" ? parseFloat(po.rate) : po.rate,
          currency: po.currency || "USD"
        })).filter(po => po.pricing_model && po.rate !== null && !isNaN(po.rate))
      };

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

  function addPricingOption() {
    setPricingOptions([...pricingOptions, { pricing_model: "", rate: "", currency: "USD" }]);
  }

  function updatePricingOption(index: number, field: keyof PricingOption, value: string) {
    const newOptions = [...pricingOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setPricingOptions(newOptions);
  }

  function removePricingOption(index: number) {
    setPricingOptions(pricingOptions.filter((_, i) => i !== index));
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
                <tr key={p.product_id ?? p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{p.description || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {p.delivery_type ?? "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button 
                      onClick={() => openEdit(p)} 
                      disabled={fetchingDetails}
                      className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setShowDelete(p.product_id ?? p.id)} 
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
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
        <div className="space-y-4">
          <FormField label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" required />
          </FormField>
          
          <FormField label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description" rows={3} />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Delivery Type">
              <FormSelect options={DELIVERY_TYPES} value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} placeholder="Select delivery type" />
            </FormField>
            
            <FormField label="Formats (comma-separated IDs)">
              <Input value={formatIdsStr} onChange={(e) => setFormatIdsStr(e.target.value)} placeholder="video_in_stream, display_banner" />
            </FormField>
          </div>

          <FormField label="Targeting Builder (JSON Template)">
            <Textarea 
              value={targetingTemplateStr} 
              onChange={(e) => setTargetingTemplateStr(e.target.value)} 
              placeholder="{}" 
              rows={4} 
              className="font-mono text-sm"
            />
          </FormField>

          <div className="pt-2 border-t border-gray-200 mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-900">Pricing Options</h3>
              <button 
                type="button"
                onClick={addPricingOption}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
              >
                + Add Option
              </button>
            </div>
            
            {pricingOptions.length === 0 ? (
              <p className="text-sm text-gray-500 italic mb-2">No pricing options configured.</p>
            ) : (
              <div className="space-y-3">
                {pricingOptions.map((po, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Model</label>
                      <FormSelect 
                        options={PRICING_MODELS} 
                        value={po.pricing_model} 
                        onChange={(e) => updatePricingOption(idx, "pricing_model", e.target.value)} 
                        placeholder="Model" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Rate</label>
                      <Input 
                        type="number" 
                        value={po.rate.toString()} 
                        onChange={(e) => updatePricingOption(idx, "rate", e.target.value)} 
                        placeholder="0.00" 
                        min="0" 
                        step="0.01" 
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Currency</label>
                      <Input 
                        value={po.currency} 
                        onChange={(e) => updatePricingOption(idx, "currency", e.target.value.toUpperCase())} 
                        placeholder="USD" 
                      />
                    </div>
                    <div className="pt-5">
                      <button 
                        type="button"
                        onClick={() => removePricingOption(idx)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Remove option"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
