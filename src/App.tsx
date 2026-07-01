import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Layout from './components/Layout'
import Analytics from './pages/Analytics'
import Cars from './pages/Cars'
import Drivers from './pages/Drivers'
import Assignments from './pages/Assignments'
import Payments from './pages/Payments'
import Expenses from './pages/Expenses'
import Maintenance from './pages/Maintenance'
import Chat from './pages/Chat'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Analytics />} />
          <Route path="cars" element={<Cars />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="payments" element={<Payments />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
