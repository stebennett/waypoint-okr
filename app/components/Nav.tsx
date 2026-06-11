'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '@/app/actions/auth'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/teams', label: 'Teams' },
  { href: '/quarters', label: 'Quarters' },
  { href: '/tags', label: 'Tags' },
  { href: '/check-in', label: '✓ Check-in' },
]

export function Nav({ user }: { user?: { name?: string | null } | null }) {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-gray-900 text-lg">Waypoint</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {user && (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
                <span className="text-sm text-gray-600">{user.name}</span>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
