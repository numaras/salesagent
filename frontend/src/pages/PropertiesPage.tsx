import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Property {
  property_id: string;
  name: string;
  publisher_domain: string;
  property_type: string;
  verification_status: string;
}

const verificationColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  verified: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<{ properties: Property[] }>("/properties")
      .then((res) => setProperties(res.properties ?? []))
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
          Add Property
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Property ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={5} />
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No properties found
                </td>
              </tr>
            ) : (
              properties.map((p) => (
                <tr key={p.property_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{p.property_id}</td>
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
