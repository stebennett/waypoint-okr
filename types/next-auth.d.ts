import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "viewer" | "okr_manager" | "admin"
    } & DefaultSession["user"]
  }

  interface User {
    role?: "viewer" | "okr_manager" | "admin"
  }
}
