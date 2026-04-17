import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from './components/Nav'
import { getSession } from "@/lib/auth/session"
import { signOut } from "@/lib/auth/config"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Waypoint',
  description: 'Manage your Objectives and Key Results',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {session?.user && (
          <header className="flex items-center justify-between px-6 py-2 border-b bg-gray-50">
            <span className="text-sm text-gray-600">
              Signed in as <strong>{session.user.email}</strong> ({(session.user as { role?: string }).role})
            </span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <button className="text-sm text-indigo-600 hover:underline">Sign out</button>
            </form>
          </header>
        )}
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
