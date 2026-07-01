import { NavLink, Outlet } from 'react-router-dom'
import { Car, Users, CreditCard, Wrench, BarChart2, MessageSquare, LogOut } from 'lucide-react'
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
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white tracking-tight">Titan Autorent</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
