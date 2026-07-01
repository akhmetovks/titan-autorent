import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Car, Users, CreditCard, Wrench, BarChart2, MessageSquare, LogOut, Menu, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const nav = [
  { to: '/', label: 'Аналитика', icon: BarChart2 },
  { to: '/cars', label: 'Машины', icon: Car },
  { to: '/drivers', label: 'Водители', icon: Users },
  { to: '/assignments', label: 'Назначения', icon: Users },
  { to: '/payments', label: 'Доходы', icon: CreditCard },
  { to: '/expenses', label: 'Расходы', icon: CreditCard },
  { to: '/maintenance', label: 'ТО', icon: Wrench },
  { to: '/chat', label: 'AI-агент', icon: MessageSquare },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 z-30">
        <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white">
          <Menu size={22} />
        </button>
        <h1 className="ml-3 text-base font-bold text-white tracking-tight">Titan Autorent</h1>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight">Titan Autorent</h1>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
