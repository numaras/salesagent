import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Product {
  id: string;
  name: string;
  delivery_type?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ products: Product[] }>("/products")
      .then((res) => setProducts(res.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Products</h2>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
          Add Product
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Delivery Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <TableSkeleton cols={3} rows={3} />
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {p.delivery_type ?? "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button className="font-medium text-indigo-600 hover:text-indigo-800">
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
