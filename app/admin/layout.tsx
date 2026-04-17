import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth/session"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if ((session?.user as { role?: string })?.role !== "admin") redirect("/")

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <nav className="mb-6 flex gap-4 text-sm">
        <Link href="/admin" className="text-indigo-600 hover:underline">Overview</Link>
        <Link href="/admin/users" className="text-indigo-600 hover:underline">Users</Link>
      </nav>
      {children}
    </div>
  )
}
