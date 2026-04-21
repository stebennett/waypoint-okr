import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EditUserForm from "./EditUserForm"

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!user) notFound()
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Edit user</h1>
      <p className="text-sm text-gray-500 mb-4">{user.email}</p>
      <EditUserForm user={user} />
    </div>
  )
}
