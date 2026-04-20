'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { hasRole, type Role } from '@/lib/auth/rbac'

type NavItem = { href: string; label: string; minRole: Role }

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', minRole: 'viewer' },
  { href: '/teams', label: 'Teams', minRole: 'admin' },
  { href: '/quarters', label: 'Quarters', minRole: 'admin' },
  { href: '/tags', label: 'Tags', minRole: 'admin' },
  { href: '/check-in', label: '✓ Check-in', minRole: 'okr_manager' },
]

export function Nav({ role }: { role?: Role }) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => hasRole(role, item.minRole))

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-gray-900 text-lg">Waypoint</span>
          </Link>
          <div className="flex items-center gap-1">
            {visibleItems.map((item) => {
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
          </div>
        </div>
      </div>
    </nav>
  )
}
