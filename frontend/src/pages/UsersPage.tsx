import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ users: User[] }>("/users")
      .then((res) => setUsers(res.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  function toggleActive(userId: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u)),
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
          Invite User
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <SkeletonRows />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(u.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        u.is_active ? "bg-indigo-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                          u.is_active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
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

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          {[1, 2, 3, 4].map((c) => (
            <td key={c} className="px-6 py-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
