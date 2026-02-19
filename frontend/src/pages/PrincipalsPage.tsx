import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Principal {
  id: string;
  name: string;
}

export default function PrincipalsPage() {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ principals: Principal[] }>("/principals")
      .then((res) => setPrincipals(res.principals ?? []))
      .catch(() => setPrincipals([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Principals</h2>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
          Add Principal
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
                ID
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows />
            ) : principals.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-400">
                  No principals found
                </td>
              </tr>
            ) : (
              principals.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{p.id}</td>
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
          <td className="px-6 py-4"><div className="h-4 w-32 animate-pulse rounded bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-48 animate-pulse rounded bg-gray-200" /></td>
          <td className="px-6 py-4"><div className="h-4 w-12 ml-auto animate-pulse rounded bg-gray-200" /></td>
        </tr>
      ))}
    </>
  );
}
