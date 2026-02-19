import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface CreativeAgent {
  id: number;
  name: string;
  agent_url: string;
  enabled: boolean;
  priority: number;
  timeout: number;
}

export default function CreativeAgentsPage() {
  const [agents, setAgents] = useState<CreativeAgent[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<{ creative_agents: CreativeAgent[] }>("/creative-agents")
      .then((res) => setAgents(res.creative_agents ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function toggleEnabled(agent: CreativeAgent) {
    apiFetch(`/creative-agents/${agent.id}`, {
      method: "PUT",
      body: JSON.stringify({ enabled: !agent.enabled }),
    })
      .then(() => load())
      .catch(() => {});
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Creative Agents</h2>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
          Add Agent
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">URL</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Enabled</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Timeout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows cols={5} />
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No creative agents found
                </td>
              </tr>
            ) : (
              agents.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono truncate max-w-xs">{a.agent_url}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => toggleEnabled(a)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${a.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${a.enabled ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm tabular-nums text-gray-700">{a.priority}</td>
                  <td className="px-6 py-4 text-sm tabular-nums text-gray-700">{a.timeout}s</td>
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
