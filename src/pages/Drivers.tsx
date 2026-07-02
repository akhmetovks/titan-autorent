import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Driver } from '../types'
import { Plus, Trash2, Pencil } from 'lucide-react'

const EMPTY_FORM = { name: '', phone: '' }

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    supabase.from('drivers').select('*').order('created_at').then(({ data }) => {
      setDrivers(data || [])
      setLoading(false)
    })
  }, [])

  function toggleAddForm() {
    if (showForm && editingId === null) {
      setShowForm(false)
    } else {
      setEditingId(null)
      setForm(EMPTY_FORM)
      setShowForm(true)
    }
  }

  function startEdit(driver: Driver) {
    setForm({ name: driver.name, phone: driver.phone || '' })
    setEditingId(driver.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
    }
    if (editingId) {
      const { data, error } = await supabase.from('drivers').update(payload).eq('id', editingId).select().single()
      if (!error && data) {
        setDrivers(prev => prev.map(d => d.id === editingId ? data : d))
        setForm(EMPTY_FORM)
        closeForm()
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('drivers').insert({ user_id: user!.id, ...payload }).select().single()
      if (!error && data) {
        setDrivers(prev => [...prev, data])
        setForm(EMPTY_FORM)
        closeForm()
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить водителя?')) return
    await supabase.from('drivers').delete().eq('id', id)
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Водители</h2>
        <button
          onClick={toggleAddForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Имя</label>
            <input
              required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Иван Петров"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Телефон (опционально)</label>
            <input
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+7 700 000 00 00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={closeForm} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">{editingId ? 'Обновить' : 'Сохранить'}</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{driver.name}</p>
              <p className="text-sm text-gray-400">{driver.phone || 'Телефон не указан'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEdit(driver)} className="text-gray-600 hover:text-blue-400 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => handleDelete(driver.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {drivers.length === 0 && (
          <p className="text-gray-500 col-span-3">Нет водителей. Добавьте первого.</p>
        )}
      </div>
    </div>
  )
}
