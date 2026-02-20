import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface TreeNode {
  id: string;
  name: string;
  children: TreeItem[];
}

interface TreeItem {
  id: string;
  inventory_id: string;
  name: string;
  path: any;
  status: string;
  inventory_metadata: any;
}

export default function InventoryBrowserPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTree();
  }, []);

  async function loadTree() {
    try {
      setLoading(true);
      const data = await apiFetch<{ tree: TreeNode[] }>("/inventory/tree");
      setTree(data.tree);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading inventory tree...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Browser</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {tree.length === 0 ? (
          <p className="text-sm text-gray-500">No inventory found.</p>
        ) : (
          <ul className="space-y-4">
            {tree.map((node) => (
              <li key={node.id}>
                <details className="group">
                  <summary className="cursor-pointer font-medium text-gray-900 select-none">
                    {node.name} ({node.children.length})
                  </summary>
                  <ul className="pl-6 mt-2 space-y-2 border-l-2 border-gray-100">
                    {node.children.map((child) => (
                      <li key={child.id} className="text-sm text-gray-600">
                        <span className="font-semibold">{child.name}</span>{" "}
                        <span className="text-gray-400">({child.inventory_id})</span> - {child.status}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
