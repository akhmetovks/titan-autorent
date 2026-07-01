import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Car, Driver, Assignment } from '../types'
import { Plus, Trash2 } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Assignments() {
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ car_id: '', driver_id: '', started_at: today() })

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*').order('created_at'),
      supabase.from('drivers').select('*').order('created_at'),
      supabase.from('assignments').select('*').order('started_at', { ascending: false }),
    ]).then(([carsRes, driversRes, assignRes]) => {
      setCars(carsRes.data || [])
      setDrivers(driversRes.data || [])
      setAssignments(assignRes.data || [])
      setLoading(false)
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('assignments').insert({
      user_id: user!.id,
      car_id: form.car_id,
      driver_id: form.driver_id,
      started_at: form.started_at,
      ended_at: null,
    }).select().single()
    if (!error && data) {
      setAssignments(prev => [data, ...prev])
      setForm({ car_id: '', driver_id: '', started_at: today() })
      setShowForm(false)
    }
  }

  async function handleEnd(id: string) {
    const { error } = await supabase.from('assignments').update({ ended_at: today() }).eq('id', id)
    if (!error) setAssignments(prev => prev.map(a => a.id === id ? { ...a, ended_at: today() } : a))
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить назначение? Связанные платежи будут удалены.')) return
    await supabase.from('assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  const active = assignments.filter(a => !a.ended_at)
  const ended = assignments.filter(a => a.ended_at)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Назначения</h2>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Назначить
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Машина</label>
            <select required value={form.car_id} onChange={e => setForm(f => ({ ...f, car_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Выберите...</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name} ({c.plate})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Водитель</label>
            <select required value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Выберите...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Дата начала</label>
            <input type="date" required value={form.started_at} onChange={e => setForm(f => ({ ...f, started_at: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-3 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Сохранить</button>
          </div>
        </form>
      )}

      <h3 className="text-base font-semibold text-white mb-3">Активные</h3>
      <div className="space-y-3 mb-8">
        {active.length === 0 && <p className="text-gray-500">Нет активных назначений.</p>}
        {active.map(a => {
          const car = cars.find(c => c.id === a.car_id)
          const driver = drivers.find(d => d.id === a.driver_id)
          return (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{driver?.name} — {car?.name} <span className="text-gray-400 text-sm">({car?.plate})</span></p>
                <p className="text-sm text-gray-400">С {new Date(a.started_at).toLocaleDateString('ru-RU')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEnd(a.id)} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg transition-colors">Завершить</button>
                <button onClick={() => handleDelete(a.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="text-base font-semibold text-white mb-3">Завершённые</h3>
      <div className="space-y-3">
        {ended.length === 0 && <p className="text-gray-500">Нет завершённых назначений.</p>}
        {ended.map(a => {
          const car = cars.find(c => c.id === a.car_id)
          const driver = drivers.find(d => d.id === a.driver_id)
          return (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between opacity-60">
              <div>
                <p className="font-medium text-white">{driver?.name} — {car?.name}</p>
                <p className="text-sm text-gray-400">
                  {new Date(a.started_at).toLocaleDateString('ru-RU')} — {new Date(a.ended_at!).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
