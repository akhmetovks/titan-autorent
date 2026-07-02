import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Car, Payment, Expense, Assignment } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function firstDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function lastDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export default function Analytics() {
  const [cars, setCars] = useState<Car[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const [start, setStart] = useState(fmtDate(new Date(today.getFullYear(), 0, 1)))
  const [end, setEnd] = useState(fmtDate(new Date(today.getFullYear(), 11, 31)))

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
    ]).then(([carsRes, assignRes, payRes, expRes]) => {
      setCars(carsRes.data || [])
      setAssignments(assignRes.data || [])
      setPayments(payRes.data || [])
      setExpenses(expRes.data || [])
      setLoading(false)
    })
  }, [])

  function selectThisMonth() {
    setStart(fmtDate(firstDayOfMonth(today)))
    setEnd(fmtDate(lastDayOfMonth(today)))
  }
  function selectThisYear() {
    setStart(fmtDate(new Date(today.getFullYear(), 0, 1)))
    setEnd(fmtDate(new Date(today.getFullYear(), 11, 31)))
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

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' тг'

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Аналитика</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={selectThisMonth} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">Этот месяц</button>
          <button onClick={selectThisYear} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">Этот год</button>
          <button onClick={selectLastYear} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">Прошлый год</button>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          <span className="text-gray-500 text-sm">—</span>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      {/* Period totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Доход за период</p>
          <p className="text-2xl font-bold text-green-400">{fmt(periodTotals.income)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Расходы за период</p>
          <p className="text-2xl font-bold text-red-400">{fmt(periodTotals.expense)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Прибыль за период</p>
          <p className={`text-2xl font-bold ${periodTotals.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(periodTotals.profit)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
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
          <div key={car.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
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
                <span className={`font-semibold ${profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(profit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
