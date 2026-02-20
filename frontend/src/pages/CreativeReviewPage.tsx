import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface Review {
  review_id: string;
  ai_decision: string;
  confidence_score: number;
  policy_triggered: string | null;
  reason: string;
  human_override: boolean;
  final_decision: string;
  reviewed_at: string;
}

interface CreativeDetail {
  creative_id: string;
  name: string;
  format: string;
  status: string;
  agent_url: string;
  principal_id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  reviews: Review[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  approved: "bg-green-50 text-green-700 ring-green-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function CreativeReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [creative, setCreative] = useState<CreativeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<CreativeDetail>(`/creatives/${id}`)
      .then((res) => setCreative(res))
      .catch(() => setCreative(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  function handleAction(action: "approve" | "reject") {
    if (!id) return;
    setActionLoading(true);
    apiFetch(`/creatives/${id}/${action}`, { method: "POST" })
      .then(() => load())
      .finally(() => setActionLoading(false));
  }

  function handleAnalyze() {
    if (!id) return;
    setAnalyzing(true);
    apiFetch(`/creatives/${id}/analyze`, { method: "POST" })
      .then(() => load())
      .finally(() => setAnalyzing(false));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading creative details...</div>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="flex h-64 items-center justify-center flex-col">
        <div className="text-gray-500 mb-4">Creative not found.</div>
        <Link to="/creatives" className="text-indigo-600 hover:underline">Back to Creatives</Link>
      </div>
    );
  }

  const latestReview = creative.reviews && creative.reviews.length > 0 ? creative.reviews[0] : null;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/creatives" className="text-sm text-gray-500 hover:text-gray-900">
            &larr; Back
          </Link>
          <h2 className="text-xl font-semibold text-gray-900">Creative Review</h2>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`rounded px-4 py-2 text-sm font-medium text-white shadow-sm ${
              analyzing ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </button>
          
          <button
            onClick={() => handleAction("approve")}
            disabled={actionLoading || creative.status === "approved"}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={actionLoading || creative.status === "rejected"}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Creative Details & Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{creative.name}</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">{creative.creative_id}</p>
              </div>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[creative.status] ?? "bg-gray-50 text-gray-600 ring-gray-500/10"}`}>
                {creative.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <span className="block text-gray-500">Format</span>
                <span className="font-medium text-gray-900">{creative.format}</span>
              </div>
              <div>
                <span className="block text-gray-500">Principal</span>
                <span className="font-medium text-gray-900">{creative.principal_id || "None"}</span>
              </div>
              <div>
                <span className="block text-gray-500">Created At</span>
                <span className="font-medium text-gray-900">{new Date(creative.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-gray-500">Agent URL</span>
                <span className="font-medium text-indigo-600 truncate block">
                  {creative.agent_url ? (
                    <a href={creative.agent_url} target="_blank" rel="noreferrer">{creative.agent_url}</a>
                  ) : "N/A"}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Creative Preview</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[300px] flex items-center justify-center overflow-auto">
                {/* Simulated preview area based on format */}
                {creative.format === "image" && creative.data?.url ? (
                  <img src={creative.data.url} alt="Creative" className="max-w-full max-h-96 object-contain shadow-sm" />
                ) : creative.format === "video" && creative.data?.url ? (
                  <video src={creative.data.url} controls className="max-w-full max-h-96 shadow-sm" />
                ) : creative.format === "html" && creative.data?.html ? (
                  <iframe srcDoc={creative.data.html} className="w-full h-96 border-0 bg-white shadow-sm" title="HTML Creative" />
                ) : (
                  <div className="text-sm text-gray-400 text-center">
                    <p className="mb-2">Preview not available for this format or data.</p>
                    <pre className="text-left text-xs bg-white p-4 rounded border text-gray-800 overflow-x-auto max-w-full">
                      {JSON.stringify(creative.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-indigo-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Analysis
            </h3>
            
            {latestReview ? (
              <div className="space-y-5">
                <div>
                  <span className="block text-sm text-gray-500 mb-1">Confidence Score</span>
                  <div className="flex items-center">
                    {latestReview.confidence_score >= 0.8 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        High ({(latestReview.confidence_score * 100).toFixed(0)}%)
                      </span>
                    ) : latestReview.confidence_score >= 0.5 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Medium ({(latestReview.confidence_score * 100).toFixed(0)}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Low ({(latestReview.confidence_score * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-sm text-gray-500 mb-1">AI Decision</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    latestReview.ai_decision === 'approve' ? 'bg-green-100 text-green-800' :
                    latestReview.ai_decision === 'reject' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {latestReview.ai_decision}
                  </span>
                </div>

                {latestReview.policy_triggered && (
                  <div>
                    <span className="block text-sm text-gray-500 mb-1">Policy Triggers</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      {latestReview.policy_triggered}
                    </span>
                  </div>
                )}

                <div>
                  <span className="block text-sm text-gray-500 mb-1">Raw Reasoning</span>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 max-h-48 overflow-y-auto italic">
                    "{latestReview.reason}"
                  </div>
                </div>

                {latestReview.human_override && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Human Override</h4>
                        <p className="text-xs text-yellow-700 mt-1">
                          AI suggested <strong className="uppercase">{latestReview.ai_decision}</strong>, 
                          but Human <strong className="uppercase">{latestReview.final_decision}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
                  Reviewed at: {new Date(latestReview.reviewed_at).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 mb-3">
                  <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900">No AI Analysis</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This creative hasn't been analyzed by AI yet.
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    {analyzing ? "Running Analysis..." : "Run Analysis"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
