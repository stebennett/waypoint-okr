"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"

type Row = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  lastSessionExpires: string | null
}

export default function UsersTable({ rows }: { rows: Row[] }) {
  const router = useRouter()

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Delete user ${email}? History will be preserved.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (res.ok) router.refresh()
    else alert((await res.json()).error ?? "Delete failed")
  }

  return (
    <table className="w-full text-sm border">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-left p-2">Email</th>
          <th className="text-left p-2">Name</th>
          <th className="text-left p-2">Role</th>
          <th className="text-left p-2">Created</th>
          <th className="text-left p-2">Last seen</th>
          <th className="p-2"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t">
            <td className="p-2">{r.email}</td>
            <td className="p-2">{r.name ?? "—"}</td>
            <td className="p-2">{r.role}</td>
            <td className="p-2">{new Date(r.createdAt).toLocaleDateString()}</td>
            <td className="p-2">
              {r.lastSessionExpires ? new Date(r.lastSessionExpires).toLocaleDateString() : "—"}
            </td>
            <td className="p-2 text-right space-x-2">
              <Link href={`/admin/users/${r.id}/edit`} className="text-indigo-600">Edit</Link>
              <Link href={`/admin/users/${r.id}/reset-password`} className="text-indigo-600">Reset</Link>
              <button onClick={() => handleDelete(r.id, r.email)} className="text-red-600">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
