import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface DashboardData {
  products: number;
  principals: number;
  media_buys: number;
  active_users: number;
}

const fallback: DashboardData = {
  products: 0,
  principals: 0,
  media_buys: 0,
  active_users: 0,
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<DashboardData>("/tenants/default/dashboard")
      .then(setData)
      .catch(() => setData(fallback))
      .finally(() => setLoading(false));
  }, []);

  const cards: { label: string; value: number; color: string }[] = [
    { label: "Products", value: data.products, color: "bg-indigo-500" },
    { label: "Principals", value: data.principals, color: "bg-emerald-500" },
    { label: "Media Buys", value: data.media_buys, color: "bg-amber-500" },
    { label: "Active Users", value: data.active_users, color: "bg-rose-500" },
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Dashboard</h2>

      {/* Metric cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${card.color}`} />
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                card.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h3>
        <div className="flex flex-col items-center py-12 text-gray-400">
          <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm">No recent activity</p>
        </div>
      </div>
    </div>
  );
}
