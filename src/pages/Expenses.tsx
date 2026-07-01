import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Car, Expense, ExpenseCategory } from '../types'
import { Plus, Trash2, Tag } from 'lucide-react'

const DEFAULT_CATEGORIES = ['Топливо', 'Ремонт', 'ТО', 'Мойка', 'Штраф', 'Страховка', 'Другое']

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Expenses() {
  const [cars, setCars] = useState<Car[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [form, setForm] = useState({ car_id: '', date: today(), category: '', amount: '', note: '' })
  const [month, setMonth] = useState(today().slice(0, 7))

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*').order('created_at'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('created_at'),
    ]).then(async ([carsRes, expRes, catRes]) => {
      setCars(carsRes.data || [])
      setExpenses(expRes.data || [])
      let cats = catRes.data || []
      if (cats.length === 0) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase.from('expense_categories').insert(
          DEFAULT_CATEGORIES.map(name => ({ user_id: user!.id, name }))
        ).select()
        cats = data || []
      }
      setCategories(cats)
      setForm(f => ({ ...f, category: cats[0]?.name || '' }))
      setLoading(false)
    })
  }, [])

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('expense_categories').insert({
      user_id: user!.id,
      name,
    }).select().single()
    if (!error && data) {
      setCategories(prev => [...prev, data])
      setForm(f => (f.category ? f : { ...f, category: data.name }))
      setNewCategory('')
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Удалить категорию?')) return
    await supabase.from('expense_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const monthStart = month + '-01'
  const monthEnd = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0)
    .toISOString().slice(0, 10)

  const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd)
  const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('expenses').insert({
      user_id: user!.id,
      car_id: form.car_id,
      date: form.date,
      category: form.category,
      amount: parseFloat(form.amount),
      note: form.note.trim() || null,
    }).select().single()
    if (!error && data) {
      setExpenses(prev => [data, ...prev])
      setForm(f => ({ ...f, amount: '', note: '' }))
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' тг'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Расходы</h2>
        <div className="flex gap-3">
          <input
            type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setShowCategories(v => !v)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Tag size={16} /> Категории
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Расход
          </button>
        </div>
      </div>

      {showCategories && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold text-white mb-4">Категории расходов</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(c => (
              <span key={c.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-2 py-1.5 text-sm text-gray-200">
                {c.name}
                <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
            {categories.length === 0 && <p className="text-gray-500 text-sm">Нет категорий.</p>}
          </div>
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <input
              value={newCategory} onChange={e => setNewCategory(e.target.value)}
              placeholder="Новая категория"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Добавить</button>
          </form>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Машина</label>
            <select required value={form.car_id} onChange={e => setForm(f => ({ ...f, car_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Выберите...</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name} ({c.plate})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Категория</label>
            <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="">Выберите...</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Дата</label>
            <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Сумма (тг)</label>
            <input type="number" required min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="5000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Заметка (опционально)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Замена колодок"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Сохранить</button>
          </div>
        </form>
      )}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-400 text-sm">{monthExpenses.length} записей</p>
        <p className="text-white font-semibold">Итого: {fmt(total)}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {monthExpenses.length === 0 ? (
          <p className="text-gray-500 p-6">Нет расходов за этот месяц.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-5 py-3">Дата</th>
                <th className="text-left px-5 py-3">Машина</th>
                <th className="text-left px-5 py-3">Категория</th>
                <th className="text-left px-5 py-3">Заметка</th>
                <th className="text-right px-5 py-3">Сумма</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {monthExpenses.map(exp => {
                const car = cars.find(c => c.id === exp.car_id)
                return (
                  <tr key={exp.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                    <td className="px-5 py-3 text-gray-300">{new Date(exp.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-5 py-3 text-white">{car?.name}</td>
                    <td className="px-5 py-3 text-gray-300">{exp.category}</td>
                    <td className="px-5 py-3 text-gray-400">{exp.note || '—'}</td>
                    <td className="px-5 py-3 text-right text-red-400 font-medium">{fmt(Number(exp.amount))}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(exp.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
