import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import PageLoader from '../components/PageLoader'
import type { Car, Driver, Payment, Expense, Assignment } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Plus } from 'lucide-react'

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function fmtDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function firstDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function Analytics() {
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [start, setStart] = useState(fmtDate(new Date(today.getFullYear(), 0, 1)))
  const [end, setEnd] = useState(fmtDate(today))

  const [quickForm, setQuickForm] = useState({ assignment_id: '', date: fmtDate(today), amount: '' })
  const [quickSaving, setQuickSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*'),
      supabase.from('drivers').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
    ]).then(([carsRes, driversRes, assignRes, payRes, expRes]) => {
      setCars(carsRes.data || [])
      setDrivers(driversRes.data || [])
      setAssignments(assignRes.data || [])
      setPayments(payRes.data || [])
      setExpenses(expRes.data || [])
      setLoading(false)
    })
  }, [])

  const activeAssignments = useMemo(() => assignments.filter(a => !a.ended_at), [assignments])

  async function handleQuickPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!quickForm.assignment_id || !quickForm.amount) return
    setQuickSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('payments').insert({
      user_id: user!.id,
      assignment_id: quickForm.assignment_id,
      date: quickForm.date,
      amount: parseFloat(quickForm.amount),
      note: null,
    }).select().single()
    if (!error && data) {
      setPayments(prev => [data, ...prev])
      setQuickForm(f => ({ ...f, amount: '' }))
    }
    setQuickSaving(false)
  }

  function selectThisMonth() {
    setStart(fmtDate(firstDayOfMonth(today)))
    setEnd(fmtDate(today))
  }
  function selectThisYear() {
    setStart(fmtDate(new Date(today.getFullYear(), 0, 1)))
    setEnd(fmtDate(today))
  }
  function selectLastYear() {
    setStart(fmtDate(new Date(today.getFullYear() - 1, 0, 1)))
    setEnd(fmtDate(new Date(today.getFullYear() - 1, 11, 31)))
  }

  const monthBuckets = useMemo(() => {
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return []
    const buckets: { key: string; label: string }[] = []
    const cur = firstDayOfMonth(s)
    const last = firstDayOfMonth(e)
    while (cur <= last) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      const label = cur.getFullYear() === today.getFullYear()
        ? MONTHS[cur.getMonth()]
        : `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`
      buckets.push({ key, label })
      cur.setMonth(cur.getMonth() + 1)
    }
    return buckets
  }, [start, end])

  const chartData = useMemo(() => {
    return monthBuckets.map(({ key, label }) => {
      const income = payments
        .filter(p => p.date.startsWith(key))
        .reduce((s, p) => s + Number(p.amount), 0)
      const expense = expenses
        .filter(e => e.date.startsWith(key))
        .reduce((s, e) => s + Number(e.amount), 0)
      return { label, income, expense, profit: income - expense }
    })
  }, [monthBuckets, payments, expenses])

  const periodTotals = useMemo(() => {
    const income = payments
      .filter(p => p.date >= start && p.date <= end)
      .reduce((s, p) => s + Number(p.amount), 0)
    const expense = expenses
      .filter(e => e.date >= start && e.date <= end)
      .reduce((s, e) => s + Number(e.amount), 0)
    return { income, expense, profit: income - expense }
  }, [payments, expenses, start, end])

  const carStats = useMemo(() => {
    return cars.map(car => {
      const carAssignments = assignments.filter(a => a.car_id === car.id)
      const assignIds = new Set(carAssignments.map(a => a.id))
      const income = payments
        .filter(p => assignIds.has(p.assignment_id) && p.date >= start && p.date <= end)
        .reduce((s, p) => s + Number(p.amount), 0)
      const expense = expenses
        .filter(e => e.car_id === car.id && e.date >= start && e.date <= end)
        .reduce((s, e) => s + Number(e.amount), 0)
      return { car, income, expense, profit: income - expense }
    })
  }, [cars, assignments, payments, expenses, start, end])

  if (loading) return <PageLoader />

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' тг'

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Аналитика</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={selectThisMonth} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">Этот месяц</button>
          <button onClick={selectThisYear} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">Этот год</button>
          <button onClick={selectLastYear} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">Прошлый год</button>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
          <span className="text-gray-500 text-sm">—</span>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
        </div>
      </div>

      {/* Quick payment widget */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg shadow-black/20 p-5 mb-8">
        <h3 className="text-base font-semibold text-white mb-4">Быстрый платёж</h3>
        {activeAssignments.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет активных назначений — сначала назначьте водителя на машину.</p>
        ) : (
          <form onSubmit={handleQuickPayment} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-gray-400 mb-1 block">Водитель / Машина</label>
              <select required value={quickForm.assignment_id} onChange={e => setQuickForm(f => ({ ...f, assignment_id: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                <option value="">Выберите...</option>
                {activeAssignments.map(a => {
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
            <div className="w-40">
              <label className="text-xs text-gray-400 mb-1 block">Дата</label>
              <input type="date" required value={quickForm.date} onChange={e => setQuickForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div className="w-40">
              <label className="text-xs text-gray-400 mb-1 block">Сумма (тг)</label>
              <input type="number" required min="1" placeholder="15000" value={quickForm.amount}
                onChange={e => setQuickForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <button type="submit" disabled={quickSaving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Добавить
            </button>
          </form>
        )}
      </div>

      {/* Period totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg shadow-black/20 p-5">
          <p className="text-gray-400 text-sm mb-1">Доход за период</p>
          <p className="text-2xl font-bold text-green-400">{fmt(periodTotals.income)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg shadow-black/20 p-5">
          <p className="text-gray-400 text-sm mb-1">Расходы за период</p>
          <p className="text-2xl font-bold text-red-400">{fmt(periodTotals.expense)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg shadow-black/20 p-5">
          <p className="text-gray-400 text-sm mb-1">Прибыль за период</p>
          <p className={`text-2xl font-bold ${periodTotals.profit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(periodTotals.profit)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg shadow-black/20 p-6 mb-8">
        <h3 className="text-base font-semibold text-white mb-6">Доходы и расходы по месяцам</h3>
        {chartData.length === 0 ? (
          <p className="text-gray-500 text-sm">Некорректный период.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v)} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, color: '#f9fafb' }}
                formatter={(v) => typeof v === 'number' ? v.toLocaleString('ru-RU') + ' тг' : v}
              />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Bar dataKey="income" name="Доход" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Расход" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-car stats */}
      <h3 className="text-lg font-semibold text-white mb-4">По машинам</h3>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {carStats.map(({ car, income, expense, profit }) => (
          <div key={car.id} className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg shadow-black/20 p-5 hover:border-amber-500/30 transition-colors">
            <p className="font-semibold text-white mb-1">{car.name}</p>
            <p className="text-sm text-gray-400 mb-4">{car.plate}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Доход</span>
                <span className="text-green-400">{fmt(income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Расходы</span>
                <span className="text-red-400">{fmt(expense)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2">
                <span className="text-gray-400">Прибыль</span>
                <span className={`font-semibold ${profit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(profit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
