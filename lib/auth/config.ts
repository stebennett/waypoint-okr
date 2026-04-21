import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Slack from "next-auth/providers/slack"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw)
      if (!parsed.success) return null
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
      if (!ok) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: user.role as "viewer" | "okr_manager" | "admin",
      }
    },
  }),
]

if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
  providers.push(
    Slack({
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  logger: {
    // Auth.js logs every failed credentials login as an error; that's a
    // user action (wrong password), not a fault worth paging on.
    error(error) {
      if (error.name === "CredentialsSignin") return
      console.error(error)
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Slack provider: only allow if a matching User record already exists (invite-only).
      if (account?.provider === "slack") {
        if (!user.email) return false
        const existing = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        })
        return !!existing
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub
        token.role = (user as { role?: string }).role ?? "viewer"
      } else if (token.sub && !token.role) {
        // Slack/OAuth sign-ins don't pass role through `user`; hydrate from DB.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? session.user.id
        ;(session.user as { role?: string }).role =
          (token.role as string | undefined) ?? "viewer"
      }
      return session
    },
  },
})
