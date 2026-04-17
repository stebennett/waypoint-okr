import { NextResponse } from "next/server"
import { HttpError } from "@/lib/auth/rbac"

export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error(err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
