import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function LineItemViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/gam/line-item/${id}`);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load line item");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      load();
    }
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">GAM Line Item Viewer</h1>

      <div className="bg-white p-6 shadow rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Diagnostics for Line Item: {id}
        </h2>
        <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm border border-gray-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}