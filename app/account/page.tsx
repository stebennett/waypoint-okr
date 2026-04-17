import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import PasswordForm from "./PasswordForm"

export default async function AccountPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      <p className="text-sm text-gray-500 mb-4">{session.user.email}</p>
      <PasswordForm />
    </div>
  )
}
