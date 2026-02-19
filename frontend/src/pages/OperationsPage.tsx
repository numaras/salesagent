import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface MediaBuyOp {
  media_buy_id: string;
  order_name: string;
  advertiser_name?: string;
  status: string;
  budget?: number;
  currency?: string;
  created_at?: string;
}

interface WebhookOp {
  delivery_id: string;
  webhook_url: string;
  event_type: string;
  status: string;
  attempts: number;
  response_code?: number;
  created_at?: string;
}

const buyStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-50 text-yellow-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
};

const webhookStatusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  delivered: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

type Tab = "media-buys" | "webhooks";

export default function OperationsPage() {
  const [tab, setTab] = useState<Tab>("media-buys");
  const [buys, setBuys] = useState<MediaBuyOp[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookOp[]>([]);
  const [loadingBuys, setLoadingBuys] = useState(true);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);

  useEffect(() => {
    apiFetch<{ media_buys: MediaBuyOp[] }>("/operations/media-buys")
      .then((res) => setBuys(res.media_buys ?? []))
      .catch(() => setBuys([]))
      .finally(() => setLoadingBuys(false));

    apiFetch<{ webhooks: WebhookOp[] }>("/operations/webhooks")
      .then((res) => setWebhooks(res.webhooks ?? []))
      .catch(() => setWebhooks([]))
      .finally(() => setLoadingWebhooks(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Operations</h2>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setTab("media-buys")}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "media-buys"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Media Buys
          </button>
          <button
            onClick={() => setTab("webhooks")}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "webhooks"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Webhooks
          </button>
        </nav>
      </div>

      {tab === "media-buys" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Advertiser</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingBuys ? (
                <SkeletonRows cols={6} />
              ) : buys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                    No media buys found
                  </td>
                </tr>
              ) : (
                buys.map((b) => (
                  <tr key={b.media_buy_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{b.media_buy_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{b.order_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{b.advertiser_name ?? "—"}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${buyStatusColors[b.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums text-gray-700">
                      {b.budget != null
                        ? new Intl.NumberFormat("en-US", { style: "currency", currency: b.currency ?? "USD" }).format(Number(b.budget))
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Delivery ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">HTTP Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingWebhooks ? (
                <SkeletonRows cols={6} />
              ) : webhooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                    No webhook deliveries found
                  </td>
                </tr>
              ) : (
                webhooks.map((w) => (
                  <tr key={w.delivery_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{w.delivery_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{w.event_type}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${webhookStatusColors[w.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm tabular-nums text-gray-700">{w.attempts}</td>
                    <td className="px-6 py-4 text-sm tabular-nums text-gray-700">{w.response_code ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {w.created_at ? new Date(w.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
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
