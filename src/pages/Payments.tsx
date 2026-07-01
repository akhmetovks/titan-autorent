import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Car, Driver, Assignment, Payment } from '../types'
import { Plus, Trash2 } from 'lucide-react'

function workingDaysInRange(from: Date, to: Date, restDay: number): number {
  let count = 0
  const cur = new Date(from)
  while (cur <= to) {
    if (cur.getDay() !== restDay) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Payments() {
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ assignment_id: '', date: today(), amount: '', note: '' })
  const [month, setMonth] = useState(today().slice(0, 7))

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('payments').select('*').order('date', { ascending: false }),
    ]).then(([carsRes, driversRes, assignRes, payRes]) => {
      setCars(carsRes.data || [])
      setDrivers(driversRes.data || [])
      setAssignments(assignRes.data || [])
      setPayments(payRes.data || [])
      setLoading(false)
    })
  }, [])

  const monthStart = month + '-01'
  const monthEnd = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0)
    .toISOString().slice(0, 10)

  // Assignments active in selected month
  const activeAssignments = useMemo(() => {
    return assignments.filter(a => {
      const start = a.started_at <= monthEnd
      const end = !a.ended_at || a.ended_at >= monthStart
      return start && end
    })
  }, [assignments, monthStart, monthEnd])

  const stats = useMemo(() => {
    return activeAssignments.map(a => {
      const car = cars.find(c => c.id === a.car_id)
      const driver = drivers.find(d => d.id === a.driver_id)
      if (!car || !driver) return null

      const periodStart = new Date(Math.max(new Date(a.started_at).getTime(), new Date(monthStart).getTime()))
      const periodEnd = new Date(Math.min(
        a.ended_at ? new Date(a.ended_at).getTime() : new Date().getTime(),
        new Date(monthEnd).getTime()
      ))

      const workDays = workingDaysInRange(periodStart, periodEnd, car.rest_day)
      const expected = workDays * car.daily_rate
      const paid = payments
        .filter(p => p.assignment_id === a.id && p.date >= monthStart && p.date <= monthEnd)
        .reduce((s, p) => s + Number(p.amount), 0)
      const debt = expected - paid

      return { assignment: a, car, driver, workDays, expected, paid, debt }
    }).filter(Boolean)
  }, [activeAssignments, cars, drivers, payments, monthStart, monthEnd])

  const monthPayments = payments.filter(p => p.date >= monthStart && p.date <= monthEnd)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('payments').insert({
      user_id: user!.id,
      assignment_id: form.assignment_id,
      date: form.date,
      amount: parseFloat(form.amount),
      note: form.note.trim() || null,
    }).select().single()
    if (!error && data) {
      setPayments(prev => [data, ...prev])
      setForm(f => ({ ...f, amount: '', note: '' }))
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('payments').delete().eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' тг'

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Доходы / Платежи</h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Платёж
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Водитель / Машина</label>
            <select
              required value={form.assignment_id} onChange={e => setForm(f => ({ ...f, assignment_id: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Выберите...</option>
              {assignments.filter(a => !a.ended_at).map(a => {
                const car = cars.find(c => c.id === a.car_id)
                const driver = drivers.find(d => d.id === a.driver_id)
                return (
                  <option key={a.id} value={a.id}>
                    {driver?.name} — {car?.name} ({car?.plate})
                  </option>
                )
              })}
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
              placeholder="15000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Заметка (опционально)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="За 2 дня"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="sm:col-span-2 flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Сохранить</button>
          </div>
        </form>
      )}

      {/* Debt stats per driver */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Состояние за месяц</h3>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {stats.map(s => s && (
            <div key={s.assignment.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="font-semibold text-white">{s.driver.name}</p>
              <p className="text-sm text-gray-400 mb-4">{s.car.name} · {s.car.plate}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Рабочих дней</span>
                  <span className="text-white">{s.workDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ожидаемо</span>
                  <span className="text-white">{fmt(s.expected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Оплачено</span>
                  <span className="text-green-400">{fmt(s.paid)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2">
                  <span className="text-gray-400">Долг</span>
                  <span className={s.debt > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                    {s.debt > 0 ? fmt(s.debt) : s.debt < 0 ? `+${fmt(-s.debt)}` : '0 тг'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {stats.length === 0 && <p className="text-gray-500 col-span-3">Нет активных назначений в этом месяце.</p>}
        </div>
      </div>

      {/* Payment history */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">История платежей</h3>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {monthPayments.length === 0 ? (
            <p className="text-gray-500 p-6">Нет платежей за этот месяц.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left px-5 py-3">Дата</th>
                  <th className="text-left px-5 py-3">Водитель</th>
                  <th className="text-left px-5 py-3">Машина</th>
                  <th className="text-left px-5 py-3">Заметка</th>
                  <th className="text-right px-5 py-3">Сумма</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {monthPayments.map(p => {
                  const a = assignments.find(a => a.id === p.assignment_id)
                  const car = cars.find(c => c.id === a?.car_id)
                  const driver = drivers.find(d => d.id === a?.driver_id)
                  return (
                    <tr key={p.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                      <td className="px-5 py-3 text-gray-300">{new Date(p.date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-5 py-3 text-white">{driver?.name}</td>
                      <td className="px-5 py-3 text-gray-300">{car?.name}</td>
                      <td className="px-5 py-3 text-gray-400">{p.note || '—'}</td>
                      <td className="px-5 py-3 text-right text-green-400 font-medium">{fmt(Number(p.amount))}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleDelete(p.id)} className="text-gray-600 hover:text-red-400 transition-colors">
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
    </div>
  )
}
