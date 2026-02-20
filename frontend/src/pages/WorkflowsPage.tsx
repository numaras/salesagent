import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface WorkflowStep {
  step_id: string;
  step_type: string;
  status: string;
  owner: string;
  assigned_to?: string;
  created_at?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-blue-50 text-blue-700",
};

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<{ workflows: WorkflowStep[] }>("/workflows")
      .then((res) => setWorkflows(res.workflows ?? []))
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleAction(stepId: string, action: "approve" | "reject") {
    apiFetch(`/workflows/${stepId}/${action}`, { method: "POST" })
      .then(() => load())
      .catch(() => {});
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Workflows</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Step ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Created At</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={6} />
            ) : workflows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                  No workflow steps found
                </td>
              </tr>
            ) : (
              workflows.map((w) => (
                <tr 
                  key={w.step_id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/workflows/${w.step_id}`)}
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{w.step_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{w.step_type}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[w.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{w.owner}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{w.created_at ? new Date(w.created_at).toLocaleString() : "—"}</td>
                  <td className="px-6 py-4 text-right text-sm space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workflows/${w.step_id}`);
                      }}
                      className="font-medium text-indigo-600 hover:text-indigo-800 mr-2"
                    >
                      View
                    </button>
                    {(w.status === "pending" || w.status === "requires_approval") && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(w.step_id, "approve"); }}
                          className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(w.step_id, "reject"); }}
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
