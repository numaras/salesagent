import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import FormModal from "../components/FormModal";
import FormField, { Textarea } from "../components/FormField";

interface WorkflowStepDetail {
  step_id: string;
  context_id: string;
  step_type: string;
  tool_name: string | null;
  request_data: any;
  response_data: any;
  status: string;
  owner: string;
  assigned_to: string | null;
  created_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  requires_approval: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-700",
};

export default function WorkflowReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WorkflowStepDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function load() {
    setLoading(true);
    apiFetch<WorkflowStepDetail>(`/workflows/${id}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function handleApprove() {
    if (!id) return;
    setActing(true);
    try {
      await apiFetch(`/workflows/${id}/approve`, { method: "POST" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!id || !rejectReason.trim()) return;
    setActing(true);
    try {
      await apiFetch(`/workflows/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      setShowRejectModal(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <Link to="/workflows" className="mb-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
          &larr; Back to workflows
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-500">Workflow step not found.</p>
        </div>
      </div>
    );
  }

  const isPending = detail.status === "pending" || detail.status === "requires_approval";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/workflows")}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            &larr;
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Workflow Review</h2>
            <p className="text-sm text-gray-500">Step ID: <span className="font-mono">{detail.step_id}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColors[detail.status] ?? "bg-gray-100 text-gray-700"}`}>
            {detail.status}
          </span>
          {isPending && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={acting}
                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={acting}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 shadow-sm disabled:opacity-50"
              >
                {acting ? "Processing..." : "Approve"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="font-medium text-gray-900">Details</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</p>
                <p className="mt-1 text-sm text-gray-900">{detail.step_type}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</p>
                <p className="mt-1 text-sm text-gray-900">{detail.owner}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tool</p>
                <p className="mt-1 text-sm text-gray-900 font-mono">{detail.tool_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</p>
                <p className="mt-1 text-sm text-gray-900">{detail.assigned_to ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
              <p className="mt-1 text-sm text-gray-900">{detail.created_at ? new Date(detail.created_at).toLocaleString() : "—"}</p>
            </div>
            {detail.completed_at && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</p>
                <p className="mt-1 text-sm text-gray-900">{new Date(detail.completed_at).toLocaleString()}</p>
              </div>
            )}
            {detail.error_message && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-xs font-medium text-red-800 uppercase tracking-wider mb-1">Error / Reason</p>
                <p className="text-sm text-red-900 whitespace-pre-wrap">{detail.error_message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col h-full">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="font-medium text-gray-900">Request Data</h3>
          </div>
          <div className="p-0 flex-1 overflow-hidden">
            <pre className="h-full max-h-[500px] overflow-auto p-4 text-xs font-mono text-gray-800 bg-gray-50">
              {detail.request_data ? JSON.stringify(detail.request_data, null, 2) : "No request data available"}
            </pre>
          </div>
        </div>
      </div>

      <FormModal
        title="Reject Workflow Step"
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSave={handleReject}
        saving={acting}
      >
        <FormField label="Reason for rejection">
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Please provide a reason..."
            required
          />
        </FormField>
      </FormModal>
    </div>
  );
}
