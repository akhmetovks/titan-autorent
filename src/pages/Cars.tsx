import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Car } from '../types'
import { Plus, Trash2 } from 'lucide-react'

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export default function Cars() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', plate: '', daily_rate: '', rest_day: '0' })

  useEffect(() => {
    supabase.from('cars').select('*').order('created_at').then(({ data }) => {
      setCars(data || [])
      setLoading(false)
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('cars').insert({
      user_id: user!.id,
      name: form.name.trim(),
      plate: form.plate.trim().toUpperCase(),
      daily_rate: parseFloat(form.daily_rate),
      rest_day: parseInt(form.rest_day),
    }).select().single()
    if (!error && data) {
      setCars(prev => [...prev, data])
      setForm({ name: '', plate: '', daily_rate: '', rest_day: '0' })
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить машину? Все связанные данные будут удалены.')) return
    await supabase.from('cars').delete().eq('id', id)
    setCars(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Машины</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 grid grid-cols-2 gap-4">
          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Название</label>
              <input
                required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Toyota Camry"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Гос. номер</label>
              <input
                required value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value }))}
                placeholder="123 ABC 01"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Ставка аренды (тг/день)</label>
              <input
                required type="number" min="0" value={form.daily_rate}
                onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
                placeholder="15000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Выходной день</label>
              <select
                value={form.rest_day} onChange={e => setForm(f => ({ ...f, rest_day: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Сохранить</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {cars.map(car => (
          <div key={car.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-white">{car.name}</p>
                <p className="text-sm text-gray-400">{car.plate}</p>
              </div>
              <button onClick={() => handleDelete(car.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Ставка/день</p>
                <p className="text-white font-medium">{car.daily_rate.toLocaleString('ru-RU')} тг</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Выходной</p>
                <p className="text-white font-medium">{DAYS[car.rest_day]}</p>
              </div>
            </div>
          </div>
        ))}
        {cars.length === 0 && (
          <p className="text-gray-500 col-span-3">Нет машин. Добавьте первую.</p>
        )}
      </div>
    </div>
  )
}
