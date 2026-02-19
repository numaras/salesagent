import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface InventoryItem {
  id: number;
  inventory_type: string;
  inventory_id: string;
  name: string;
  status: string;
  last_synced?: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  archived: "bg-red-50 text-red-700",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<{ inventory: InventoryItem[] }>("/inventory")
      .then((res) => setItems(res.inventory ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleSync() {
    setSyncing(true);
    apiFetch("/inventory/sync", { method: "POST" })
      .then(() => load())
      .catch(() => {})
      .finally(() => setSyncing(false));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Inventory</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Inventory"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Inventory ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Last Synced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={5} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No inventory items found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {item.inventory_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{item.inventory_id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.last_synced ? new Date(item.last_synced).toLocaleString() : "—"}
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
