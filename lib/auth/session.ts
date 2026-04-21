import { auth } from "@/lib/auth/config"
export async function getSession() {
  return await auth()
}
