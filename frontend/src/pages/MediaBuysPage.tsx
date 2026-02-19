import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface MediaBuy {
  media_buy_id: string;
  order_name: string;
  advertiser_name: string;
  status: string;
  budget: number | null;
  currency: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface MediaBuyDetail extends MediaBuy {
  principal_id: string;
  buyer_ref: string | null;
  updated_at: string;
  packages: {
    package_id: string;
    budget: number | null;
    package_config: Record<string, unknown>;
  }[];
  workflow_mappings: {
    step_id: string;
    action: string;
    created_at: string;
  }[];
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-50 text-yellow-700",
  pending_approval: "bg-yellow-50 text-yellow-700",
  active: "bg-green-50 text-green-700",
  approved: "bg-green-50 text-green-700",
  paused: "bg-orange-50 text-orange-700",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-blue-50 text-blue-700",
};

export default function MediaBuysPage() {
  const [buys, setBuys] = useState<MediaBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function loadList() {
    setLoading(true);
    apiFetch<{ media_buys: MediaBuy[] }>("/media-buys")
      .then((res) => setBuys(res.media_buys ?? []))
      .catch(() => setBuys([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadList(); }, []);

  if (selectedId) {
    return (
      <MediaBuyDetail
        mediaBuyId={selectedId}
        onBack={() => { setSelectedId(null); loadList(); }}
      />
    );
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
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Order Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Advertiser</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Budget</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Dates</th>
              <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows />
            ) : buys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                  No media buys found
                </td>
              </tr>
            ) : (
              buys.map((b) => (
                <tr
                  key={b.media_buy_id}
                  onClick={() => setSelectedId(b.media_buy_id)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 text-sm font-mono text-gray-900 max-w-[120px] truncate">{b.media_buy_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{b.order_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{b.advertiser_name ?? "—"}</td>
                  <td className="px-6 py-4 text-sm">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums text-gray-700">
                    {formatBudget(b.budget, b.currency)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {b.start_date} &ndash; {b.end_date}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedId(b.media_buy_id); }}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
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

/* ───── Detail View ───── */

function MediaBuyDetail({ mediaBuyId, onBack }: { mediaBuyId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<MediaBuyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  function loadDetail() {
    setLoading(true);
    apiFetch<MediaBuyDetail>(`/media-buys/${mediaBuyId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDetail(); }, [mediaBuyId]);

  const pendingStep = detail?.workflow_mappings?.find(
    (m) => m.action === "create_media_buy" || m.action === "approve",
  );

  async function handleApprove() {
    if (!pendingStep) return;
    setActing(true);
    try {
      await apiFetch(`/media-buys/${mediaBuyId}/approve`, {
        method: "POST",
        body: JSON.stringify({ step_id: pendingStep.step_id }),
      });
      loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!pendingStep) return;
    setActing(true);
    try {
      await apiFetch(`/media-buys/${mediaBuyId}/reject`, {
        method: "POST",
        body: JSON.stringify({ step_id: pendingStep.step_id, reason: "Rejected by admin" }),
      });
      loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-40 w-full animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <button onClick={onBack} className="mb-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">&larr; Back to list</button>
        <p className="text-sm text-gray-400">Unable to load media buy details.</p>
      </div>
    );
  }

  const canAct = ["draft", "pending", "pending_approval"].includes(detail.status) && pendingStep;

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm font-medium text-indigo-600 hover:text-indigo-800">
        &larr; Back to list
      </button>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{detail.order_name}</h2>
            <p className="text-sm text-gray-500 font-mono">{detail.media_buy_id}</p>
          </div>
          <StatusBadge status={detail.status} />
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-6 py-5">
          <Field label="Advertiser" value={detail.advertiser_name} />
          <Field label="Principal ID" value={detail.principal_id} mono />
          <Field label="Budget" value={formatBudget(detail.budget, detail.currency)} />
          <Field label="Currency" value={detail.currency} />
          <Field label="Start Date" value={detail.start_date} />
          <Field label="End Date" value={detail.end_date} />
          <Field label="Buyer Ref" value={detail.buyer_ref ?? "—"} mono />
          <Field label="Created" value={detail.created_at} />
        </div>

        {/* Packages */}
        {detail.packages.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">Packages</h3>
            <div className="space-y-2">
              {detail.packages.map((pkg) => (
                <div key={pkg.package_id} className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-mono text-gray-700">{pkg.package_id}</span>
                  <span className="text-sm tabular-nums text-gray-600">
                    {pkg.budget != null
                      ? formatBudget(Number(pkg.budget), detail.currency)
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {canAct && (
          <div className="flex gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl">
            <button
              onClick={handleApprove}
              disabled={acting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              {acting ? "Processing..." : "Approve"}
            </button>
            <button
              onClick={handleReject}
              disabled={acting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {acting ? "Processing..." : "Reject"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Shared helpers ───── */

function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className={`mt-1 text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function formatBudget(budget: number | null | undefined, currency?: string): string {
  if (budget == null) return "—";
  const cur = currency ?? "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(Number(budget));
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          {[1, 2, 3, 4, 5, 6, 7].map((c) => (
            <td key={c} className="px-6 py-4">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
