import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface MediaBuy {
  id: string;
  advertiser_name?: string;
  status?: string;
  budget?: number;
  currency?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-50 text-yellow-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
};

export default function MediaBuysPage() {
  const [buys, setBuys] = useState<MediaBuy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ media_buys: MediaBuy[] }>("/media-buys")
      .then((res) => setBuys(res.media_buys ?? []))
      .catch(() => setBuys([]))
      .finally(() => setLoading(false));
  }, []);

  function formatBudget(buy: MediaBuy) {
    if (buy.budget == null) return "—";
    const currency = buy.currency ?? "USD";
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(buy.budget);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Media Buys</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Advertiser</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Budget</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows />
            ) : buys.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No media buys found
                </td>
              </tr>
            ) : (
              buys.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{b.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{b.advertiser_name ?? "—"}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[b.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {b.status ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums text-gray-700">
                    {formatBudget(b)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button className="font-medium text-indigo-600 hover:text-indigo-800">
                      View
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

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          {[1, 2, 3, 4, 5].map((c) => (
            <td key={c} className="px-6 py-4">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
