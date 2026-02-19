import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Creative {
  creative_id: string;
  name: string;
  format: string;
  status: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<{ creatives: Creative[] }>("/creatives")
      .then((res) => setCreatives(res.creatives ?? []))
      .catch(() => setCreatives([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleAction(creativeId: string, action: "approve" | "reject") {
    apiFetch(`/creatives/${creativeId}/${action}`, { method: "POST" })
      .then(() => load())
      .catch(() => {});
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Creatives</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Creative ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Format</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={5} />
            ) : creatives.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No creatives found
                </td>
              </tr>
            ) : (
              creatives.map((c) => (
                <tr key={c.creative_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{c.creative_id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {c.format}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    {c.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAction(c.creative_id, "approve")}
                          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(c.creative_id, "reject")}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
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
