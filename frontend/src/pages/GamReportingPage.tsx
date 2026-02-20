import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { apiFetch } from "../lib/api";

interface FormatMetric {
  id: string;
  tenantId: string;
  formatName: string;
  periodStart: string;
  totalImpressions: number;
  totalRevenueMicros: number;
}

export default function GamReportingPage() {
  const [metrics, setMetrics] = useState<FormatMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ metrics: FormatMetric[] }>("/gam/reporting");
        // Convert string metrics back to numbers for charting if needed
        const mapped = data.metrics.map((m: any) => ({
          ...m,
          totalImpressions: Number(m.totalImpressions || m.total_impressions || 0),
          totalRevenueMicros: Number(m.totalRevenueMicros || m.total_revenue_micros || 0),
          periodStart: m.periodStart || m.period_start || "",
          formatName: m.formatName || m.format_name || ""
        }));
        setMetrics(mapped);
      } catch (err) {
        console.error("Failed to load metrics", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">GAM Reporting</h1>

      {loading ? (
        <p>Loading...</p>
      ) : metrics.length === 0 ? (
        <p>No reporting data found.</p>
      ) : (
        <>
          <div className="h-80 w-full bg-white p-4 shadow rounded-lg border border-gray-200">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodStart" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="totalImpressions" fill="#8884d8" name="Impressions" />
                <Bar yAxisId="right" dataKey="totalRevenueMicros" fill="#82ca9d" name="Revenue (Micros)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue (Micros)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrics.map((row, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-sm text-gray-900">{row.formatName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(row.periodStart).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {row.totalImpressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {row.totalRevenueMicros.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}