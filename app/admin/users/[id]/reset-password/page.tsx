import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ResetForm from "./ResetForm"

export default async function ResetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!user) notFound()
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Reset password</h1>
      <p className="text-sm text-gray-500 mb-4">{user.email}</p>
      <ResetForm userId={user.id} />
    </div>
  )
}
